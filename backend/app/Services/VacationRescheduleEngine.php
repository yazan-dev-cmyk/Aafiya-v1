<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DoctorVacation;
use App\Models\NotificationOutbox;
use App\Models\User;
use App\Models\VacationAppointmentReschedule;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class VacationRescheduleEngine
{
    public function __construct(
        protected BookingService $bookingService,
        protected DoctorWorkingHoursService $doctorWorkingHoursService,
        protected ClinicOperatingHoursService $clinicOperatingHoursService,
        protected DoctorVacationService $doctorVacationService,
        protected DoctorTimeReservationService $timeReservationService,
        protected QuotaService $quotaService
    ) {}

    /**
     * Process automated vacation rescheduling under DEC-VAC-02, DEC-VAC-03, DEC-VAC-05, DEC-VAC-06, and DEC-GAP-03.
     *
     * @return array{total_affected: int, rescheduled: int, unresolved: int, skipped: int}
     */
    public function processVacationRescheduling(DoctorVacation $vacation): array
    {
        // 1. Reload vacation and verify current active status
        $vacation->refresh();
        if (! $vacation->isEffective()) {
            Log::info('VACATION_RESCHEDULE_ABORTED: Vacation is not in effective status', [
                'vacation_id' => $vacation->id,
                'status'      => $vacation->status,
            ]);

            return [
                'total_affected' => 0,
                'rescheduled'    => 0,
                'unresolved'     => 0,
                'skipped'        => 0,
            ];
        }

        // 2. Fetch snapshot clinic IDs
        $snapshottedClinicIds = $vacation->vacationClinics()->pluck('clinic_id')->toArray();
        if (empty($snapshottedClinicIds)) {
            Log::warning('VACATION_RESCHEDULE_EMPTY_CLINICS: No affiliated clinics in snapshot', [
                'vacation_id' => $vacation->id,
            ]);

            return [
                'total_affected' => 0,
                'rescheduled'    => 0,
                'unresolved'     => 0,
                'skipped'        => 0,
            ];
        }

        $startDate = Carbon::parse($vacation->vacation_start)->format('Y-m-d');
        $endDate   = Carbon::parse($vacation->vacation_end)->format('Y-m-d');

        // 3. Find occupying appointments in vacation interval for snapshotted clinics
        /** @var Collection<int, Appointment> $affectedAppointments */
        $affectedAppointments = Appointment::whereIn('clinic_id', $snapshottedClinicIds)
            ->where('doctor_id', $vacation->doctor_id)
            ->whereBetween('appointment_date', [$startDate, $endDate])
            ->whereIn('status', Appointment::OCCUPYING_STATUSES)
            ->orderBy('appointment_date')
            ->orderBy('time_slot')
            ->orderBy('id')
            ->get();

        $stats = [
            'total_affected' => $affectedAppointments->count(),
            'rescheduled'    => 0,
            'unresolved'     => 0,
            'skipped'        => 0,
        ];

        // Resolve system actor for service calls
        $systemActor = $vacation->doctor?->user ?? User::whereHas('roles', fn ($q) => $q->where('name', 'doctor'))->first() ?? User::first();

        // 4. Process each affected appointment with isolated transaction boundary & idempotency guard
        foreach ($affectedAppointments as $appointment) {
            $outcome = $this->processSingleAppointment($vacation, $appointment, $systemActor);
            if ($outcome === VacationAppointmentReschedule::STATUS_RESCHEDULED) {
                $stats['rescheduled']++;
            } elseif ($outcome === VacationAppointmentReschedule::STATUS_URGENT_UNRESOLVED) {
                $stats['unresolved']++;
            } else {
                $stats['skipped']++;
            }
        }

        return $stats;
    }

    /**
     * Process a single appointment relocation atomically with crash recovery, mismatch detection,
     * and transient error re-throw.
     */
    protected function processSingleAppointment(DoctorVacation $vacation, Appointment $appointment, User $actor): string
    {
        // 1. Initial application-level idempotency & mismatch check (DEC-VAC-07)
        $existingLedger = VacationAppointmentReschedule::where('doctor_vacation_id', $vacation->id)
            ->where('original_appointment_id', $appointment->id)
            ->first();

        if ($existingLedger) {
            if ($existingLedger->status === VacationAppointmentReschedule::STATUS_RESCHEDULED) {
                // Consistency verification: ensure appointment was indeed relocated to a valid replacement date
                $appointment->refresh();
                $isConsistent = $this->verifyRescheduledConsistency($vacation, $appointment, $existingLedger);

                if (! $isConsistent) {
                    // Mismatch detected: stop automated processing and transition to manual_pending
                    Log::warning('VACATION_RESCHEDULE_LEDGER_MISMATCH_DETECTED: Ledger recorded as rescheduled but appointment state is inconsistent. Moving to manual_pending.', [
                        'vacation_id'     => $vacation->id,
                        'appointment_id'  => $appointment->id,
                        'ledger_id'       => $existingLedger->id,
                        'appt_date'       => $appointment->appointment_date?->format('Y-m-d'),
                        'replacement_id'  => $existingLedger->replacement_appointment_id,
                    ]);

                    $existingLedger->update([
                        'status'         => VacationAppointmentReschedule::STATUS_MANUAL_PENDING,
                        'failure_reason' => 'LEDGER_APPOINTMENT_STATE_MISMATCH: Inconsistent date/replacement reference detected on redelivery',
                        'resolved_at'    => Carbon::now('Africa/Algiers'),
                        'resolved_by_id' => $actor->id,
                    ]);

                    return VacationAppointmentReschedule::STATUS_MANUAL_PENDING;
                }

                Log::info('VACATION_RESCHEDULE_PRIOR_COMPLETION_RECOGNIZED: Appointment already successfully relocated and verified consistent.', [
                    'vacation_id'    => $vacation->id,
                    'appointment_id' => $appointment->id,
                ]);

                return 'skipped';
            }

            if (in_array($existingLedger->status, [
                VacationAppointmentReschedule::STATUS_RESTORED,
                VacationAppointmentReschedule::STATUS_URGENT_UNRESOLVED,
                VacationAppointmentReschedule::STATUS_MANUAL_PENDING,
            ], true)) {
                return 'skipped';
            }
        }

        $clinic = Clinic::find($appointment->clinic_id);
        $doctor = Doctor::find($appointment->doctor_id);

        if (! $clinic || ! $doctor) {
            return $this->recordUnresolved(
                $vacation,
                $appointment,
                'CLINIC_OR_DOCTOR_RECORD_NOT_FOUND',
                $actor
            );
        }

        // 2. Check if 7-day Option B restoration window has expired: [T_init, T_end_local_midnight)
        $isPast7Days = $this->isBeyondSevenDayWindow($appointment);

        // 3. Find candidate slot in [D_end + 1, D_end + 30] in Africa/Algiers
        $candidate = $this->findReplacementSlot($vacation, $clinic, $doctor);

        if (! $candidate || $isPast7Days) {
            $failureReason = $isPast7Days
                ? 'RESTORATION_WINDOW_EXPIRED_7_DAYS'
                : 'NO_AVAILABLE_SLOT_WITHIN_30_DAYS';

            return $this->recordUnresolved(
                $vacation,
                $appointment,
                $failureReason,
                $actor
            );
        }

        // 4. Attempt atomic relocation using BookingService inside isolated transaction
        try {
            DB::transaction(function () use ($vacation, $appointment, $candidate, $actor) {
                // Pre-check / lock ledger inside transaction if present
                $lockedLedger = VacationAppointmentReschedule::where('doctor_vacation_id', $vacation->id)
                    ->where('original_appointment_id', $appointment->id)
                    ->lockForUpdate()
                    ->first();

                if ($lockedLedger && in_array($lockedLedger->status, [
                    VacationAppointmentReschedule::STATUS_RESCHEDULED,
                    VacationAppointmentReschedule::STATUS_RESTORED,
                    VacationAppointmentReschedule::STATUS_URGENT_UNRESOLVED,
                    VacationAppointmentReschedule::STATUS_MANUAL_PENDING,
                ], true)) {
                    return;
                }

                $rescheduled = $this->bookingService->rescheduleAppointment($appointment, [
                    'appointment_date' => $candidate['date'],
                    'time_slot'        => $candidate['time_slot'],
                    'notes'            => 'إعادة جدولة آلية بسبب إجازة الطبيب الرسمية (DEC-VAC-01)',
                ], $actor);

                if ($lockedLedger) {
                    $lockedLedger->update([
                        'replacement_appointment_id' => $rescheduled->id,
                        'status'                     => VacationAppointmentReschedule::STATUS_RESCHEDULED,
                        'failure_reason'             => null,
                        'resolved_at'                => Carbon::now('Africa/Algiers'),
                        'resolved_by_id'             => $actor->id,
                    ]);
                } else {
                    VacationAppointmentReschedule::create([
                        'id'                         => (string) Str::uuid(),
                        'doctor_vacation_id'         => $vacation->id,
                        'original_appointment_id'    => $appointment->id,
                        'replacement_appointment_id' => $rescheduled->id,
                        'clinic_id'                  => $appointment->clinic_id,
                        'status'                     => VacationAppointmentReschedule::STATUS_RESCHEDULED,
                        'failure_reason'             => null,
                        'resolved_at'                => Carbon::now('Africa/Algiers'),
                        'resolved_by_id'             => $actor->id,
                    ]);
                }

                // In-App Notification Outbox creation for successful rescheduling (TASK-DWH-08 / DEC-NOT-01 / DEC-GAP-04)
                $rawPhone = $appointment->patient_phone
                    ?? $appointment->patient?->phone
                    ?? $appointment->patient?->user?->phone;
                $recipientPhone = $rawPhone !== null ? trim((string) $rawPhone) : '';

                if ($recipientPhone !== '') {
                    $idempotencyKey = sprintf(
                        'reschedule_notice_rescheduled_%s_%s_%s',
                        $appointment->id,
                        $candidate['date'],
                        $candidate['time_slot']
                    );

                    if (! NotificationOutbox::where('idempotency_key', $idempotencyKey)->exists()) {
                        NotificationOutbox::create([
                            'id'              => (string) Str::uuid(),
                            'appointment_id'  => $appointment->id,
                            'recipient_phone' => $recipientPhone,
                            'recipient_type'  => 'patient',
                            'channel'         => 'in_app',
                            'template'        => 'vacation_reschedule_success',
                            'payload'         => [
                                'original_appointment_id'    => $appointment->id,
                                'replacement_appointment_id' => $rescheduled->id,
                                'booking_reference'          => $rescheduled->booking_reference,
                                'original_date'              => $appointment->appointment_date ? Carbon::parse($appointment->appointment_date)->format('Y-m-d') : null,
                                'original_slot'              => $appointment->time_slot,
                                'new_date'                   => $candidate['date'],
                                'new_slot'                   => $candidate['time_slot'],
                                'doctor_id'                  => $rescheduled->doctor_id,
                                'clinic_id'                  => $rescheduled->clinic_id,
                                'vacation_id'                => $vacation->id,
                                'message'                    => "تمت إعادة جدولة موعدكم بنجاح إلى تاريخ {$candidate['date']} الساعة {$candidate['time_slot']} نظراً لإجازة الطبيب المعتمدة.",
                            ],
                            'idempotency_key' => $idempotencyKey,
                            'status'          => NotificationOutbox::STATUS_PENDING,
                            'retry_count'     => 0,
                        ]);
                    }
                } else {
                    // Explicitly modeled failure/escalation path when recipient phone data is missing
                    $missingRecipientKey = sprintf('reschedule_notice_missing_recipient_%s', $appointment->id);
                    if (! NotificationOutbox::where('idempotency_key', $missingRecipientKey)->exists()) {
                        NotificationOutbox::create([
                            'id'              => (string) Str::uuid(),
                            'appointment_id'  => $appointment->id,
                            'recipient_phone' => 'UNKNOWN_PHONE',
                            'recipient_type'  => 'patient',
                            'channel'         => 'in_app',
                            'template'        => 'vacation_reschedule_missing_recipient',
                            'payload'         => [
                                'appointment_id'             => $appointment->id,
                                'replacement_appointment_id' => $rescheduled->id,
                                'booking_reference'          => $rescheduled->booking_reference,
                                'clinic_id'                  => $rescheduled->clinic_id,
                                'new_date'                   => $candidate['date'],
                                'new_slot'                   => $candidate['time_slot'],
                                'reason'                     => 'MISSING_RECIPIENT_CONTACT: Patient phone number not recorded',
                            ],
                            'idempotency_key' => $missingRecipientKey,
                            'status'          => NotificationOutbox::STATUS_FAILED,
                            'retry_count'     => 0,
                            'last_error'      => 'MISSING_RECIPIENT_DATA: No phone number available for patient notification',
                        ]);
                    }
                }
            });

            return VacationAppointmentReschedule::STATUS_RESCHEDULED;
        } catch (QueryException $e) {
            // MySQL error 1062 = ER_DUP_ENTRY on unique constraint uniq_var_vacation_original_appt
            if ($this->isDuplicateKeyException($e)) {
                return $this->handleConcurrentDuplicateConflict($vacation, $appointment);
            }

            // Transient locking errors (1213 deadlock, 1205 lock wait timeout): rethrow for queue retry
            if ($this->isTransientLockingException($e)) {
                Log::warning('VACATION_APPOINTMENT_RELOCATION_TRANSIENT_LOCK_ERROR: Deadlock or lock-wait timeout encountered. Propagating exception for queue retry.', [
                    'appointment_id' => $appointment->id,
                    'vacation_id'    => $vacation->id,
                    'error_code'     => $e->errorInfo[1] ?? null,
                    'message'        => $e->getMessage(),
                ]);
                throw $e;
            }

            Log::warning('VACATION_APPOINTMENT_RELOCATION_QUERY_EXCEPTION', [
                'appointment_id' => $appointment->id,
                'vacation_id'    => $vacation->id,
                'candidate'      => $candidate,
                'error'          => $e->getMessage(),
            ]);

            return $this->recordUnresolved(
                $vacation,
                $appointment,
                'RELOCATION_FAILED: ' . $e->getMessage(),
                $actor
            );
        } catch (\Throwable $e) {
            Log::warning('VACATION_APPOINTMENT_RELOCATION_FAILED', [
                'appointment_id' => $appointment->id,
                'vacation_id'    => $vacation->id,
                'candidate'      => $candidate,
                'error'          => $e->getMessage(),
            ]);

            return $this->recordUnresolved(
                $vacation,
                $appointment,
                'RELOCATION_FAILED: ' . $e->getMessage(),
                $actor
            );
        }
    }

    /**
     * Verify whether an appointment recorded as rescheduled in the ledger is consistent.
     */
    protected function verifyRescheduledConsistency(
        DoctorVacation $vacation,
        Appointment $appointment,
        VacationAppointmentReschedule $ledger
    ): bool {
        $vacationStart = Carbon::parse($vacation->vacation_start)->format('Y-m-d');
        $vacationEnd   = Carbon::parse($vacation->vacation_end)->format('Y-m-d');
        $currentDate   = $appointment->appointment_date ? Carbon::parse($appointment->appointment_date)->format('Y-m-d') : null;

        if (! $currentDate) {
            return false;
        }

        // Must NOT still be within vacation window
        if ($currentDate >= $vacationStart && $currentDate <= $vacationEnd) {
            return false;
        }

        // Replacement appointment must exist
        if ($ledger->replacement_appointment_id && ! Appointment::where('id', $ledger->replacement_appointment_id)->exists()) {
            return false;
        }

        return true;
    }

    /**
     * Handle confirmed unique key collision under concurrent worker execution.
     */
    protected function handleConcurrentDuplicateConflict(DoctorVacation $vacation, Appointment $appointment): string
    {
        Log::info('VACATION_RESCHEDULE_CONCURRENT_DUPLICATE_CAUGHT: Reloading winning worker ledger outcome', [
            'vacation_id'    => $vacation->id,
            'appointment_id' => $appointment->id,
        ]);

        $winningLedger = VacationAppointmentReschedule::where('doctor_vacation_id', $vacation->id)
            ->where('original_appointment_id', $appointment->id)
            ->first();

        if ($winningLedger && in_array($winningLedger->status, [
            VacationAppointmentReschedule::STATUS_RESCHEDULED,
            VacationAppointmentReschedule::STATUS_RESTORED,
            VacationAppointmentReschedule::STATUS_URGENT_UNRESOLVED,
            VacationAppointmentReschedule::STATUS_MANUAL_PENDING,
        ], true)) {
            return 'skipped';
        }

        // If winning ledger row exists in another non-terminal status, return skipped
        if ($winningLedger) {
            return 'skipped';
        }

        throw new \RuntimeException('Duplicate-key conflict occurred but winning ledger record could not be found.');
    }

    /**
     * Inspect if a database exception represents a unique constraint violation (MySQL 1062).
     */
    protected function isDuplicateKeyException(QueryException $e): bool
    {
        return isset($e->errorInfo[1]) && (int) $e->errorInfo[1] === 1062;
    }

    /**
     * Inspect if a database exception represents a transient locking failure (MySQL 1213 deadlock or 1205 lock wait timeout).
     */
    protected function isTransientLockingException(QueryException $e): bool
    {
        $code = isset($e->errorInfo[1]) ? (int) $e->errorInfo[1] : 0;

        return in_array($code, [1213, 1205], true);
    }

    /**
     * Check if appointment is beyond the 7-calendar-day Option B restoration window.
     * Window: [T_init, T_end_local_midnight) (7 calendar days in Africa/Algiers, exclusive of midnight start of 8th day).
     */
    public function isBeyondSevenDayWindow(Appointment $appointment): bool
    {
        $now = Carbon::now('Africa/Algiers');
        $initTime = $appointment->created_at
            ? Carbon::parse($appointment->created_at)->timezone('Africa/Algiers')
            : Carbon::parse($appointment->appointment_date . ' ' . $appointment->time_slot, 'Africa/Algiers');

        // End of 7th calendar day (exclusive local midnight start of 8th day)
        $sevenDayMidnight = $initTime->copy()->addDays(7)->startOfDay();

        return $now->greaterThanOrEqualTo($sevenDayMidnight);
    }

    /**
     * Search candidate slots strictly within [D_end + 1, D_end + 30] in Africa/Algiers.
     *
     * @return array{date: string, time_slot: string}|null
     */
    public function findReplacementSlot(DoctorVacation $vacation, Clinic $clinic, Doctor $doctor): ?array
    {
        if (! $this->clinicOperatingHoursService->isClinicConfigured($clinic->id)) {
            return null;
        }

        if (! $this->doctorWorkingHoursService->isScheduleActivated($clinic->id, $doctor->id)) {
            return null;
        }

        $vacationEnd = Carbon::parse($vacation->vacation_end, 'Africa/Algiers');
        $searchStart = $vacationEnd->copy()->addDay()->startOfDay();
        $searchEnd   = $vacationEnd->copy()->addDays(30)->startOfDay();

        $currentDay = $searchStart->copy();

        while ($currentDay->lessThanOrEqualTo($searchEnd)) {
            $dateStr = $currentDay->format('Y-m-d');
            $dow = ($currentDay->dayOfWeek + 1) % 7;

            // Skip if doctor is on another effective vacation on this date
            if ($this->doctorVacationService->isDoctorOnVacation($doctor->id, $clinic->id, $dateStr)) {
                $currentDay->addDay();
                continue;
            }

            foreach (BookingService::ALLOWED_BOOKING_START_SLOTS as $slotTime) {
                // 1. Working hours schedule check
                if (! $this->doctorWorkingHoursService->isSlotAvailable($clinic->id, $doctor->id, $dow, $slotTime)) {
                    continue;
                }

                // 2. Active slot boundary check (not expired)
                try {
                    $this->bookingService->validateActiveSlotBoundary($dateStr, $slotTime);
                } catch (\Throwable) {
                    continue;
                }

                // 3. Slot ledger & quarantine check
                /** @var AppointmentSlot|null $slotRow */
                $slotRow = AppointmentSlot::where('clinic_id', $clinic->id)
                    ->where('doctor_id', $doctor->id)
                    ->where('appointment_date', $dateStr)
                    ->where('time_slot', $slotTime)
                    ->first();

                if ($slotRow && $slotRow->is_quarantined) {
                    continue;
                }

                $configuredCapacity = $this->bookingService->resolveSlotCapacity($clinic, $doctor);
                $capacity = $slotRow ? (int) $slotRow->capacity : $configuredCapacity;

                $occupied = Appointment::where('clinic_id', $clinic->id)
                    ->where('doctor_id', $doctor->id)
                    ->where('appointment_date', $dateStr)
                    ->where('time_slot', $slotTime)
                    ->whereIn('status', Appointment::OCCUPYING_STATUSES)
                    ->count();

                if ($occupied >= $capacity) {
                    continue;
                }

                // 4. Doctor exclusivity / reservation check across clinics
                $resConflict = DB::table('doctor_time_reservations')
                    ->where('doctor_id', $doctor->id)
                    ->where('appointment_date', $dateStr)
                    ->where('time_slot', $slotTime)
                    ->where('clinic_id', '!=', $clinic->id)
                    ->exists();

                if ($resConflict) {
                    continue;
                }

                return [
                    'date'      => $dateStr,
                    'time_slot' => $slotTime,
                ];
            }

            $currentDay->addDay();
        }

        return null;
    }

    /**
     * Record urgent_unresolved outcome, handle quota refund if applicable, and queue patient notice in outbox.
     * Safely catches duplicate key races if another worker concurrently inserts the outcome.
     */
    protected function recordUnresolved(
        DoctorVacation $vacation,
        Appointment $appointment,
        string $reason,
        User $actor
    ): string {
        try {
            DB::transaction(function () use ($vacation, $appointment, $reason, $actor) {
                $existingLedger = VacationAppointmentReschedule::where('doctor_vacation_id', $vacation->id)
                    ->where('original_appointment_id', $appointment->id)
                    ->lockForUpdate()
                    ->first();

                if ($existingLedger) {
                    $existingLedger->update([
                        'status'         => VacationAppointmentReschedule::STATUS_URGENT_UNRESOLVED,
                        'failure_reason' => $reason,
                        'resolved_at'    => Carbon::now('Africa/Algiers'),
                        'resolved_by_id' => $actor->id,
                    ]);
                } else {
                    VacationAppointmentReschedule::create([
                        'id'                      => (string) Str::uuid(),
                        'doctor_vacation_id'      => $vacation->id,
                        'original_appointment_id' => $appointment->id,
                        'clinic_id'               => $appointment->clinic_id,
                        'status'                  => VacationAppointmentReschedule::STATUS_URGENT_UNRESOLVED,
                        'failure_reason'          => $reason,
                        'resolved_at'             => Carbon::now('Africa/Algiers'),
                        'resolved_by_id'          => $actor->id,
                    ]);
                }

                // Quota refund if appointment was booked by a booking center and had deducted units
                if ($appointment->booking_center_id) {
                    $bookingCenter = BookingCenter::find($appointment->booking_center_id);
                    if ($bookingCenter) {
                        $this->quotaService->refundForAppointment(
                            $bookingCenter,
                            $appointment,
                            $actor,
                            "استرداد حصة لتعذر إعادة الجدولة الآلية بسبب إجازة الطبيب (Option B): {$reason}"
                        );
                    }
                }

                // Notification outbox record
                if ($appointment->patient_phone) {
                    $idempotencyKey = sprintf(
                        'reschedule_notice_urgent_unresolved_%s_%s_%s',
                        $appointment->id,
                        $appointment->appointment_date ? Carbon::parse($appointment->appointment_date)->format('Y-m-d') : 'nodate',
                        $appointment->time_slot ?? 'noslot'
                    );

                    if (! NotificationOutbox::where('idempotency_key', $idempotencyKey)->exists()) {
                        NotificationOutbox::create([
                            'id'              => (string) Str::uuid(),
                            'appointment_id'  => $appointment->id,
                            'recipient_phone' => $appointment->patient_phone,
                            'recipient_type'  => 'patient',
                            'channel'         => 'in_app',
                            'template'        => 'vacation_reschedule_unresolved',
                            'payload'         => [
                                'appointment_id'    => $appointment->id,
                                'booking_reference' => $appointment->booking_reference,
                                'vacation_id'       => $vacation->id,
                                'reason'            => $reason,
                                'instruction'       => 'يرجى التواصل مع مركز الحجز أو العيادة لترتيب موعد بديل دون أي رسوم إضافية (Option B).',
                            ],
                            'idempotency_key' => $idempotencyKey,
                            'status'          => NotificationOutbox::STATUS_PENDING,
                            'retry_count'     => 0,
                        ]);
                    }
                }
            });

            return VacationAppointmentReschedule::STATUS_URGENT_UNRESOLVED;
        } catch (QueryException $e) {
            if ($this->isDuplicateKeyException($e)) {
                return $this->handleConcurrentDuplicateConflict($vacation, $appointment);
            }

            throw $e;
        }
    }
}
