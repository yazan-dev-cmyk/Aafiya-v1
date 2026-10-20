<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicOperatingHour;
use App\Models\Doctor;
use App\Models\DoctorDaySchedule;
use App\Models\DoctorWorkingSlot;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DoctorWorkingHoursService
{
    public const ALLOWED_WORKING_SLOTS = [
        '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00',
    ];

    public function __construct(
        protected ClinicOperatingHoursService $clinicOperatingHoursService
    ) {}

    /**
     * Retrieve weekly working hours and activation state for a doctor at a clinic.
     */
    public function getSchedule(string $clinicId, string $doctorId): array
    {
        $pivot = DB::table('doctor_clinic')
            ->where('clinic_id', $clinicId)
            ->where('doctor_id', $doctorId)
            ->first();

        if (! $pivot) {
            abort(404, 'الطبيب غير منتسب لهذه العيادة.');
        }

        $daySchedules = DoctorDaySchedule::with('slots')
            ->where('clinic_id', $clinicId)
            ->where('doctor_id', $doctorId)
            ->orderBy('day_of_week')
            ->get();

        $days = [];
        for ($d = 0; $d <= 6; $d++) {
            $dayRecord = $daySchedules->firstWhere('day_of_week', $d);
            $isClosed = $dayRecord ? (bool) $dayRecord->is_closed : true;
            $slots = [];

            if ($dayRecord && ! $isClosed) {
                $slots = $dayRecord->slots->pluck('time_slot')->sort()->values()->all();
            }

            $days[] = [
                'day_of_week' => $d,
                'is_closed' => $isClosed,
                'slots' => $slots,
            ];
        }

        return [
            'clinic_id' => $clinicId,
            'doctor_id' => $doctorId,
            'is_activated' => (bool) ($pivot->is_working_hours_activated ?? false),
            'activated_at' => $pivot->working_hours_activated_at ?? null,
            'schedule_version' => (int) ($pivot->schedule_version ?? 1),
            'days' => $days,
        ];
    }

    /**
     * Save weekly schedule draft before activation.
     */
    public function saveDraft(string $clinicId, string $doctorId, array $daysData, User $actor): array
    {
        $this->authorizeScheduleManager($clinicId, $doctorId, $actor);

        $pivot = DB::table('doctor_clinic')
            ->where('clinic_id', $clinicId)
            ->where('doctor_id', $doctorId)
            ->first();

        if (! $pivot) {
            abort(404, 'الطبيب غير منتسب لهذه العيادة.');
        }

        if ($pivot->is_working_hours_activated) {
            throw ValidationException::withMessages([
                'schedule' => ['ساعات العمل الأسبوعية مفعّلة وثابتة، ولا يمكن تعديلها في هذا الإصدار.'],
            ])->errorBag('SCHEDULE_LOCKED_ACTIVATED');
        }

        // Validate payload contains all 7 days
        $daysMap = collect($daysData)->keyBy('day_of_week');
        for ($d = 0; $d <= 6; $d++) {
            if (! $daysMap->has($d)) {
                throw ValidationException::withMessages([
                    'days' => ["اليوم رقم ({$d}) مفقود من جدول العمل الأسبوعي."],
                ]);
            }
        }

        // Detect conflicts with future occupying appointments
        $this->assertNoOccupyingAppointmentConflicts($clinicId, $doctorId, $daysData);

        DB::transaction(function () use ($clinicId, $doctorId, $daysData) {
            foreach ($daysData as $dayItem) {
                $dow = (int) $dayItem['day_of_week'];
                $isClosed = (bool) $dayItem['is_closed'];
                $submittedSlots = $isClosed ? [] : ($dayItem['slots'] ?? []);

                // Filter & validate slot boundaries
                foreach ($submittedSlots as $slot) {
                    if (! in_array($slot, self::ALLOWED_WORKING_SLOTS, true)) {
                        throw ValidationException::withMessages([
                            'slots' => ["الفترة الزمنية ({$slot}) غير صالحة. الفترات المسموحة تبدأ من 08:00 إلى 16:00."],
                        ]);
                    }
                }

                $daySchedule = DoctorDaySchedule::firstOrCreate(
                    [
                        'clinic_id' => $clinicId,
                        'doctor_id' => $doctorId,
                        'day_of_week' => $dow,
                    ],
                    [
                        'id' => (string) Str::uuid(),
                        'is_closed' => $isClosed,
                    ]
                );

                if ($daySchedule->is_closed !== $isClosed) {
                    $daySchedule->is_closed = $isClosed;
                    $daySchedule->save();
                }

                if ($isClosed) {
                    // Remove all slots for closed days
                    DoctorWorkingSlot::where('doctor_day_schedule_id', $daySchedule->id)->delete();
                } else {
                    $existingSlots = DoctorWorkingSlot::where('doctor_day_schedule_id', $daySchedule->id)
                        ->pluck('time_slot')
                        ->all();

                    $toDelete = array_diff($existingSlots, $submittedSlots);
                    $toAdd = array_diff($submittedSlots, $existingSlots);

                    if (! empty($toDelete)) {
                        DoctorWorkingSlot::where('doctor_day_schedule_id', $daySchedule->id)
                            ->whereIn('time_slot', $toDelete)
                            ->delete();
                    }

                    foreach ($toAdd as $slotTime) {
                        DoctorWorkingSlot::create([
                            'id' => (string) Str::uuid(),
                            'doctor_day_schedule_id' => $daySchedule->id,
                            'time_slot' => $slotTime,
                        ]);
                    }
                }
            }
        }, 3);

        return $this->getSchedule($clinicId, $doctorId);
    }

    /**
     * Atomically activate weekly schedule.
     */
    public function activateSchedule(string $clinicId, string $doctorId, User $actor): array
    {
        $this->authorizeScheduleManager($clinicId, $doctorId, $actor);

        return DB::transaction(function () use ($clinicId, $doctorId) {
            $pivot = DB::table('doctor_clinic')
                ->where('clinic_id', $clinicId)
                ->where('doctor_id', $doctorId)
                ->lockForUpdate()
                ->first();

            if (! $pivot) {
                abort(404, 'الطبيب غير منتسب لهذه العيادة.');
            }

            if ($pivot->is_working_hours_activated) {
                throw ValidationException::withMessages([
                    'schedule' => ['الجدول الأسبوعي مفعّل ومغلق بالفعل مسبقاً.'],
                ]);
            }

            // Verify full 7-day schedule exists
            $daySchedules = DoctorDaySchedule::with('slots')
                ->where('clinic_id', $clinicId)
                ->where('doctor_id', $doctorId)
                ->get();

            $distinctDays = $daySchedules->pluck('day_of_week')->unique()->all();
            if (count(array_intersect([0, 1, 2, 3, 4, 5, 6], $distinctDays)) !== 7) {
                throw ValidationException::withMessages([
                    'days' => ['لا يمكن تفعيل الجدول: يجب تهيئة جميع الأيام السبعة (0 إلى 6) صراحة قبل التفعيل.'],
                ]);
            }

            // Verify at least one working day is open with slots
            $openDays = $daySchedules->where('is_closed', false);
            if ($openDays->isEmpty()) {
                throw ValidationException::withMessages([
                    'days' => ['لا يمكن تفعيل جدول أسبوعي يحتوي على 7 أيام مغلقة بالكامل. يجب تحديد يوم عمل واحد على الأقل.'],
                ]);
            }

            // Verify open days have at least one slot
            foreach ($openDays as $openDay) {
                if ($openDay->slots->isEmpty()) {
                    throw ValidationException::withMessages([
                        'slots' => ["اليوم رقم ({$openDay->day_of_week}) مفتوح ولكنه لا يحتوي على أي فترات عمل محددة."],
                    ]);
                }
            }

            // Verify doctor slots containment within clinic operating hours
            $this->assertSlotsFitWithinClinicOperatingHours($clinicId, $openDays);

            // Commit atomic activation
            DB::table('doctor_clinic')
                ->where('clinic_id', $clinicId)
                ->where('doctor_id', $doctorId)
                ->update([
                    'is_working_hours_activated' => true,
                    'working_hours_activated_at' => now(),
                    'schedule_version' => ((int) ($pivot->schedule_version ?? 1)) + 1,
                    'updated_at' => now(),
                ]);

            return $this->getSchedule($clinicId, $doctorId);
        }, 3);
    }

    /**
     * Check if doctor's weekly working schedule is activated for a clinic.
     */
    public function isScheduleActivated(string $clinicId, string $doctorId): bool
    {
        return (bool) DB::table('doctor_clinic')
            ->where('clinic_id', $clinicId)
            ->where('doctor_id', $doctorId)
            ->value('is_working_hours_activated');
    }

    /**
     * Check if a specific slot is enabled on a given weekday.
     */
    public function isSlotAvailable(string $clinicId, string $doctorId, int $dayOfWeek, string $timeSlot): bool
    {
        $daySchedule = DoctorDaySchedule::where('clinic_id', $clinicId)
            ->where('doctor_id', $doctorId)
            ->where('day_of_week', $dayOfWeek)
            ->first();

        if (! $daySchedule || $daySchedule->is_closed) {
            return false;
        }

        return DoctorWorkingSlot::where('doctor_day_schedule_id', $daySchedule->id)
            ->where('time_slot', $timeSlot)
            ->exists();
    }

    /**
     * Authorize user as doctor self or clinic director.
     */
    protected function authorizeScheduleManager(string $clinicId, string $doctorId, User $actor): void
    {
        if ($actor->hasRole('admin')) {
            return;
        }

        $isDoctorSelf = $actor->doctor && ((string) $actor->doctor->id === (string) $doctorId);
        if ($isDoctorSelf) {
            return;
        }

        $clinic = Clinic::findOrFail($clinicId);
        $isDirector = $clinic->director_doctor_id && $actor->doctor && ((string) $actor->doctor->id === (string) $clinic->director_doctor_id);
        if ($isDirector) {
            return;
        }

        if ($actor->hasClinicAccess('clinic.manage_settings', $clinicId)) {
            return;
        }

        abort(403, 'غير مصرح: إدارة وتفعيل ساعات عمل الطبيب محصورة في الطبيب نفسه أو مدير العيادة.');
    }

    /**
     * Assert that removing working slots does not orphan future occupying appointments.
     */
    protected function assertNoOccupyingAppointmentConflicts(string $clinicId, string $doctorId, array $daysData): void
    {
        $futureAppointments = Appointment::query()
            ->where('clinic_id', $clinicId)
            ->where('doctor_id', $doctorId)
            ->where('appointment_date', '>=', now('Africa/Algiers')->toDateString())
            ->whereIn('status', Appointment::OCCUPYING_STATUSES)
            ->whereNull('deleted_at')
            ->get(['id', 'booking_reference', 'appointment_date', 'time_slot', 'status']);

        if ($futureAppointments->isEmpty()) {
            return;
        }

        $daysMap = collect($daysData)->keyBy('day_of_week');
        $conflicts = [];

        foreach ($futureAppointments as $appt) {
            $dow = (Carbon::parse($appt->appointment_date)->dayOfWeek + 1) % 7;
            $submittedDay = $daysMap->get($dow);

            if (! $submittedDay || $submittedDay['is_closed']) {
                $conflicts[] = [
                    'appointment_id' => $appt->id,
                    'booking_reference' => $appt->booking_reference,
                    'appointment_date' => (string) $appt->appointment_date,
                    'time_slot' => $appt->time_slot,
                    'status' => $appt->status,
                ];
                continue;
            }

            $submittedSlots = $submittedDay['slots'] ?? [];
            if (! in_array($appt->time_slot, $submittedSlots, true)) {
                $conflicts[] = [
                    'appointment_id' => $appt->id,
                    'booking_reference' => $appt->booking_reference,
                    'appointment_date' => (string) $appt->appointment_date,
                    'time_slot' => $appt->time_slot,
                    'status' => $appt->status,
                ];
            }
        }

        if (! empty($conflicts)) {
            throw ValidationException::withMessages([
                'schedule_conflict' => [
                    'لا يمكن تعديل ساعات العمل: توجد مواعيد مستقبلية قائمة في الفترات التي يُراد إغلاقها. يرجى معالجة المواعيد يدوياً أولاً.',
                ],
            ])->errorBag('SCHEDULE_CONTRACTION_CONFLICT');
        }
    }

    /**
     * Verify all enabled doctor slots fit within active clinic operating hours.
     */
    protected function assertSlotsFitWithinClinicOperatingHours(string $clinicId, $openDays): void
    {
        if (! $this->clinicOperatingHoursService->isClinicConfigured($clinicId)) {
            throw ValidationException::withMessages([
                'clinic_hours' => ['لا يمكن تفعيل جدول عمل الطبيب: ساعات تشغيل العيادة غير مهيأة بعد.'],
            ]);
        }

        $clinicHours = ClinicOperatingHour::where('clinic_id', $clinicId)
            ->where('is_closed', false)
            ->get();

        foreach ($openDays as $openDay) {
            $dow = $openDay->day_of_week;
            $clinicDayHours = $clinicHours->where('day_of_week', $dow);

            if ($clinicDayHours->isEmpty()) {
                throw ValidationException::withMessages([
                    'containment' => ["اليوم رقم ({$dow}) مغلق بالكامل في ساعات تشغيل العيادة، ولا يمكن تمكين فترات عمل للطبيب فيه."],
                ]);
            }

            foreach ($openDay->slots as $slot) {
                $slotStart = $slot->time_slot;
                $slotEnd = Carbon::parse($slotStart)->addHour()->format('H:i');

                $contained = false;
                foreach ($clinicDayHours as $period) {
                    if (strcmp($period->open_time, $slotStart) <= 0 && strcmp($period->close_time, $slotEnd) >= 0) {
                        $contained = true;
                        break;
                    }
                }

                if (! $contained) {
                    throw ValidationException::withMessages([
                        'containment' => ["فترة الطبيب ({$slotStart}) في اليوم ({$dow}) تقع خارج ساعات تشغيل العيادة المعتمدة."],
                    ]);
                }
            }
        }
    }
}
