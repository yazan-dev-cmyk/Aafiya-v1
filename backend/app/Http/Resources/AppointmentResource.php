<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppointmentResource extends JsonResource
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
            $canViewContacts = $clinicId && $user->hasClinicAccess('patient.view_contacts', $clinicId);
        }

        $rawPhone = $this->patient_phone ?: $this->patient?->phone;
        $patientPhone = $canViewContacts ? $rawPhone : null;

        return [
            'id' => $this->id,
            'booking_reference' => $this->booking_reference,
            'secure_token' => $this->secure_token,
            'clinic' => [
                'id' => $this->clinic_id,
                'name' => $this->clinic?->name,
                'phone' => $this->clinic?->phone,
                'wilaya' => $this->clinic?->wilaya,
            ],
            'doctor' => [
                'id' => $this->doctor_id,
                'name' => $this->doctor?->user?->name,
                'specialty' => $this->doctor?->specialty,
            ],
            'patient' => [
                'id' => $this->patient_id,
                'name' => $this->patient_name ?: ($this->patient ? ($this->patient->first_name . ' ' . $this->patient->last_name) : null),
                'phone' => $patientPhone,
                'mrn' => $this->patient_mrn ?: $this->patient?->mrn,
                'national_id' => $this->patient_national_id ?: $this->patient?->national_id,
            ],
            'patient_name' => $this->patient_name ?: ($this->patient ? ($this->patient->first_name . ' ' . $this->patient->last_name) : null),
            'patient_phone' => $patientPhone,
            'patient_mrn' => $this->patient_mrn ?: $this->patient?->mrn,
            'patient_national_id' => $this->patient_national_id ?: $this->patient?->national_id,
            'booking_center' => $this->booking_center_id ? [
                'id' => $this->booking_center_id,
                'name' => $this->bookingCenter?->name,
            ] : null,
            'creator_type' => $this->creator_type,
            'appointment_date' => $this->appointment_date?->format('Y-m-d'),
            'time_slot' => $this->time_slot,
            'status' => $this->status,
            'rescheduled_from_id' => $this->rescheduled_from_id,
            'notes' => $this->notes,
            'confirmed_at' => $this->confirmed_at?->toISOString(),
            'confirmed_by' => $this->confirmer?->name,
            'checked_in_at' => $this->checked_in_at?->toISOString(),
            'checked_in_by' => $this->checkedInBy?->name,
            'status_history' => $this->whenLoaded('statusHistory', function () {
                return $this->statusHistory->map(fn ($h) => [
                    'from_status' => $h->from_status,
                    'to_status' => $h->to_status,
                    'changed_by' => $h->changer?->name,
                    'reason' => $h->reason,
                    'created_at' => $h->created_at?->toISOString(),
                ]);
            }),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
