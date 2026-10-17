<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VacationAppointmentRescheduleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $canViewContacts = true;
        if ($user && $user->hasRole('doctor_assistant')) {
            $clinicId = $this->clinic_id ?? $user->clinicAssistant?->clinic_id;
            $canViewContacts = $clinicId && $user->hasClinicAccess('patient.view_contacts', (string) $clinicId);
        }

        $orig = $this->originalAppointment;
        $rawPhone = $orig?->patient_phone ?: $orig?->patient?->phone;
        $patientPhone = $canViewContacts ? $rawPhone : null;

        return [
            'id' => $this->id,
            'doctor_vacation_id' => $this->doctor_vacation_id,
            'clinic_id' => $this->clinic_id,
            'status' => $this->status,
            'failure_reason' => $this->failure_reason,
            'resolved_at' => $this->resolved_at?->toISOString(),
            'resolved_by_id' => $this->resolved_by_id,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'original_appointment' => $orig ? [
                'id' => $orig->id,
                'booking_reference' => $orig->booking_reference,
                'appointment_date' => $orig->appointment_date?->format('Y-m-d'),
                'time_slot' => $orig->time_slot,
                'status' => $orig->status,
                'patient_name' => $orig->patient_name ?: ($orig->patient ? ($orig->patient->first_name . ' ' . $orig->patient->last_name) : null),
                'patient_phone' => $patientPhone,
                'patient_mrn' => $orig->patient_mrn ?: $orig->patient?->mrn,
                'doctor' => [
                    'id' => $orig->doctor_id,
                    'name' => $orig->doctor?->user?->name,
                    'specialty' => $orig->doctor?->specialty,
                ],
            ] : null,
            'replacement_appointment' => $this->replacementAppointment ? [
                'id' => $this->replacementAppointment->id,
                'booking_reference' => $this->replacementAppointment->booking_reference,
                'appointment_date' => $this->replacementAppointment->appointment_date?->format('Y-m-d'),
                'time_slot' => $this->replacementAppointment->time_slot,
                'status' => $this->replacementAppointment->status,
            ] : null,
            'vacation' => $this->vacation ? [
                'id' => $this->vacation->id,
                'vacation_start' => $this->vacation->vacation_start?->format('Y-m-d'),
                'vacation_end' => $this->vacation->vacation_end?->format('Y-m-d'),
                'status' => $this->vacation->status,
                'reason' => $this->vacation->reason,
            ] : null,
        ];
    }
}
