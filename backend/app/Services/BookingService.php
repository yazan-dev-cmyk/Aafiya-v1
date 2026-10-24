<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\AppointmentStatusHistory;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\NotificationOutbox;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public const ALLOWED_HOURLY_SLOTS = [
        '08:00', '09:00', '10:00', '11:00', '12:00',
        '13:00', '14:00', '15:00', '16:00', '17:00',
    ];

    public const ALLOWED_BOOKING_START_SLOTS = [
        '08:00', '09:00', '10:00', '11:00', '12:00',
        '13:00', '14:00', '15:00', '16:00',
    ];

    public function __construct(
        protected QuotaService $quotaService,
        protected AuthorizationService $authService,
        protected ?DoctorWorkingHoursService $doctorWorkingHoursService = null,
        protected ?ClinicOperatingHoursService $clinicOperatingHoursService = null,
        protected ?DoctorTimeReservationService $timeReservationService = null,
        protected ?DoctorVacationService $vacationService = null,
        protected ?NotificationOutboxService $notificationOutboxService = null
    ) {
        $this->clinicOperatingHoursService = $clinicOperatingHoursService ?? app(ClinicOperatingHoursService::class);
        $this->doctorWorkingHoursService = $doctorWorkingHoursService ?? app(DoctorWorkingHoursService::class);
        $this->timeReservationService = $timeReservationService ?? app(DoctorTimeReservationService::class);
        $this->vacationService = $vacationService ?? app(DoctorVacationService::class);
        $this->notificationOutboxService = $notificationOutboxService ?? app(NotificationOutboxService::class);
    }

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

        // Enforce Patient Self-Booking Policy (DEC-GAP-D01)
        if ($creator->hasRole('patient_guest')) {
            abort(403, 'غير مصرح: حساب المريض الضيف غير مخول بإنشاء مواعيد مباشرة.');
        }

        if ($this->resolveCreatorType($creator) === 'patient') {
            if (! config('booking.patient_booking_enabled', false)) {
                abort(403, 'غير مصرح: حجز المواعيد الذاتي للمرضى غير مفعّل حالياً بانتظار إطلاق الدفع الإلكتروني. يرجى الحجز عبر العيادة أو مركز الحجز المعتمد.');
            }
        }

        // 1. One-Hour Slot Rule & 16:00 Platform Limit (17:00 excluded as booking start)
        $timeSlot = $this->normalizeTimeSlot($data['time_slot']);
        if ($timeSlot === '17:00' || ! in_array($timeSlot, self::ALLOWED_HOURLY_SLOTS, true)) {
            throw ValidationException::withMessages([
                'time_slot' => ['فترة الحجز غير صالحة. وفق قواعد المنصة، يبدأ آخر موعد متاح في الساعة 16:00، وفترة 17:00 مخصصة للإغلاق ومحظورة.'],
            ]);
        }

        $carbonDate = Carbon::parse($data['appointment_date']);
        $date = $carbonDate->format('Y-m-d');
        $dow = ($carbonDate->dayOfWeek + 1) % 7;

        // Active slot boundary check (DEC-GAP-01): reject if slot_end <= now('Africa/Algiers')
        $this->validateActiveSlotBoundary($date, $timeSlot);

        // 1.5. Validate Doctor Vacation guard (TASK-DWH-05 / DEC-VAC-01)
        if ($this->vacationService->isDoctorOnVacation($doctor->id, $clinic->id, $date)) {
            throw ValidationException::withMessages([
                'appointment_date' => ['لا يمكن إنشاء الحجز: الطبيب في إجازة معتمدة في هذا التاريخ.'],
            ])->errorBag('DOCTOR_ON_VACATION');
        }

        // 2. Validate Clinic Operating Hours completeness
        if (! $this->clinicOperatingHoursService->isClinicConfigured($clinic->id)) {
            throw ValidationException::withMessages([
                'clinic_id' => ['لا يمكن إنشاء الحجز: ساعات تشغيل العيادة الأسبوعية غير مهيأة بعد.'],
            ])->errorBag('CLINIC_SCHEDULE_NOT_CONFIGURED');
        }

        // 3. Validate Doctor Working Hours activation
        if (! $this->doctorWorkingHoursService->isScheduleActivated($clinic->id, $doctor->id)) {
            throw ValidationException::withMessages([
                'doctor_id' => ['لا يمكن إنشاء الحجز: ساعات العمل الأسبوعية للطبيب غير مفعّلة في هذه العيادة.'],
            ])->errorBag('DOCTOR_SCHEDULE_NOT_ACTIVATED');
        }

        // 4. Validate slot is enabled in the doctor's activated schedule
        if (! $this->doctorWorkingHoursService->isSlotAvailable($clinic->id, $doctor->id, $dow, $timeSlot)) {
            throw ValidationException::withMessages([
                'time_slot' => ['الفترة الزمنية المختارة غير متاحة في جدول عمل الطبيب المعتمد لهذا اليوم.'],
            ])->errorBag('SLOT_NOT_AVAILABLE_IN_SCHEDULE');
        }

        // Pre-ensure deterministic slot row exists only after full eligibility validation
        $slotPre = $this->ensureSlotExists($clinic, $doctor, $date, $timeSlot);
        if ($slotPre->is_quarantined) {
            throw ValidationException::withMessages([
                'time_slot' => ['الفترة الزمنية المختارة معلقة إدارياً وغير متاحة للحجز حالياً.'],
            ])->errorBag('SLOT_QUARANTINED');
        }

        try {
            return DB::transaction(function () use ($data, $creator, $clinic, $doctor, $date, $timeSlot) {
                // Level 1 Canonical Lock: Atomically acquire or validate doctor time ownership across clinics
                $this->timeReservationService->acquireOrValidate($clinic->id, $doctor->id, $date, $timeSlot);

                // Level 2 Canonical Lock: Deterministic Row-Level Lock on dedicated slot ledger
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

                // Guard: Reject booking on quarantined slot
                if ($slot->is_quarantined) {
                    throw ValidationException::withMessages([
                        'time_slot' => ['الفترة الزمنية المختارة معلقة إدارياً وغير متاحة للحجز حالياً.'],
                    ])->errorBag('SLOT_QUARANTINED');
                }

                // Invariant check: verify active appointments in database
                $activeOccupied = Appointment::where('clinic_id', $clinic->id)
                    ->where('doctor_id', $doctor->id)
                    ->where('appointment_date', $date)
                    ->where('time_slot', $timeSlot)
                    ->whereIn('status', Appointment::OCCUPYING_STATUSES)
                    ->count();

                // Detect counter drift: C_stored != C_actual
                if ((int) $slot->booked_count !== $activeOccupied) {
                    $reason = "COUNTER_DRIFT_DETECTED: stored={$slot->booked_count}, actual={$activeOccupied}";
                    $stored = (int) $slot->booked_count;
                    $actual = $activeOccupied;
                    $slotId = $slot->id;

                    $ex = ValidationException::withMessages([
                        'time_slot' => ['تعذر إتمام الحجز: تم تعليق الفترة الزمنية للتحقق من اتساق السعة.'],
                    ])->errorBag('SLOT_QUARANTINED_DRIFT');

                    // Attach drift details to exception so outer block can persist quarantine durably
                    $ex->driftContext = [
                        'slot_id'      => $slotId,
                        'reason'       => $reason,
                        'stored_count' => $stored,
                        'actual_count' => $actual,
                    ];

                    throw $ex;
                }

            $currentOccupied = (int) $slot->booked_count;

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

            $this->createInAppNotification(
                appointment: $appointment,
                template: 'appointment_booked',
                idempotencyKey: "appointment_booked_{$appointment->id}",
                payloadData: [
                    'appointment_id' => $appointment->id,
                    'booking_reference' => $appointment->booking_reference,
                    'appointment_date' => $date,
                    'time_slot' => $timeSlot,
                    'clinic_name' => $clinic->name,
                    'doctor_name' => $doctor->user?->name ?? 'الطبيب المعالج',
                    'message' => "تم تسجيل طلب حجز موعدكم الطبي ({$appointment->booking_reference}) بنجاح وهو قيد المراجعة.",
                    'message_en' => "Your appointment request ({$appointment->booking_reference}) has been registered and is pending review.",
                    'message_fr' => "Votre demande de rendez-vous ({$appointment->booking_reference}) a été enregistrée et est en cours d'examen.",
                ]
            );

            return $appointment;
        }, 5);
        } catch (ValidationException $e) {
            if (isset($e->driftContext)) {
                $ctx = $e->driftContext;
                $persisted = $this->quarantineSlot(
                    $ctx['slot_id'],
                    $ctx['reason'],
                    $ctx['stored_count'],
                    $ctx['actual_count'],
                    [
                        'clinic_id'        => $clinic->id,
                        'doctor_id'        => $doctor->id,
                        'appointment_date' => $date,
                        'time_slot'        => $timeSlot,
                    ]
                );

                if (! $persisted) {
                    $failedEx = ValidationException::withMessages([
                        'time_slot' => ['تعذر إتمام الحجز بسبب تعارض في سعة الفترة الزمنية. يرجى اختيار موعد آخر أو المحاولة لاحقاً.'],
                    ])->errorBag('SLOT_COUNTER_DRIFT_UNCONFIRMED');
                    $failedEx->driftContext = $ctx;
                    $failedEx->quarantinePersisted = false;

                    throw $failedEx;
                }

                $e->quarantinePersisted = true;
            }

            throw $e;
        }
    }

    /**
     * Concurrency-safe atomic check-in of an appointment using its single-use secure QR token.
     *
     * @return array{appointment: Appointment, check_in_result: string}
     */
    public function checkInAppointmentByToken(string $token, User $actor): array
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
                return [
                    'appointment' => $appointment->fresh(['clinic', 'doctor.user', 'patient', 'confirmer', 'checkedInBy']),
                    'check_in_result' => 'already_checked_in',
                ];
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

            return [
                'appointment' => $appointment->fresh(['clinic', 'doctor.user', 'patient', 'confirmer', 'checkedInBy']),
                'check_in_result' => 'checked_in',
            ];
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

            $clinicName = $lockedAppointment->clinic?->name ?? 'العيادة';
            $doctorName = $lockedAppointment->doctor?->user?->name ?? 'الطبيب المعالج';
            $formattedDate = $lockedAppointment->appointment_date ? (is_string($lockedAppointment->appointment_date) ? $lockedAppointment->appointment_date : $lockedAppointment->appointment_date->format('Y-m-d')) : null;

            $this->createInAppNotification(
                appointment: $lockedAppointment,
                template: 'appointment_confirmed',
                idempotencyKey: "appointment_confirmed_{$lockedAppointment->id}",
                payloadData: [
                    'appointment_id' => $lockedAppointment->id,
                    'booking_reference' => $lockedAppointment->booking_reference,
                    'appointment_date' => $formattedDate,
                    'time_slot' => $lockedAppointment->time_slot,
                    'clinic_name' => $clinicName,
                    'doctor_name' => $doctorName,
                    'confirmed_by' => $user->name,
                    'confirmed_by_role' => $user->roles->first()?->name ?? 'staff',
                    'message' => "تم تأكيد موعدكم الطبي ({$lockedAppointment->booking_reference}) في {$clinicName}. تذكرة الدخول متاحة الآن في التطبيق.",
                    'message_en' => "Your medical appointment ({$lockedAppointment->booking_reference}) at {$clinicName} has been confirmed. Your pass is now available.",
                    'message_fr' => "Votre rendez-vous médical ({$lockedAppointment->booking_reference}) à {$clinicName} a été confirmé. Votre pass est maintenant disponible.",
                ]
            );

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
        // Initial non-locking read of appointment parameters
        $initialClinicId = (string) $appointment->clinic_id;
        $initialDoctorId = (string) $appointment->doctor_id;
        $initialDate = $appointment->appointment_date ? Carbon::parse($appointment->appointment_date)->format('Y-m-d') : null;
        $initialSlot = $appointment->time_slot ? $this->normalizeTimeSlot($appointment->time_slot) : null;

        return DB::transaction(function () use ($appointment, $user, $reason, $targetStatus, $initialClinicId, $initialDoctorId, $initialDate, $initialSlot) {
            // Level 1 Canonical Lock: Lock doctor time reservation if date and slot exist
            if ($initialDoctorId && $initialDate && $initialSlot) {
                $this->timeReservationService->lockReservation($initialDoctorId, $initialDate, $initialSlot);
            }

            // Level 2 Canonical Lock: Lock appointment slot row
            $slot = null;
            if ($initialClinicId && $initialDoctorId && $initialDate && $initialSlot) {
                $slot = AppointmentSlot::where('clinic_id', $initialClinicId)
                    ->where('doctor_id', $initialDoctorId)
                    ->where('appointment_date', $initialDate)
                    ->where('time_slot', $initialSlot)
                    ->lockForUpdate()
                    ->first();
            }

            // Level 3 Canonical Lock: Lock and revalidate appointment row
            /** @var Appointment $lockedAppointment */
            $lockedAppointment = Appointment::where('id', $appointment->id)->lockForUpdate()->firstOrFail();

            // Revalidate critical attributes to prevent acting on stale data
            $currentClinicId = (string) $lockedAppointment->clinic_id;
            $currentDoctorId = (string) $lockedAppointment->doctor_id;
            $currentDate = $lockedAppointment->appointment_date ? Carbon::parse($lockedAppointment->appointment_date)->format('Y-m-d') : null;
            $currentSlot = $lockedAppointment->time_slot ? $this->normalizeTimeSlot($lockedAppointment->time_slot) : null;

            if ($currentClinicId !== $initialClinicId || $currentDoctorId !== $initialDoctorId || $currentDate !== $initialDate || $currentSlot !== $initialSlot) {
                // If appointment coordinates shifted concurrently, abort immediately to preserve canonical lock hierarchy
                // and prevent deadlock cycles from acquiring lower-level locks out of order while holding appointment lock.
                throw ValidationException::withMessages([
                    'appointment' => ['تغيرت بيانات وفترة الموعد بالتزامن قبل إتمام عملية الإلغاء أو الرفض.'],
                ])->errorBag('APPOINTMENT_COORDINATES_CHANGED');
            }

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

            // Synchronize slot booked_count and conditionally release doctor time reservation
            if (in_array($fromStatus, Appointment::OCCUPYING_STATUSES, true)) {
                if ($slot) {
                    // Check actual occupancy prior to status change (excluding this transitioning appointment)
                    $remainingOccupying = Appointment::where('clinic_id', $currentClinicId)
                        ->where('doctor_id', $currentDoctorId)
                        ->where('appointment_date', $currentDate)
                        ->where('time_slot', $currentSlot)
                        ->whereIn('status', Appointment::OCCUPYING_STATUSES)
                        ->where('id', '!=', $lockedAppointment->id)
                        ->count();

                    // Expected pre-transition count was remainingOccupying + 1
                    if ((int) $slot->booked_count !== ($remainingOccupying + 1)) {
                        $this->quarantineSlot(
                            $slot,
                            "COUNTER_DRIFT_ON_CANCELLATION: stored={$slot->booked_count}, expected=" . ($remainingOccupying + 1),
                            (int) $slot->booked_count,
                            $remainingOccupying + 1
                        );
                    }

                    if ($slot->booked_count > 0) {
                        $slot->decrement('booked_count');
                    }
                }

                // Conditionally release doctor_time_reservations only if no other occupying appointments remain
                if ($currentClinicId && $currentDoctorId && $currentDate && $currentSlot) {
                    $this->timeReservationService->releaseIfEmpty(
                        $currentClinicId,
                        $currentDoctorId,
                        $currentDate,
                        $currentSlot,
                        $lockedAppointment->id
                    );
                }
            }

            AppointmentStatusHistory::create([
                'appointment_id' => $lockedAppointment->id,
                'from_status' => $fromStatus,
                'to_status' => $targetStatus,
                'changed_by_id' => $user->id,
                'reason' => $reason,
            ]);

            // Record transactional notification in outbox for patient in-app delivery (DEC-NOT-01 / DEC-GAP-04)
            $recipientPhone = $lockedAppointment->patient_phone ?: ($lockedAppointment->patient?->phone ?? 'UNKNOWN_PHONE');
            $idempotencyKey = sprintf('appointment_%s_%s', $targetStatus, $lockedAppointment->id);

            if (! NotificationOutbox::where('idempotency_key', $idempotencyKey)->exists()) {
                $clinicName = $lockedAppointment->clinic?->name ?? 'العيادة';
                $doctorName = $lockedAppointment->doctor?->user?->name ?? 'الطبيب المعالج';
                $isPatientSelf = $user->patient && $user->patient->id === $lockedAppointment->patient_id;

                $message = $isPatientSelf
                    ? "تم إلغاء موعدكم الطبي ({$lockedAppointment->booking_reference}) بنجاح بناءً على طلبكم."
                    : ($targetStatus === 'rejected'
                        ? "نحيطكم علماً بأنه تم رفض طلب موعدكم الطبي ({$lockedAppointment->booking_reference}) في {$clinicName}. السبب: {$reason}."
                        : "نحيطكم علماً بأنه تم إلغاء موعدكم الطبي ({$lockedAppointment->booking_reference}) في {$clinicName}. السبب: {$reason}.");

                NotificationOutbox::create([
                    'id'              => (string) Str::uuid(),
                    'appointment_id'  => $lockedAppointment->id,
                    'recipient_phone' => $recipientPhone,
                    'recipient_type'  => 'patient',
                    'channel'         => 'in_app',
                    'template'        => $targetStatus === 'cancelled' ? 'appointment_cancelled' : 'appointment_rejected',
                    'payload'         => [
                        'appointment_id'    => $lockedAppointment->id,
                        'booking_reference' => $lockedAppointment->booking_reference,
                        'appointment_date'  => $currentDate,
                        'time_slot'         => $currentSlot,
                        'clinic_name'       => $clinicName,
                        'doctor_name'       => $doctorName,
                        'cancelled_by'      => $user->name,
                        'cancelled_by_role' => $user->roles->first()?->name ?? 'staff',
                        'reason'            => $reason,
                        'message'           => $message,
                    ],
                    'idempotency_key' => $idempotencyKey,
                    'status'          => NotificationOutbox::STATUS_SENT,
                    'retry_count'     => 0,
                ]);
            }

            return $lockedAppointment->fresh();
        }, 5);
    }

    /**
     * Automatically expire a single past pending appointment under DEC-GAP-02.
     * Enforces Canonical Lock Hierarchy: DoctorTimeReservation -> AppointmentSlot -> Appointment.
     *
     * @param Appointment $appointment The appointment candidate.
     * @param Carbon|null $evaluationNow Current time in Africa/Algiers for boundary validation.
     * @return bool True if expired, false if skipped due to concurrency or ineligibility.
     */
    public function expirePendingAppointment(Appointment $appointment, ?Carbon $evaluationNow = null): bool
    {
        $now = $evaluationNow ?? Carbon::now('Africa/Algiers');

        // Initial non-locking read of coordinates
        $initialClinicId = (string) $appointment->clinic_id;
        $initialDoctorId = (string) $appointment->doctor_id;
        $initialDate = $appointment->appointment_date ? Carbon::parse($appointment->appointment_date)->format('Y-m-d') : null;
        $initialSlot = $appointment->time_slot ? $this->normalizeTimeSlot($appointment->time_slot) : null;

        if (! $initialDate || ! $initialSlot) {
            Log::warning('EXPIRE_PENDING_APPOINTMENT_SKIPPED_MALFORMED', [
                'appointment_id' => $appointment->id,
                'date'           => $appointment->appointment_date,
                'time_slot'      => $appointment->time_slot,
            ]);
            return false;
        }

        // Validate that slot_end is genuinely in the past
        try {
            $slotStart = Carbon::createFromFormat('Y-m-d H:i', "{$initialDate} {$initialSlot}", 'Africa/Algiers');
            $slotEnd = $slotStart->copy()->addHour();
            if ($now->lessThan($slotEnd)) {
                return false; // Not yet past slot end
            }
        } catch (\Throwable $e) {
            Log::warning('EXPIRE_PENDING_APPOINTMENT_SKIPPED_INVALID_TIME', [
                'appointment_id' => $appointment->id,
                'date'           => $initialDate,
                'time_slot'      => $initialSlot,
                'error'          => $e->getMessage(),
            ]);
            return false;
        }

        return DB::transaction(function () use ($appointment, $now, $initialClinicId, $initialDoctorId, $initialDate, $initialSlot) {
            // Level 1 Canonical Lock: Doctor Time Reservation
            $this->timeReservationService->lockReservation($initialDoctorId, $initialDate, $initialSlot);

            // Level 2 Canonical Lock: Slot Row
            /** @var AppointmentSlot|null $slot */
            $slot = AppointmentSlot::where('clinic_id', $initialClinicId)
                ->where('doctor_id', $initialDoctorId)
                ->where('appointment_date', $initialDate)
                ->where('time_slot', $initialSlot)
                ->lockForUpdate()
                ->first();

            // Level 3 Canonical Lock: Appointment Row
            /** @var Appointment|null $locked */
            $locked = Appointment::where('id', $appointment->id)
                ->lockForUpdate()
                ->first();

            if (! $locked) {
                return false;
            }

            // Post-lock Revalidation
            if ($locked->status !== 'pending') {
                return false; // Changed concurrently (e.g. cancelled or confirmed)
            }

            $currentClinicId = (string) $locked->clinic_id;
            $currentDoctorId = (string) $locked->doctor_id;
            $currentDate = $locked->appointment_date ? Carbon::parse($locked->appointment_date)->format('Y-m-d') : null;
            $currentSlot = $locked->time_slot ? $this->normalizeTimeSlot($locked->time_slot) : null;

            if ($currentClinicId !== $initialClinicId || $currentDoctorId !== $initialDoctorId || $currentDate !== $initialDate || $currentSlot !== $initialSlot) {
                return false; // Coordinates shifted concurrently
            }

            // Re-verify eligibility under lock
            $slotStart = Carbon::createFromFormat('Y-m-d H:i', "{$currentDate} {$currentSlot}", 'Africa/Algiers');
            $slotEnd = $slotStart->copy()->addHour();
            if ($now->lessThan($slotEnd)) {
                return false;
            }

            // 1. Transition status to expired
            $locked->update(['status' => 'expired']);

            // 2. Synchronize slot booked_count and detect counter drift
            if ($slot) {
                $remainingOccupying = Appointment::where('clinic_id', $currentClinicId)
                    ->where('doctor_id', $currentDoctorId)
                    ->where('appointment_date', $currentDate)
                    ->where('time_slot', $currentSlot)
                    ->whereIn('status', Appointment::OCCUPYING_STATUSES)
                    ->where('id', '!=', $locked->id)
                    ->count();

                if ((int) $slot->booked_count !== ($remainingOccupying + 1)) {
                    $this->quarantineSlot(
                        $slot,
                        "COUNTER_DRIFT_ON_EXPIRY: stored={$slot->booked_count}, expected=" . ($remainingOccupying + 1),
                        (int) $slot->booked_count,
                        $remainingOccupying + 1
                    );
                }

                if ($slot->booked_count > 0) {
                    $slot->decrement('booked_count');
                }
            }

            // 3. Conditionally release doctor_time_reservations if no remaining occupying appointments
            $this->timeReservationService->releaseIfEmpty(
                $currentClinicId,
                $currentDoctorId,
                $currentDate,
                $currentSlot,
                $locked->id
            );

            // 4. Create Status History using approved created_by_id actor
            AppointmentStatusHistory::create([
                'appointment_id' => $locked->id,
                'from_status'    => 'pending',
                'to_status'      => 'expired',
                'changed_by_id'  => $locked->created_by_id,
                'reason'         => '[SYSTEM_AUTO_EXPIRE] انتهت صلاحية الموعد تلقائياً لتجاوز نهاية الخانة الزمنية المحددة (DEC-GAP-02)',
            ]);

            return true;
        }, 5);
    }

    /**
     * Reschedule an appointment in-place with Canonical Lock Ordering and atomic slot capacity protection.
     */
    public function rescheduleAppointment(Appointment $appointment, array $newSlotData, User $user): Appointment
    {
        $newDate = Carbon::parse($newSlotData['appointment_date'])->format('Y-m-d');
        $newSlot = $this->normalizeTimeSlot($newSlotData['time_slot']);

        // 1. One-Hour Slot Rule & 16:00 Platform Limit (17:00 excluded as booking start)
        if ($newSlot === '17:00' || ! in_array($newSlot, self::ALLOWED_HOURLY_SLOTS, true)) {
            throw ValidationException::withMessages([
                'time_slot' => ['فترة الحجز غير صالحة. وفق قواعد المنصة، يبدأ آخر موعد متاح في الساعة 16:00، وفترة 17:00 مخصصة للإغلاق ومحظورة.'],
            ]);
        }

        // Active slot boundary check (DEC-GAP-01): reject if slot_end <= now('Africa/Algiers')
        $this->validateActiveSlotBoundary($newDate, $newSlot);

        $clinic = Clinic::findOrFail($appointment->clinic_id);
        $doctor = Doctor::findOrFail($appointment->doctor_id);

        // 1.5. Validate Doctor Vacation guard (TASK-DWH-05 / DEC-VAC-01)
        if ($this->vacationService->isDoctorOnVacation($doctor->id, $clinic->id, $newDate)) {
            throw ValidationException::withMessages([
                'appointment_date' => ['لا يمكن إعادة جدولة الموعد: الطبيب في إجازة معتمدة في هذا التاريخ.'],
            ])->errorBag('DOCTOR_ON_VACATION');
        }

        // 2. Validate Clinic Operating Hours completeness
        if (! $this->clinicOperatingHoursService->isClinicConfigured($clinic->id)) {
            throw ValidationException::withMessages([
                'clinic_id' => ['لا يمكن إعادة جدولة الموعد: ساعات تشغيل العيادة غير مهيأة.'],
            ])->errorBag('CLINIC_SCHEDULE_NOT_CONFIGURED');
        }

        // 3. Validate Doctor Working Hours activation
        if (! $this->doctorWorkingHoursService->isScheduleActivated($clinic->id, $doctor->id)) {
            throw ValidationException::withMessages([
                'doctor_id' => ['لا يمكن إعادة جدولة الموعد: ساعات العمل الأسبوعية للطبيب غير مفعّلة في هذه العيادة.'],
            ])->errorBag('DOCTOR_SCHEDULE_NOT_ACTIVATED');
        }

        // 4. Validate destination slot is open and enabled in the doctor's activated schedule
        $newDow = (Carbon::parse($newDate)->dayOfWeek + 1) % 7;
        if (! $this->doctorWorkingHoursService->isSlotAvailable($clinic->id, $doctor->id, $newDow, $newSlot)) {
            throw ValidationException::withMessages([
                'time_slot' => ['الفترة الزمنية المختارة غير متاحة في جدول عمل الطبيب المعتمد لهذا اليوم.'],
            ])->errorBag('SLOT_NOT_AVAILABLE_IN_SCHEDULE');
        }

        $oldDate = $appointment->appointment_date ? Carbon::parse($appointment->appointment_date)->format('Y-m-d') : null;
        $oldSlot = $this->normalizeTimeSlot($appointment->time_slot);

        // Pre-ensure slot rows only after destination eligibility is fully validated
        if ($oldDate && $oldSlot) {
            $this->ensureSlotExists($clinic, $doctor, $oldDate, $oldSlot);
        }
        $this->ensureSlotExists($clinic, $doctor, $newDate, $newSlot);

        try {
            return DB::transaction(function () use ($appointment, $newSlotData, $user, $clinic, $doctor, $oldDate, $oldSlot, $newDate, $newSlot) {
            // Level 1 Canonical Lock: Deterministic Reservation Locks
            // Compare doctor_id:date:slot lexicographically to prevent deadlocks across concurrent reschedules
            $resKeyOld = sprintf('%s:%s:%s', $doctor->id, $oldDate, $oldSlot);
            $resKeyNew = sprintf('%s:%s:%s', $doctor->id, $newDate, $newSlot);

            if (strcmp($resKeyOld, $resKeyNew) < 0) {
                if ($oldDate && $oldSlot) {
                    $this->timeReservationService->lockReservation($doctor->id, $oldDate, $oldSlot);
                }
                $this->timeReservationService->acquireOrValidate($clinic->id, $doctor->id, $newDate, $newSlot);
            } else {
                $this->timeReservationService->acquireOrValidate($clinic->id, $doctor->id, $newDate, $newSlot);
                if ($oldDate && $oldSlot) {
                    $this->timeReservationService->lockReservation($doctor->id, $oldDate, $oldSlot);
                }
            }

            // Level 2 Canonical Lock: Deterministic Row-Level Locks on appointment_slots
            $keyOld = sprintf('%s:%s:%s:%s', $clinic->id, $doctor->id, $oldDate, $oldSlot);
            $keyNew = sprintf('%s:%s:%s:%s', $clinic->id, $doctor->id, $newDate, $newSlot);

            $oldSlotRow = null;
            $newSlotRow = null;

            if (strcmp($keyOld, $keyNew) < 0) {
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

            // Level 3 Canonical Lock: Lock and revalidate Appointment row
            /** @var Appointment $locked */
            $locked = Appointment::where('id', $appointment->id)->lockForUpdate()->firstOrFail();

            // Revalidate appointment state inside lock
            $actualOldDate = $locked->appointment_date ? Carbon::parse($locked->appointment_date)->format('Y-m-d') : null;
            $actualOldSlot = $locked->time_slot ? $this->normalizeTimeSlot($locked->time_slot) : null;

            if ($actualOldDate !== $oldDate || $actualOldSlot !== $oldSlot || (string) $locked->clinic_id !== (string) $clinic->id || (string) $locked->doctor_id !== (string) $doctor->id) {
                throw ValidationException::withMessages([
                    'status' => ['تغيرت بيانات الموعد الأصلية بالتزامن قبل إتمام عملية إعادة الجدولة.'],
                ]);
            }

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

            // Sync configured capacity on target slot
            $configuredCapacity = $this->resolveSlotCapacity($clinic, $doctor);
            if ($newSlotRow->capacity !== $configuredCapacity) {
                $newSlotRow->capacity = $configuredCapacity;
                $newSlotRow->save();
            }

            // Reject quarantined target slot
            if ($newSlotRow->is_quarantined) {
                throw ValidationException::withMessages([
                    'time_slot' => ['الفترة الزمنية المختارة معلقة إدارياً وغير متاحة للحجز أو إعادة الجدولة.'],
                ])->errorBag('SLOT_QUARANTINED');
            }

            // 4. Capacity Concurrency Protection & Drift Detection on new target slot
            $activeOccupiedOnTarget = Appointment::where('clinic_id', $clinic->id)
                ->where('doctor_id', $doctor->id)
                ->where('appointment_date', $newDate)
                ->where('time_slot', $newSlot)
                ->whereIn('status', Appointment::OCCUPYING_STATUSES)
                ->where('id', '!=', $locked->id)
                ->count();

            // Detect drift on target slot
            if ((int) $newSlotRow->booked_count !== $activeOccupiedOnTarget) {
                $reason = "COUNTER_DRIFT_ON_RESCHEDULE_TARGET: stored={$newSlotRow->booked_count}, actual={$activeOccupiedOnTarget}";
                $stored = (int) $newSlotRow->booked_count;
                $actual = $activeOccupiedOnTarget;
                $slotId = $newSlotRow->id;

                $ex = ValidationException::withMessages([
                    'time_slot' => ['تعذر إتمام إعادة الجدولة: تم تعليق الفترة الزمنية المستهدفة للتحقق من اتساق السعة.'],
                ])->errorBag('SLOT_QUARANTINED_DRIFT');

                // Attach drift details to exception so outer block can persist quarantine durably outside rolled-back transaction
                $ex->driftContext = [
                    'slot_id'      => $slotId,
                    'reason'       => $reason,
                    'stored_count' => $stored,
                    'actual_count' => $actual,
                    'coordinates'  => [
                        'clinic_id'        => $clinic->id,
                        'doctor_id'        => $doctor->id,
                        'appointment_date' => $newDate,
                        'time_slot'        => $newSlot,
                    ],
                ];

                throw $ex;
            }

            $currentOccupiedTarget = (int) $newSlotRow->booked_count;
            if ($currentOccupiedTarget >= $newSlotRow->capacity) {
                throw ValidationException::withMessages([
                    'capacity' => ["اكتملت السعة القصوى المحددة ({$newSlotRow->capacity} مرضى) للطبيب في هذه الفترة الزمنية ({$newSlot})."],
                ]);
            }

            // 5. Duplicate active booking check for the same patient on the new slot
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

            // 6. Atomically adjust booked counters on both slots
            if ($oldSlotRow) {
                // Check drift on old slot prior to moving
                $remainingOccupyingOld = Appointment::where('clinic_id', $clinic->id)
                    ->where('doctor_id', $doctor->id)
                    ->where('appointment_date', $oldDate)
                    ->where('time_slot', $oldSlot)
                    ->whereIn('status', Appointment::OCCUPYING_STATUSES)
                    ->where('id', '!=', $locked->id)
                    ->count();

                if ((int) $oldSlotRow->booked_count !== ($remainingOccupyingOld + 1)) {
                    $this->quarantineSlot(
                        $oldSlotRow,
                        "COUNTER_DRIFT_ON_RESCHEDULE_OLD: stored={$oldSlotRow->booked_count}, expected=" . ($remainingOccupyingOld + 1),
                        (int) $oldSlotRow->booked_count,
                        $remainingOccupyingOld + 1
                    );
                }

                if ($oldSlotRow->booked_count > 0) {
                    $oldSlotRow->decrement('booked_count');
                }
            }

            $newSlotRow->update([
                'booked_count' => $currentOccupiedTarget + 1,
            ]);

            // 7. Conditionally release old doctor time reservation if no remaining occupying appointments exist
            if ($oldDate && $oldSlot && in_array($locked->status, Appointment::OCCUPYING_STATUSES, true)) {
                $this->timeReservationService->releaseIfEmpty(
                    $clinic->id,
                    $doctor->id,
                    $oldDate,
                    $oldSlot,
                    $locked->id
                );
            }

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
        } catch (ValidationException $e) {
            if (isset($e->driftContext)) {
                $ctx = $e->driftContext;
                $persisted = $this->quarantineSlot(
                    $ctx['slot_id'],
                    $ctx['reason'],
                    $ctx['stored_count'],
                    $ctx['actual_count'],
                    $ctx['coordinates'] ?? null
                );

                if (! $persisted) {
                    $failedEx = ValidationException::withMessages([
                        'time_slot' => ['تعذر إتمام إعادة الجدولة بسبب تعارض في سعة الفترة الزمنية المستهدفة. يرجى اختيار موعد آخر أو المحاولة لاحقاً.'],
                    ])->errorBag('SLOT_COUNTER_DRIFT_UNCONFIRMED');
                    $failedEx->driftContext = $ctx;
                    $failedEx->quarantinePersisted = false;

                    throw $failedEx;
                }

                $e->quarantinePersisted = true;
            }

            throw $e;
        }
    }

    /**
     * Get available capacity and slots for a doctor on a specific date.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getAvailableSlots(Doctor $doctor, Clinic $clinic, string $date): array
    {
        // 1. If clinic operating hours are not configured or doctor schedule is not activated, return empty list (pure read-only)
        if (! $this->clinicOperatingHoursService->isClinicConfigured($clinic->id)) {
            return [];
        }

        if (! $this->doctorWorkingHoursService->isScheduleActivated($clinic->id, $doctor->id)) {
            return [];
        }

        // 1.5. If doctor is on vacation for this clinic and date, return empty list (DEC-VAC-01)
        if ($this->vacationService->isDoctorOnVacation($doctor->id, $clinic->id, $date)) {
            return [];
        }

        $carbonDate = Carbon::parse($date);
        $dow = ($carbonDate->dayOfWeek + 1) % 7;

        // 2. Fetch existing slot records (pure read query, no ensureSlotExists call)
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
        // Only evaluate allowed booking starts (08:00..16:00, 17:00 permanently excluded)
        foreach (self::ALLOWED_HOURLY_SLOTS as $slotTime) {
            if ($slotTime === '17:00') {
                continue;
            }

            // Check if slot is enabled in the doctor's activated schedule for this day
            if (! $this->doctorWorkingHoursService->isSlotAvailable($clinic->id, $doctor->id, $dow, $slotTime)) {
                continue;
            }

            $slotRow = $slotRows->get($slotTime);
            if ($slotRow && $slotRow->is_quarantined) {
                // Quarantined slot is strictly excluded from booking availability
                continue;
            }

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

    /**
     * Validate active slot boundary under DEC-GAP-01.
     * Rejects if slot_end <= now('Africa/Algiers').
     *
     * @throws ValidationException
     */
    public function validateActiveSlotBoundary(string $date, string $timeSlot): void
    {
        $normalizedSlot = $this->normalizeTimeSlot($timeSlot);
        $slotStart = Carbon::createFromFormat('Y-m-d H:i', "{$date} {$normalizedSlot}", 'Africa/Algiers');
        $slotEnd = $slotStart->copy()->addHour();
        $now = Carbon::now('Africa/Algiers');

        if ($now->greaterThanOrEqualTo($slotEnd)) {
            throw ValidationException::withMessages([
                'time_slot' => ['فترة الحجز المختارة انتهت صلاحيتها ولا يمكن حجزها.'],
            ])->errorBag('SLOT_EXPIRED');
        }
    }

    protected function resolveCreatorType(User $user): string
    {
        if ($user->hasRole('booking_center') || $user->hasRole('booking_center_staff')) {
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

        // Booking center staff of the owning booking center
        if ($appointment->booking_center_id && $user->bookingCenter && $user->bookingCenter->id === $appointment->booking_center_id) {
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

    /**
     * Durably quarantine a slot due to detected counter drift or integrity anomaly.
     * Persists even if the calling business transaction rolls back.
     *
     * @return bool True if quarantine was durably confirmed in storage (affected > 0), false otherwise.
     */
    public function quarantineSlot(AppointmentSlot|string $slotOrId, string $reason, int $storedCount, int $actualOccupied, ?array $slotCoordinates = null): bool
    {
        $slotId = $slotOrId instanceof AppointmentSlot ? $slotOrId->id : $slotOrId;
        $clinicId = $slotOrId instanceof AppointmentSlot ? $slotOrId->clinic_id : ($slotCoordinates['clinic_id'] ?? null);
        $doctorId = $slotOrId instanceof AppointmentSlot ? $slotOrId->doctor_id : ($slotCoordinates['doctor_id'] ?? null);
        $appointmentDate = $slotOrId instanceof AppointmentSlot
            ? ($slotOrId->appointment_date instanceof Carbon ? $slotOrId->appointment_date->format('Y-m-d') : (string) $slotOrId->appointment_date)
            : ($slotCoordinates['appointment_date'] ?? null);
        $timeSlot = $slotOrId instanceof AppointmentSlot ? $slotOrId->time_slot : ($slotCoordinates['time_slot'] ?? null);

        $persisted = false;

        try {
            $affected = DB::table('appointment_slots')
                ->where('id', $slotId)
                ->update([
                    'is_quarantined'    => true,
                    'quarantine_reason' => $reason,
                    'updated_at'        => now(),
                ]);

            $persisted = ($affected > 0);
        } catch (\Throwable $e) {
            Log::critical('SLOT_QUARANTINE_PERSISTENCE_FAILED', [
                'slot_id'          => $slotId,
                'clinic_id'        => $clinicId,
                'doctor_id'        => $doctorId,
                'appointment_date' => $appointmentDate,
                'time_slot'        => $timeSlot,
                'stored_count'     => $storedCount,
                'actual_occupied'  => $actualOccupied,
                'reason'           => $reason,
                'error'            => $e->getMessage(),
                'detected_at'      => Carbon::now('Africa/Algiers')->toIso8601String(),
            ]);

            return false;
        }

        if (! $persisted) {
            Log::critical('SLOT_QUARANTINE_PERSISTENCE_FAILED', [
                'slot_id'          => $slotId,
                'clinic_id'        => $clinicId,
                'doctor_id'        => $doctorId,
                'appointment_date' => $appointmentDate,
                'time_slot'        => $timeSlot,
                'stored_count'     => $storedCount,
                'actual_occupied'  => $actualOccupied,
                'reason'           => $reason,
                'error'            => 'Zero rows affected when persisting quarantine (slot not found or unpersisted)',
                'detected_at'      => Carbon::now('Africa/Algiers')->toIso8601String(),
            ]);

            return false;
        }

        if ($slotOrId instanceof AppointmentSlot) {
            $slotOrId->is_quarantined = true;
            $slotOrId->quarantine_reason = $reason;
        }

        Log::critical('SLOT_COUNTER_DRIFT_QUARANTINED', [
            'slot_id'          => $slotId,
            'clinic_id'        => $clinicId,
            'doctor_id'        => $doctorId,
            'appointment_date' => $appointmentDate,
            'time_slot'        => $timeSlot,
            'stored_count'     => $storedCount,
            'actual_occupied'  => $actualOccupied,
            'reason'           => $reason,
            'detected_at'      => Carbon::now('Africa/Algiers')->toIso8601String(),
        ]);

        return true;
    }

    /**
     * Create and dispatch an in-app notification record through the official outbox pipeline.
     */
    protected function createInAppNotification(
        Appointment $appointment,
        string $template,
        string $idempotencyKey,
        array $payloadData
    ): ?NotificationOutbox {
        if (NotificationOutbox::where('idempotency_key', $idempotencyKey)->exists()) {
            return null;
        }

        $recipientPhone = $appointment->patient_phone
            ?? $appointment->patient?->phone
            ?? $appointment->patient?->user?->phone;
        $recipientPhone = $recipientPhone !== null ? trim((string) $recipientPhone) : '';

        $outbox = NotificationOutbox::create([
            'id'              => (string) Str::uuid(),
            'appointment_id'  => $appointment->id,
            'recipient_phone' => $recipientPhone,
            'recipient_type'  => 'patient',
            'channel'         => 'in_app',
            'template'        => $template,
            'payload'         => $payloadData,
            'idempotency_key' => $idempotencyKey,
            'status'          => NotificationOutbox::STATUS_PENDING,
            'retry_count'     => 0,
        ]);

        $this->notificationOutboxService->processRecord($outbox);

        return $outbox;
    }
}

