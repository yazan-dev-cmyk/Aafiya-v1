<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\AppointmentStatusHistory;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public const ALLOWED_HOURLY_SLOTS = [
        '08:00', '09:00', '10:00', '11:00', '12:00',
        '13:00', '14:00', '15:00', '16:00', '17:00',
    ];

    public function __construct(
        protected QuotaService $quotaService,
        protected AuthorizationService $authService
    ) {}

    /**
     * Resolve slot capacity hierarchy: doctor_clinic override -> clinic capacity -> default 10.
     * Guaranteed 1 <= capacity <= 10.
     */
    public function resolveSlotCapacity(Clinic $clinic, Doctor $doctor): int
    {
        $pivot = DB::table('doctor_clinic')
            ->where('clinic_id', $clinic->id)
            ->where('doctor_id', $doctor->id)
            ->first();

        $capacity = $pivot?->max_patients_per_slot ?? $clinic->max_patients_per_slot ?? 10;

        return max(1, min(10, (int) $capacity));
    }

    /**
     * Pre-ensure deterministic slot row exists in appointment_slots before acquiring exclusive row lock.
     * Eliminates MySQL gap-lock collisions on initial/empty slot bookings.
     */
    public function ensureSlotExists(Clinic $clinic, Doctor $doctor, string $date, string $timeSlot): AppointmentSlot
    {
        $capacity = $this->resolveSlotCapacity($clinic, $doctor);

        DB::table('appointment_slots')->insertOrIgnore([
            'id'               => (string) Str::uuid(),
            'clinic_id'        => $clinic->id,
            'doctor_id'        => $doctor->id,
            'appointment_date' => $date,
            'time_slot'        => $timeSlot,
            'capacity'         => $capacity,
            'booked_count'     => 0,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        return AppointmentSlot::where('clinic_id', $clinic->id)
            ->where('doctor_id', $doctor->id)
            ->where('appointment_date', $date)
            ->where('time_slot', $timeSlot)
            ->firstOrFail();
    }

    /**
     * Create a new appointment with concurrency-safe capacity validation.
     *
     * @param array<string, mixed> $data
     */
    public function createAppointment(array $data, User $creator): Appointment
    {
        $clinic = Clinic::findOrFail($data['clinic_id']);
        $doctor = Doctor::findOrFail($data['doctor_id']);

        // Validate that the doctor is actively affiliated with the clinic
        $membership = $doctor->clinics()->where('clinics.id', $clinic->id)->first();
        if (! $membership) {
            abort(403, 'غير مصرح: الطبيب المحدد غير منتسب لهذه العيادة.');
        }
        if (! ($membership->pivot->is_active ?? false)) {
            abort(403, 'غير مصرح: تم تعليق حساب الطبيب في هذه العيادة.');
        }

        // Enforce clinic authority & delegated booking permission for doctor_assistant
        if ($creator->hasRole('doctor_assistant')) {
            $assistant = $creator->clinicAssistant;
            if (! $assistant || ! $assistant->is_active || $assistant->trashed()) {
                abort(403, 'غير مصرح: حساب المساعد غير نشط أو غير مرتبط بعيادة.');
            }
            if ((string) $assistant->clinic_id !== (string) $clinic->id) {
                abort(403, 'غير مصرح: لا يمكن للمساعد إنشاء حجز لعيادة أخرى.');
            }
            if (! $creator->hasClinicAccess('booking.create', $clinic->id)) {
                abort(403, 'غير مصرح: تم سحب صلاحية إنشاء وحجز المواعيد من حسابك.');
            }
        }

        // 1. One-Hour Slot Rule (P3 Frozen)
        $timeSlot = $this->normalizeTimeSlot($data['time_slot']);
        if (! in_array($timeSlot, self::ALLOWED_HOURLY_SLOTS, true)) {
            throw ValidationException::withMessages([
                'time_slot' => ['فترة الحجز غير صالحة. وفق قاعدة الساعة الواحدة (P3)، يجب أن تبدأ الفترات على رأس الساعة (مثال: 09:00).'],
            ]);
        }

        $date = Carbon::parse($data['appointment_date'])->format('Y-m-d');

        // Pre-ensure deterministic slot row exists before entering transaction to eliminate gap-locking
        $this->ensureSlotExists($clinic, $doctor, $date, $timeSlot);

        return DB::transaction(function () use ($data, $creator, $clinic, $doctor, $date, $timeSlot) {
            // 2. Deterministic Row-Level Lock on dedicated slot ledger
            /** @var AppointmentSlot $slot */
            $slot = AppointmentSlot::where('clinic_id', $clinic->id)
                ->where('doctor_id', $doctor->id)
                ->where('appointment_date', $date)
                ->where('time_slot', $timeSlot)
                ->lockForUpdate()
                ->firstOrFail();

            // Refresh capacity from clinic/doctor configuration to ensure real-time accuracy
            $configuredCapacity = $this->resolveSlotCapacity($clinic, $doctor);
            if ($slot->capacity !== $configuredCapacity) {
                $slot->capacity = $configuredCapacity;
                $slot->save();
            }

            // Invariant check: verify active appointments in database
            $activeOccupied = Appointment::where('clinic_id', $clinic->id)
                ->where('doctor_id', $doctor->id)
                ->where('appointment_date', $date)
                ->where('time_slot', $timeSlot)
                ->whereIn('status', Appointment::OCCUPYING_STATUSES)
                ->count();

            $currentOccupied = max((int) $slot->booked_count, $activeOccupied);

            if ($currentOccupied >= $slot->capacity) {
                throw ValidationException::withMessages([
                    'capacity' => ["اكتملت السعة القصوى المحددة ({$slot->capacity} مرضى) للطبيب في هذه الفترة الزمنية ({$timeSlot})."],
                ]);
            }

            // 3. Duplicate active booking check for the same patient phone in this slot
            $duplicate = Appointment::where('clinic_id', $clinic->id)
                ->where('doctor_id', $doctor->id)
                ->where('appointment_date', $date)
                ->where('time_slot', $timeSlot)
                ->where('patient_phone', $data['patient_phone'])
                ->whereIn('status', Appointment::OCCUPYING_STATUSES)
                ->exists();

            if ($duplicate) {
                throw ValidationException::withMessages([
                    'patient_phone' => ['المريض لديه حجز نشط بالفعل في نفس الفترة الزمنية مع هذا الطبيب.'],
                ]);
            }

            // Determine creator type & resolve booking center attribution
            $bookingCenterId = null;
            $creatorIsBookingCenter = $creator->hasRole('booking_center') || $creator->hasRole('booking_center_staff');

            if ($creatorIsBookingCenter) {
                $center = $creator->bookingCenter;
                if (! $center || ! $center->isOperational()) {
                    throw ValidationException::withMessages([
                        'booking_center' => ['حساب مركز الحجز غير معتمد أو غير مفعل.'],
                    ]);
                }

                // If client submitted a booking_center_id, it MUST match the actor's own center
                if (! empty($data['booking_center_id']) && $data['booking_center_id'] !== $center->id) {
                    throw ValidationException::withMessages([
                        'booking_center_id' => ['غير مصرح: لا يمكن إنشاء حجوزات منسوبة لمركز حجز آخر.'],
                    ]);
                }

                $bookingCenterId = $center->id;
                $creatorType = 'booking_center';
            } elseif ($creator->hasRole('admin')) {
                // Admin can optionally attribute to a booking center
                if (! empty($data['booking_center_id'])) {
                    $center = BookingCenter::find($data['booking_center_id']);
                    if (! $center || ! $center->isOperational()) {
                        throw ValidationException::withMessages([
                            'booking_center_id' => ['مركز الحجز المحدد غير معتمد أو غير مفعل.'],
                        ]);
                    }
                    $bookingCenterId = $center->id;
                }
                $creatorType = $data['creator_type'] ?? 'admin';
            } else {
                // Non-admin, non-booking-center actors (patients, doctors, assistants)
                // Cannot submit a third-party booking_center_id
                if (! empty($data['booking_center_id'])) {
                    throw ValidationException::withMessages([
                        'booking_center_id' => ['غير مصرح: لا يمكن تحديد مركز حجز لهذا الموعد.'],
                    ]);
                }
                $creatorType = $this->resolveCreatorType($creator);
            }

            if ($bookingCenterId) {
                $center = BookingCenter::find($bookingCenterId);
                if ($center && $center->quota_balance <= 0) {
                    throw ValidationException::withMessages([
                        'quota' => ['لا يمكن تنفيذ الحجز: لا توجد وحدات حجز متاحة.'],
                    ]);
                }
            }

            // Auto-link registered patient profile if booked by authenticated patient
            $patientId = $data['patient_id'] ?? null;
            if (! $patientId && $creator->hasRole('patient_registered') && $creator->patient) {
                $patientId = $creator->patient->id;
            }

            // 4. Generate Sequential Unique Booking Reference MS-YYYY-XXXX via atomic counter
            $bookingReference = $this->generateBookingReference();
            $secureToken = Str::random(64);

            $appointment = Appointment::create([
                'booking_reference' => $bookingReference,
                'secure_token' => $secureToken,
                'clinic_id' => $clinic->id,
                'doctor_id' => $doctor->id,
                'patient_id' => $patientId,
                'patient_name' => $data['patient_name'],
                'patient_phone' => $data['patient_phone'],
                'patient_mrn' => $data['patient_mrn'] ?? ($creator->patient?->mrn ?? null),
                'patient_national_id' => $data['patient_national_id'] ?? ($creator->patient?->national_id ?? null),
                'booking_center_id' => $bookingCenterId,
                'created_by_id' => $creator->id,
                'creator_type' => $creatorType,
                'appointment_date' => $date,
                'time_slot' => $timeSlot,
                'status' => 'pending',
                'rescheduled_from_id' => $data['rescheduled_from_id'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            // Synchronize booked_count atomically
            $slot->update([
                'booked_count' => $currentOccupied + 1,
            ]);

            AppointmentStatusHistory::create([
                'appointment_id' => $appointment->id,
                'from_status' => null,
                'to_status' => 'pending',
                'changed_by_id' => $creator->id,
                'reason' => 'إنشاء طلب الحجز الأولي',
            ]);

            return $appointment;
        }, 5);
    }

    /**
     * Concurrency-safe atomic check-in of an appointment using its single-use secure QR token.
     */
    public function checkInAppointmentByToken(string $token, User $actor): Appointment
    {
        return DB::transaction(function () use ($token, $actor) {
            $appointment = Appointment::where('secure_token', $token)
                ->lockForUpdate()
                ->first();

            if (! $appointment) {
                throw ValidationException::withMessages([
                    'token' => ['رمز تسجيل الحضور غير صالح.'],
                ]);
            }

            // Authorize operational staff for this appointment's clinic
            $this->authorizeOperationalStaff($appointment, $actor);

            // Idempotent return if already attended
            if ($appointment->status === 'attended' || $appointment->checked_in_at !== null) {
                return $appointment->fresh(['clinic', 'doctor.user', 'patient', 'confirmer', 'checkedInBy']);
            }

            // Critical rule: pending -> attended is NEVER allowed. Only confirmed -> attended.
            if ($appointment->status !== 'confirmed') {
                throw ValidationException::withMessages([
                    'status' => [$this->getAttendStatusErrorMessage($appointment->status)],
                ]);
            }

            $previousStatus = $appointment->status;

            $appointment->update([
                'status' => 'attended',
                'checked_in_at' => now(),
                'checked_in_by_id' => $actor->id,
            ]);

            AppointmentStatusHistory::create([
                'appointment_id' => $appointment->id,
                'from_status' => $previousStatus,
                'to_status' => 'attended',
                'changed_by_id' => $actor->id,
                'reason' => 'تأكيد حضور المريض عبر مسح رمز QR الموعد',
            ]);

            return $appointment->fresh(['clinic', 'doctor.user', 'patient', 'confirmer', 'checkedInBy']);
        });
    }

    /**
     * Mark an appointment as attended directly by appointment ID (operational staff: doctor/assistant/admin).
     */
    public function attendAppointment(Appointment $appointment, User $user): Appointment
    {
        return DB::transaction(function () use ($appointment, $user) {
            /** @var Appointment $lockedAppointment */
            $lockedAppointment = Appointment::where('id', $appointment->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Authorize operational staff for this appointment's clinic
            $this->authorizeOperationalStaff($lockedAppointment, $user);

            // Idempotent return if already attended
            if ($lockedAppointment->status === 'attended') {
                return $lockedAppointment->fresh(['clinic', 'doctor.user', 'patient', 'confirmer', 'checkedInBy']);
            }

            // Critical rule: pending -> attended is NEVER allowed. Only confirmed -> attended.
            if ($lockedAppointment->status !== 'confirmed') {
                throw ValidationException::withMessages([
                    'status' => [$this->getAttendStatusErrorMessage($lockedAppointment->status)],
                ]);
            }

            $previousStatus = $lockedAppointment->status;

            $lockedAppointment->update([
                'status' => 'attended',
                'checked_in_at' => now(),
                'checked_in_by_id' => $user->id,
            ]);

            AppointmentStatusHistory::create([
                'appointment_id' => $lockedAppointment->id,
                'from_status' => $previousStatus,
                'to_status' => 'attended',
                'changed_by_id' => $user->id,
                'reason' => 'تسجيل حضور المريض في العيادة',
            ]);

            return $lockedAppointment->fresh(['clinic', 'doctor.user', 'patient', 'confirmer', 'checkedInBy']);
        });
    }

    /**
     * Mark an appointment as no-show (operational staff: doctor/assistant/admin).
     */
    public function markAppointmentNoShow(Appointment $appointment, User $user, ?string $reason = null): Appointment
    {
        return DB::transaction(function () use ($appointment, $user, $reason) {
            /** @var Appointment $lockedAppointment */
            $lockedAppointment = Appointment::where('id', $appointment->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Authorize operational staff for this appointment's clinic
            $this->authorizeOperationalStaff($lockedAppointment, $user);

            // Only confirmed appointments can transition to no_show
            if ($lockedAppointment->status !== 'confirmed') {
                throw ValidationException::withMessages([
                    'status' => [$this->getNoShowStatusErrorMessage($lockedAppointment->status)],
                ]);
            }

            $previousStatus = $lockedAppointment->status;

            $lockedAppointment->update([
                'status' => 'no_show',
            ]);

            AppointmentStatusHistory::create([
                'appointment_id' => $lockedAppointment->id,
                'from_status' => $previousStatus,
                'to_status' => 'no_show',
                'changed_by_id' => $user->id,
                'reason' => $reason ?: 'عدم حضور المريض في الموعد المحدد (No-Show)',
            ]);

            return $lockedAppointment->fresh(['clinic', 'doctor.user', 'patient', 'confirmer', 'checkedInBy']);
        });
    }

    /**
     * Confirm an appointment (4D authorized Doctor/Director, triggers Quota Deduction).
     */
    public function confirmAppointment(Appointment $appointment, User $user, ?string $reason = null): Appointment
    {
        return DB::transaction(function () use ($appointment, $user, $reason) {
            /** @var Appointment $lockedAppointment */
            $lockedAppointment = Appointment::where('id', $appointment->id)->lockForUpdate()->firstOrFail();

            // Check if already confirmed (idempotent)
            if ($lockedAppointment->status === 'confirmed' || $lockedAppointment->status === 'attended') {
                return $lockedAppointment;
            }

            if ($lockedAppointment->status !== 'pending') {
                throw ValidationException::withMessages([
                    'status' => ["لا يمكن تأكيد موعد بحالة ({$lockedAppointment->status}). التأكيد متاح فقط للمواعيد قيد الانتظار."],
                ]);
            }

            // 4D Authorization: Must be doctor or authorized clinic director
            $this->authorizeConfirmation($lockedAppointment, $user);

            // Deduct Quota if booked by an institutional Booking Center (P3 / P10)
            if ($lockedAppointment->booking_center_id) {
                $center = BookingCenter::findOrFail($lockedAppointment->booking_center_id);
                $this->quotaService->deductForAppointment($center, $lockedAppointment, $user);
            }

            $fromStatus = $lockedAppointment->status;
            $lockedAppointment->update([
                'status' => 'confirmed',
                'confirmed_at' => now(),
                'confirmed_by_id' => $user->id,
            ]);

            AppointmentStatusHistory::create([
                'appointment_id' => $lockedAppointment->id,
                'from_status' => $fromStatus,
                'to_status' => 'confirmed',
                'changed_by_id' => $user->id,
                'reason' => $reason ?? ($user->hasRole('doctor_assistant') ? 'تأكيد الموعد الطبي من قبل مساعد العيادة' : 'تأكيد الموعد الطبي من قبل الطبيب المعني'),
            ]);

            return $lockedAppointment->fresh(['clinic', 'doctor.user', 'bookingCenter', 'statusHistory']);
        });
    }

    /**
     * Reject or cancel an appointment (triggers Quota refund if previously confirmed).
     */
    public function rejectOrCancelAppointment(
        Appointment $appointment,
        User $user,
        string $reason,
        string $targetStatus = 'cancelled'
    ): Appointment {
        return DB::transaction(function () use ($appointment, $user, $reason, $targetStatus) {
            /** @var Appointment $lockedAppointment */
            $lockedAppointment = Appointment::where('id', $appointment->id)->lockForUpdate()->firstOrFail();

            // Enforce cancellation authorization
            $this->authorizeCancellation($lockedAppointment, $user);

            if (in_array($lockedAppointment->status, ['cancelled', 'rejected', 'expired'], true)) {
                return $lockedAppointment;
            }

            $fromStatus = $lockedAppointment->status;

            // If it was confirmed and has a booking center, issue a quota refund (P3 / P10)
            if ($fromStatus === 'confirmed' && $lockedAppointment->booking_center_id) {
                $center = BookingCenter::findOrFail($lockedAppointment->booking_center_id);
                $this->quotaService->refundForAppointment($center, $lockedAppointment, $user, $reason);
            }

            $lockedAppointment->update(['status' => $targetStatus]);

            // Synchronize slot booked_count if transitioning from occupying to non-occupying status
            if (in_array($fromStatus, Appointment::OCCUPYING_STATUSES, true)) {
                $slotDate = $lockedAppointment->appointment_date ? Carbon::parse($lockedAppointment->appointment_date)->format('Y-m-d') : null;
                if ($slotDate && $lockedAppointment->time_slot) {
                    $slot = AppointmentSlot::where('clinic_id', $lockedAppointment->clinic_id)
                        ->where('doctor_id', $lockedAppointment->doctor_id)
                        ->where('appointment_date', $slotDate)
                        ->where('time_slot', $lockedAppointment->time_slot)
                        ->lockForUpdate()
                        ->first();

                    if ($slot && $slot->booked_count > 0) {
                        $slot->decrement('booked_count');
                    }
                }
            }

            AppointmentStatusHistory::create([
                'appointment_id' => $lockedAppointment->id,
                'from_status' => $fromStatus,
                'to_status' => $targetStatus,
                'changed_by_id' => $user->id,
                'reason' => $reason,
            ]);

            return $lockedAppointment->fresh();
        }, 5);
    }

    /**
     * Reschedule an appointment in-place with Canonical Lock Ordering and atomic slot capacity protection.
     */
    public function rescheduleAppointment(Appointment $appointment, array $newSlotData, User $user): Appointment
    {
        $newDate = Carbon::parse($newSlotData['appointment_date'])->format('Y-m-d');
        $newSlot = $this->normalizeTimeSlot($newSlotData['time_slot']);

        if (! in_array($newSlot, self::ALLOWED_HOURLY_SLOTS, true)) {
            throw ValidationException::withMessages([
                'time_slot' => ['فترة الحجز غير صالحة. وفق قاعدة الساعة الواحدة (P3)، يجب أن تبدأ الفترات على رأس الساعة (مثال: 09:00).'],
            ]);
        }

        $clinic = Clinic::findOrFail($appointment->clinic_id);
        $doctor = Doctor::findOrFail($appointment->doctor_id);

        $oldDate = $appointment->appointment_date ? Carbon::parse($appointment->appointment_date)->format('Y-m-d') : null;
        $oldSlot = $this->normalizeTimeSlot($appointment->time_slot);

        // Pre-ensure both slot rows exist prior to locking to prevent gap-lock deadlock
        if ($oldDate && $oldSlot) {
            $this->ensureSlotExists($clinic, $doctor, $oldDate, $oldSlot);
        }
        $this->ensureSlotExists($clinic, $doctor, $newDate, $newSlot);

        return DB::transaction(function () use ($appointment, $newSlotData, $user, $clinic, $doctor, $oldDate, $oldSlot, $newDate, $newSlot) {
            /** @var Appointment $locked */
            $locked = Appointment::where('id', $appointment->id)->lockForUpdate()->firstOrFail();

            // 1. Enforce reschedule authorization
            $this->authorizeReschedule($locked, $user);

            // 2. Disallow rescheduling forbidden terminal or inactive statuses
            if (in_array($locked->status, ['attended', 'cancelled', 'rejected', 'expired'], true)) {
                throw ValidationException::withMessages([
                    'status' => ["لا يمكن إعادة جدولة موعد بحالة ({$locked->status})."],
                ]);
            }

            // 3. Prevent no-op rescheduling to the exact same date and time slot
            if ($oldDate === $newDate && $oldSlot === $newSlot) {
                throw ValidationException::withMessages([
                    'time_slot' => ['التاريخ والفترة الزمنية المحددة مطابقة للموعد الحالي بالفعل.'],
                ]);
            }

            // 4. Canonical Lock Order enforcement (Section 8) to prevent deadlocks:
            // Compare composite keys lexicographically: smaller key locked first, larger key locked second.
            $keyOld = sprintf('%s:%s:%s:%s', $clinic->id, $doctor->id, $oldDate, $oldSlot);
            $keyNew = sprintf('%s:%s:%s:%s', $clinic->id, $doctor->id, $newDate, $newSlot);

            $oldSlotRow = null;
            $newSlotRow = null;

            if (strcmp($keyOld, $keyNew) < 0) {
                // Lock Old first, then New
                if ($oldDate && $oldSlot) {
                    $oldSlotRow = AppointmentSlot::where('clinic_id', $clinic->id)
                        ->where('doctor_id', $doctor->id)
                        ->where('appointment_date', $oldDate)
                        ->where('time_slot', $oldSlot)
                        ->lockForUpdate()
                        ->first();
                }
                $newSlotRow = AppointmentSlot::where('clinic_id', $clinic->id)
                    ->where('doctor_id', $doctor->id)
                    ->where('appointment_date', $newDate)
                    ->where('time_slot', $newSlot)
                    ->lockForUpdate()
                    ->firstOrFail();
            } else {
                // Lock New first, then Old
                $newSlotRow = AppointmentSlot::where('clinic_id', $clinic->id)
                    ->where('doctor_id', $doctor->id)
                    ->where('appointment_date', $newDate)
                    ->where('time_slot', $newSlot)
                    ->lockForUpdate()
                    ->firstOrFail();
                if ($oldDate && $oldSlot) {
                    $oldSlotRow = AppointmentSlot::where('clinic_id', $clinic->id)
                        ->where('doctor_id', $doctor->id)
                        ->where('appointment_date', $oldDate)
                        ->where('time_slot', $oldSlot)
                        ->lockForUpdate()
                        ->first();
                }
            }

            // Sync configured capacity on target slot
            $configuredCapacity = $this->resolveSlotCapacity($clinic, $doctor);
            if ($newSlotRow->capacity !== $configuredCapacity) {
                $newSlotRow->capacity = $configuredCapacity;
                $newSlotRow->save();
            }

            // 5. Capacity Concurrency Protection on new target slot
            $activeOccupiedOnTarget = Appointment::where('clinic_id', $clinic->id)
                ->where('doctor_id', $doctor->id)
                ->where('appointment_date', $newDate)
                ->where('time_slot', $newSlot)
                ->whereIn('status', Appointment::OCCUPYING_STATUSES)
                ->where('id', '!=', $locked->id)
                ->count();

            $currentOccupiedTarget = max((int) $newSlotRow->booked_count, $activeOccupiedOnTarget);
            if ($currentOccupiedTarget >= $newSlotRow->capacity) {
                throw ValidationException::withMessages([
                    'capacity' => ["اكتملت السعة القصوى المحددة ({$newSlotRow->capacity} مرضى) للطبيب في هذه الفترة الزمنية ({$newSlot})."],
                ]);
            }

            // 6. Duplicate active booking check for the same patient on the new slot
            if ($locked->patient_phone) {
                $duplicate = Appointment::where('clinic_id', $clinic->id)
                    ->where('doctor_id', $doctor->id)
                    ->where('appointment_date', $newDate)
                    ->where('time_slot', $newSlot)
                    ->where('patient_phone', $locked->patient_phone)
                    ->whereIn('status', Appointment::OCCUPYING_STATUSES)
                    ->where('id', '!=', $locked->id)
                    ->exists();

                if ($duplicate) {
                    throw ValidationException::withMessages([
                        'patient_phone' => ['المريض لديه حجز نشط بالفعل في هذه الفترة الزمنية مع هذا الطبيب.'],
                    ]);
                }
            }

            // 7. Atomically adjust booked counters on both slots
            if ($oldSlotRow && $oldSlotRow->booked_count > 0) {
                $oldSlotRow->decrement('booked_count');
            }
            $newSlotRow->update([
                'booked_count' => $currentOccupiedTarget + 1,
            ]);

            // 8. In-Place Update: preserve ID, booking_reference, secure_token, status, and ownership
            $notes = $newSlotData['notes'] ?? $locked->notes;
            $currentStatus = $locked->status;

            $locked->update([
                'appointment_date' => $newDate,
                'time_slot'        => $newSlot,
                'notes'            => $notes,
            ]);

            // 9. Record detailed audit history on the exact same appointment
            $reasonNote = "إعادة جدولة الموعد من ({$oldDate} {$oldSlot}) إلى ({$newDate} {$newSlot})";
            if (! empty($newSlotData['notes'])) {
                $reasonNote .= " - ملاحظة: {$newSlotData['notes']}";
            }

            AppointmentStatusHistory::create([
                'appointment_id' => $locked->id,
                'from_status'    => $currentStatus,
                'to_status'      => $currentStatus,
                'changed_by_id'  => $user->id,
                'reason'         => $reasonNote,
            ]);

            return $locked->fresh(['clinic', 'doctor.user', 'patient', 'bookingCenter', 'statusHistory']);
        }, 5);
    }

    /**
     * Get available capacity and slots for a doctor on a specific date.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getAvailableSlots(Doctor $doctor, Clinic $clinic, string $date): array
    {
        // Pre-ensure all 10 hourly slots exist for this date
        foreach (self::ALLOWED_HOURLY_SLOTS as $slotTime) {
            $this->ensureSlotExists($clinic, $doctor, $date, $slotTime);
        }

        $slotRows = AppointmentSlot::where('clinic_id', $clinic->id)
            ->where('doctor_id', $doctor->id)
            ->where('appointment_date', $date)
            ->get()
            ->keyBy('time_slot');

        $activeCounts = Appointment::where('clinic_id', $clinic->id)
            ->where('doctor_id', $doctor->id)
            ->where('appointment_date', $date)
            ->whereIn('status', Appointment::OCCUPYING_STATUSES)
            ->groupBy('time_slot')
            ->select('time_slot', DB::raw('count(*) as count'))
            ->pluck('count', 'time_slot')
            ->toArray();

        $configuredCapacity = $this->resolveSlotCapacity($clinic, $doctor);

        $slots = [];
        foreach (self::ALLOWED_HOURLY_SLOTS as $slotTime) {
            $slotRow = $slotRows->get($slotTime);
            $capacity = $slotRow ? (int) $slotRow->capacity : $configuredCapacity;
            $activeCount = (int) ($activeCounts[$slotTime] ?? 0);
            $occupied = $slotRow ? max((int) $slotRow->booked_count, $activeCount) : $activeCount;
            $available = max(0, $capacity - $occupied);

            $slots[] = [
                'time_slot'    => $slotTime,
                'max_capacity' => $capacity,
                'occupied'     => $occupied,
                'available'    => $available,
                'is_available' => $available > 0,
            ];
        }

        return $slots;
    }

    /**
     * Generate thread-safe sequential booking reference in MS-YYYY-XXXX format via atomic appointment_sequences ledger.
     */
    protected function generateBookingReference(): string
    {
        $year = (int) Carbon::now('Africa/Algiers')->format('Y');

        $seqRow = DB::table('appointment_sequences')
            ->where('year', $year)
            ->lockForUpdate()
            ->first();

        if (! $seqRow) {
            throw new \RuntimeException("سنة التسلسل المرجعي للمواعيد ({$year}) غير مهيأة في قاعدة البيانات. يرجى مراجعة إعدادات النظام.");
        }

        $nextSeq = (int) $seqRow->current_sequence + 1;

        DB::table('appointment_sequences')
            ->where('year', $year)
            ->update([
                'current_sequence' => $nextSeq,
                'updated_at'       => now(),
            ]);

        return sprintf('MS-%d-%04d', $year, $nextSeq);
    }

    protected function normalizeTimeSlot(string $slot): string
    {
        $slot = trim($slot);
        if (preg_match('/^(\d{1,2}:\d{2})/', $slot, $matches)) {
            $parts = explode(':', $matches[1]);
            $h = str_pad($parts[0], 2, '0', STR_PAD_LEFT);
            $m = str_pad($parts[1], 2, '0', STR_PAD_LEFT);
            return "{$h}:{$m}";
        }
        $parts = explode(':', $slot);
        if (count($parts) >= 2) {
            $h = str_pad($parts[0], 2, '0', STR_PAD_LEFT);
            $m = str_pad(substr($parts[1], 0, 2), 2, '0', STR_PAD_LEFT);
            return "{$h}:{$m}";
        }
        return $slot;
    }

    protected function resolveCreatorType(User $user): string
    {
        if ($user->hasRole('booking_center')) {
            return 'booking_center';
        }
        if ($user->hasRole('doctor_assistant')) {
            return 'clinic_assistant';
        }
        if ($user->hasRole('doctor')) {
            return 'doctor';
        }
        if ($user->hasRole('admin')) {
            return 'admin';
        }
        return 'patient';
    }

    protected function authorizeConfirmation(Appointment $appointment, User $user): void
    {
        // Admin can confirm
        if ($user->hasRole('admin')) {
            return;
        }

        // The assigned doctor
        if ($user->doctor && $user->doctor->id === $appointment->doctor_id) {
            if (! $user->doctor->isDoctorActiveInClinic($appointment->clinic_id)) {
                abort(403, 'غير مصرح: تم تعليق حساب الطبيب في هذه العيادة.');
            }
            return;
        }

        // Clinic director of this appointment's clinic
        if ($user->doctor && $user->doctor->isDirectorOf($appointment->clinic_id)) {
            if (! $user->doctor->isDoctorActiveInClinic($appointment->clinic_id)) {
                abort(403, 'غير مصرح: تم تعليق حساب الطبيب في هذه العيادة.');
            }
            return;
        }

        // Doctor Assistant branch
        if ($user->hasRole('doctor_assistant')) {
            $assistant = $user->clinicAssistant;
            if (! $assistant || ! $assistant->is_active || $assistant->clinic_id !== $appointment->clinic_id) {
                abort(403, 'غير مصرح: المساعد غير مصرح له بالعمل على هذه العيادة.');
            }

            if (! $user->hasClinicAccess('booking.confirm', $appointment->clinic_id)) {
                abort(403, 'غير مصرح: تم سحب صلاحية تأكيد المواعيد من حسابك في هذه العيادة.');
            }

            return;
        }

        throw ValidationException::withMessages([
            'authorization' => ['غير مصرح لك بتأكيد هذا الموعد الطبي.'],
        ]);
    }

    /**
     * Authorize appointment cancellation.
     */
    protected function authorizeCancellation(Appointment $appointment, User $user): void
    {
        if ($user->hasRole('admin')) {
            return;
        }

        // Assigned doctor
        if ($user->doctor && $user->doctor->id === $appointment->doctor_id) {
            if (! $user->doctor->isDoctorActiveInClinic($appointment->clinic_id)) {
                abort(403, 'غير مصرح: تم تعليق حساب الطبيب في هذه العيادة.');
            }
            return;
        }

        // Clinic director of this appointment's clinic
        if ($user->doctor && $user->doctor->isDirectorOf($appointment->clinic_id)) {
            if (! $user->doctor->isDoctorActiveInClinic($appointment->clinic_id)) {
                abort(403, 'غير مصرح: تم تعليق حساب الطبيب في هذه العيادة.');
            }
            return;
        }

        // Clinic assistant in the same clinic
        if ($user->hasRole('doctor_assistant') && $user->clinicAssistant && $user->clinicAssistant->clinic_id === $appointment->clinic_id && $user->clinicAssistant->is_active) {
            return;
        }

        // The patient who owns the appointment
        if ($user->patient && $user->patient->id === $appointment->patient_id) {
            return;
        }

        // The creator
        if ($appointment->created_by_id === $user->id) {
            return;
        }

        throw ValidationException::withMessages([
            'authorization' => ['غير مصرح لك بإلغاء هذا الموعد الطبي.'],
        ]);
    }

    /**
     * Authorize appointment rescheduling.
     */
    protected function authorizeReschedule(Appointment $appointment, User $user): void
    {
        if ($user->hasRole('admin')) {
            return;
        }

        // Assigned doctor
        if ($user->doctor && $user->doctor->id === $appointment->doctor_id) {
            return;
        }

        // Clinic director of this appointment's clinic
        if ($user->doctor && $user->doctor->isDirectorOf($appointment->clinic_id)) {
            return;
        }

        // Clinic assistant in the same clinic
        if ($user->hasRole('doctor_assistant') && $user->clinicAssistant && $user->clinicAssistant->clinic_id === $appointment->clinic_id && $user->clinicAssistant->is_active) {
            return;
        }

        // The patient who owns the appointment
        if ($user->patient && $user->patient->id === $appointment->patient_id) {
            return;
        }

        // The creator
        if ($appointment->created_by_id === $user->id) {
            return;
        }

        // Booking center staff of the owning booking center
        if ($appointment->booking_center_id && $user->bookingCenter && $user->bookingCenter->id === $appointment->booking_center_id) {
            return;
        }

        throw ValidationException::withMessages([
            'authorization' => ['غير مصرح لك بإعادة جدولة هذا الموعد الطبي.'],
        ]);
    }

    /**
     * Authorize operational staff (doctor, assistant, or admin) for appointment clinic actions.
     */
    public function authorizeOperationalStaff(Appointment $appointment, User $user): void
    {
        // 1. Admin can perform operational actions
        if ($user->hasRole('admin')) {
            return;
        }

        // 2. Doctor: must be verified and actively affiliated with the appointment's clinic
        if ($user->hasRole('doctor') && $user->doctor) {
            if ($user->doctor->is_verified === false) {
                abort(403, 'غير مصرح لك بتنفيذ هذا الإجراء.');
            }

            if (! $user->doctor->isDoctorActiveInClinic($appointment->clinic_id)) {
                abort(403, 'غير مصرح لك بتنفيذ هذا الإجراء.');
            }

            return;
        }

        // 3. Clinic Assistant: must be actively assigned to this appointment's clinic and hold attendance permission
        if ($user->hasRole('doctor_assistant') && $user->clinicAssistant) {
            if ($user->clinicAssistant->clinic_id !== $appointment->clinic_id || ! $user->clinicAssistant->is_active) {
                abort(403, 'غير مصرح لك بتنفيذ هذا الإجراء.');
            }

            if (! $user->hasClinicAccess('booking.confirm_attendance', $appointment->clinic_id)) {
                abort(403, 'غير مصرح: تم سحب صلاحية تأكيد الحضور وتسجيل المرضى من حسابك.');
            }

            return;
        }

        // 4. All other roles (patients, booking centers, unassigned users) are rejected
        abort(403, 'غير مصرح لك بتنفيذ هذا الإجراء.');
    }

    /**
     * Get semantic error message for invalid appointment status during attendance.
     */
    protected function getAttendStatusErrorMessage(string $status): string
    {
        return match ($status) {
            'pending' => 'لا يمكن تسجيل حضور موعد قيد الانتظار. يجب تأكيد الموعد أولاً.',
            'cancelled' => 'لا يمكن تسجيل حضور موعد ملغى.',
            'rejected' => 'لا يمكن تسجيل حضور موعد مرفوض.',
            'expired' => 'لا يمكن تسجيل حضور موعد منتهي الصلاحية.',
            default => "لا يمكن تسجيل حضور موعد بحالة ({$status}). تسجيل الحضور متاح فقط للمواعيد المؤكدة.",
        };
    }

    /**
     * Get semantic error message for invalid appointment status during no-show marking.
     */
    protected function getNoShowStatusErrorMessage(string $status): string
    {
        return match ($status) {
            'pending' => 'لا يمكن تسجيل عدم الحضور لموعد قيد الانتظار. يجب تأكيد الموعد أولاً.',
            'attended' => 'لا يمكن تسجيل عدم الحضور لموعد تم تسجيل حضوره.',
            'cancelled' => 'لا يمكن تسجيل عدم الحضور لموعد ملغى.',
            'rejected' => 'لا يمكن تسجيل عدم الحضور لموعد مرفوض.',
            'expired' => 'لا يمكن تسجيل عدم الحضور لموعد منتهي الصلاحية.',
            default => "لا يمكن تسجيل عدم الحضور لموعد بحالة ({$status}). هذا الإجراء متاح فقط للمواعيد المؤكدة.",
        };
    }
}
