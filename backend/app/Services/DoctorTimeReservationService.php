<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\DoctorTimeReservation;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;

class DoctorTimeReservationService
{
    /**
     * Atomically acquire or validate ownership of a doctor's date/time slot for a clinic.
     * Enforces Level 1 Canonical Lock and cross-clinic exclusivity.
     *
     * @throws ValidationException if the reservation is already owned by another clinic.
     * @throws QueryException for any unexpected database error other than 1062 race.
     */
    public function acquireOrValidate(string $clinicId, string $doctorId, string $date, string $slot): DoctorTimeReservation
    {
        // 1. Attempt deterministic row lock if reservation already exists
        /** @var DoctorTimeReservation|null $existing */
        $existing = DoctorTimeReservation::where('doctor_id', $doctorId)
            ->where('appointment_date', $date)
            ->where('time_slot', $slot)
            ->lockForUpdate()
            ->first();

        if ($existing) {
            if ($existing->clinic_id !== $clinicId) {
                throw ValidationException::withMessages([
                    'doctor_id' => ['doctor_exclusive_clinic_conflict'],
                ])->errorBag('DOCTOR_EXCLUSIVE_CLINIC_CONFLICT');
            }

            return $existing;
        }

        // 2. Reservation does not exist: Attempt atomic insert to claim time ownership
        try {
            return DoctorTimeReservation::create([
                'doctor_id' => $doctorId,
                'clinic_id' => $clinicId,
                'appointment_date' => $date,
                'time_slot' => $slot,
            ]);
        } catch (QueryException $e) {
            // MySQL error 1062 = ER_DUP_ENTRY (concurrent insert race on uniq_doctor_date_slot)
            if (isset($e->errorInfo[1]) && (int) $e->errorInfo[1] === 1062) {
                // Re-read with row lock to inspect the winning transaction's ownership
                $lockedExisting = DoctorTimeReservation::where('doctor_id', $doctorId)
                    ->where('appointment_date', $date)
                    ->where('time_slot', $slot)
                    ->lockForUpdate()
                    ->first();

                if ($lockedExisting && $lockedExisting->clinic_id !== $clinicId) {
                    throw ValidationException::withMessages([
                        'doctor_id' => ['doctor_exclusive_clinic_conflict'],
                    ])->errorBag('DOCTOR_EXCLUSIVE_CLINIC_CONFLICT');
                }

                if ($lockedExisting) {
                    return $lockedExisting;
                }
            }

            // Re-throw any other database or constraint exception without suppression
            throw $e;
        }
    }

    /**
     * Lock an existing reservation for update if it exists.
     */
    public function lockReservation(string $doctorId, string $date, string $slot): ?DoctorTimeReservation
    {
        return DoctorTimeReservation::where('doctor_id', $doctorId)
            ->where('appointment_date', $date)
            ->where('time_slot', $slot)
            ->lockForUpdate()
            ->first();
    }

    /**
     * Conditionally release a doctor's time reservation if no remaining occupying appointments exist.
     * Must be called while holding appropriate locks or within the canonical transaction.
     *
     * @param string|null $excludingAppointmentId Appointment currently transitioning to non-occupying.
     */
    public function releaseIfEmpty(string $clinicId, string $doctorId, string $date, string $slot, ?string $excludingAppointmentId = null): void
    {
        $query = Appointment::where('clinic_id', $clinicId)
            ->where('doctor_id', $doctorId)
            ->where('appointment_date', $date)
            ->where('time_slot', $slot)
            ->whereIn('status', Appointment::OCCUPYING_STATUSES);

        if ($excludingAppointmentId !== null) {
            $query->where('id', '!=', $excludingAppointmentId);
        }

        $remainingOccupyingCount = $query->count();

        if ($remainingOccupyingCount === 0) {
            DoctorTimeReservation::where('doctor_id', $doctorId)
                ->where('appointment_date', $date)
                ->where('time_slot', $slot)
                ->where('clinic_id', $clinicId)
                ->delete();
        }
    }
}
