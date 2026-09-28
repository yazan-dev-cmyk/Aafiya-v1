<?php

namespace App\Policies;

use App\Models\Patient;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PatientPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view the patient's record.
     */
    public function view(User $user, Patient $patient, ?string $activeClinicId = null): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->hasRole('patient_registered') || $user->hasRole('patient_guest')) {
            return $patient->user_id === $user->id;
        }

        if ($user->hasRole('doctor')) {
            if (! $user->doctor || $user->doctor->is_verified === false) {
                return false;
            }

            if (! $activeClinicId) {
                return false;
            }

            $doctorId = $user->doctor->id;
            $isDirector = $user->doctor->isDirectorOf($activeClinicId);

            if ($isDirector) {
                return $patient->appointments()->where('clinic_id', $activeClinicId)->exists()
                    || $patient->clinicalVisits()->where('clinic_id', $activeClinicId)->exists()
                    || $patient->prescriptions()->where('clinic_id', $activeClinicId)->exists()
                    || $patient->diagnosticOrders()->where('clinic_id', $activeClinicId)->exists();
            }

            // Employed doctor: Patient visibility is strictly constrained to records with doctor_id = auth_doctor
            return $patient->appointments()->where('clinic_id', $activeClinicId)->where('doctor_id', $doctorId)->exists()
                || $patient->clinicalVisits()->where('clinic_id', $activeClinicId)->where('doctor_id', $doctorId)->exists()
                || $patient->prescriptions()->where('clinic_id', $activeClinicId)->where('doctor_id', $doctorId)->exists()
                || $patient->diagnosticOrders()->where('clinic_id', $activeClinicId)->where('doctor_id', $doctorId)->exists();
        }

        if ($user->hasRole('doctor_assistant')) {
            $assistantClinicId = $user->clinicAssistant?->clinic_id;
            if (! $assistantClinicId) {
                return false;
            }

            return $patient->appointments()->where('clinic_id', $assistantClinicId)->exists()
                || $patient->clinicalVisits()->where('clinic_id', $assistantClinicId)->exists()
                || $patient->prescriptions()->where('clinic_id', $assistantClinicId)->exists()
                || $patient->diagnosticOrders()->where('clinic_id', $assistantClinicId)->exists();
        }

        if ($user->hasRole('booking_center') || $user->hasRole('booking_center_staff')) {
            $centerId = $user->bookingCenter?->id;
            if (! $centerId) {
                return false;
            }

            return $patient->appointments()->where('booking_center_id', $centerId)->exists();
        }

        return false;
    }

    /**
     * Determine whether the user can update the patient's demographics.
     */
    public function update(User $user, Patient $patient, ?string $activeClinicId = null): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->hasRole('patient_registered') || $user->hasRole('patient_guest')) {
            return $patient->user_id === $user->id;
        }

        if ($user->hasRole('booking_center') || $user->hasRole('booking_center_staff')) {
            return false;
        }

        return $this->view($user, $patient, $activeClinicId);
    }

    /**
     * Determine whether the user can add or remove medical record sub-resources (allergies, chronic conditions, medications, emergency contacts).
     */
    public function manageMedicalRecords(User $user, Patient $patient, ?string $activeClinicId = null): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->hasRole('patient_registered') || $user->hasRole('patient_guest') || $user->hasRole('booking_center') || $user->hasRole('booking_center_staff')) {
            return false;
        }

        return $this->view($user, $patient, $activeClinicId);
    }
}
