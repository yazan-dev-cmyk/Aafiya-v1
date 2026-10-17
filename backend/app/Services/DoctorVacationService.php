<?php

declare(strict_types=1);

namespace App\Services;

use App\Jobs\RescheduleVacationAppointmentsJob;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DoctorVacation;
use App\Models\DoctorVacationClinic;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DoctorVacationService
{
    /**
     * Register a new doctor vacation with immediate effectiveness (DEC-VAC-01).
     *
     * Invariants:
     * - Status is 'effective' immediately without Clinic Director approval or veto (DEC-VAC-01, DEC-AUTH-01).
     * - Clinic scope is snapshotted into doctor_vacation_clinics for affiliated clinics (DEC-VAC-04).
     * - RescheduleVacationAppointmentsJob is dispatched after transaction commits.
     */
    public function registerVacation(Doctor $doctor, array $data, User $actor): DoctorVacation
    {
        $this->authorizeVacationOwner($doctor, $actor);

        $startDate = Carbon::parse($data['vacation_start'])->format('Y-m-d');
        $endDate   = Carbon::parse($data['vacation_end'])->format('Y-m-d');

        if (strcmp($startDate, $endDate) > 0) {
            throw ValidationException::withMessages([
                'vacation_end' => ['تاريخ نهاية الإجازة يجب أن يكون مساوياً أو لاحقاً لتاريخ البداية.'],
            ]);
        }

        // Prevent overlapping effective vacations for the same doctor
        $overlapExists = DoctorVacation::where('doctor_id', $doctor->id)
            ->where('status', DoctorVacation::STATUS_EFFECTIVE)
            ->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('vacation_start', [$startDate, $endDate])
                    ->orWhereBetween('vacation_end', [$startDate, $endDate])
                    ->orWhere(function ($q) use ($startDate, $endDate) {
                        $q->where('vacation_start', '<=', $startDate)
                          ->where('vacation_end', '>=', $endDate);
                    });
            })
            ->exists();

        if ($overlapExists) {
            throw ValidationException::withMessages([
                'vacation_start' => ['توجد إجازة سارية أخرى مسجلة للطبيب تتداخل مع هذه الفترة الزمنية.'],
            ])->errorBag('DOCTOR_VACATION_OVERLAP');
        }

        // Snapshot doctor's currently affiliated clinics (DEC-VAC-04)
        $affiliatedClinicIds = $doctor->clinics()
            ->wherePivot('is_active', true)
            ->pluck('clinics.id')
            ->map(fn ($id) => (string) $id)
            ->all();

        // If clinic_ids filter passed explicitly, intersect with affiliated clinics
        if (! empty($data['clinic_ids']) && is_array($data['clinic_ids'])) {
            $affiliatedClinicIds = array_values(array_intersect($affiliatedClinicIds, $data['clinic_ids']));
        }

        /** @var DoctorVacation $vacation */
        $vacation = DB::transaction(function () use ($doctor, $startDate, $endDate, $data, $affiliatedClinicIds) {
            $vacationRecord = DoctorVacation::create([
                'id'             => (string) Str::uuid(),
                'doctor_id'      => $doctor->id,
                'vacation_start' => $startDate,
                'vacation_end'   => $endDate,
                'status'         => DoctorVacation::STATUS_EFFECTIVE,
                'reason'         => $data['reason'] ?? null,
                'notes'          => $data['notes'] ?? null,
            ]);

            // Persist clinic snapshots
            foreach ($affiliatedClinicIds as $clinicId) {
                DoctorVacationClinic::create([
                    'id'                 => (string) Str::uuid(),
                    'doctor_vacation_id' => $vacationRecord->id,
                    'clinic_id'          => $clinicId,
                ]);
            }

            return $vacationRecord;
        });

        // Dispatch boundary job after registration transaction commits (DEC-VAC-01)
        RescheduleVacationAppointmentsJob::dispatch($vacation->id);

        return $vacation->load('vacationClinics');
    }

    /**
     * Cancel an active vacation by transitioning status to 'cancelled'.
     * Physical deletion is strictly prohibited (DEC-VAC-05).
     */
    public function cancelVacation(DoctorVacation $vacation, User $actor): DoctorVacation
    {
        $doctor = $vacation->doctor ?: Doctor::findOrFail($vacation->doctor_id);
        $this->authorizeVacationOwner($doctor, $actor);

        if ($vacation->status === DoctorVacation::STATUS_CANCELLED) {
            return $vacation;
        }

        $vacation->update([
            'status' => DoctorVacation::STATUS_CANCELLED,
        ]);

        return $vacation;
    }

    /**
     * Check if a doctor is on an effective vacation for a specific clinic on a given date.
     * Enforces the snapshot rule (DEC-VAC-04): applies only if clinic_id is in the vacation's snapshot.
     */
    public function isDoctorOnVacation(string $doctorId, string $clinicId, string $date): bool
    {
        $formattedDate = Carbon::parse($date)->format('Y-m-d');

        return DoctorVacation::where('doctor_id', $doctorId)
            ->where('status', DoctorVacation::STATUS_EFFECTIVE)
            ->where('vacation_start', '<=', $formattedDate)
            ->where('vacation_end', '>=', $formattedDate)
            ->whereHas('vacationClinics', function ($q) use ($clinicId) {
                $q->where('clinic_id', $clinicId);
            })
            ->exists();
    }

    /**
     * Authorize that the actor is the doctor self or a global platform administrator.
     * Enforces DEC-AUTH-01: Director veto is strictly excluded.
     */
    protected function authorizeVacationOwner(Doctor $doctor, User $actor): void
    {
        if ($actor->hasRole('admin')) {
            return;
        }

        $isDoctorSelf = $actor->doctor && ((string) $actor->doctor->id === (string) $doctor->id);
        if ($isDoctorSelf) {
            return;
        }

        abort(403, 'غير مصرح: إدارة وتسجيل إجازات الطبيب محصورة في الطبيب نفسه (DEC-AUTH-01).');
    }
}
