<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientResource extends JsonResource
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
            $clinicId = $user->clinicAssistant?->clinic_id;
            $canViewContacts = $clinicId && $user->hasClinicAccess('patient.view_contacts', $clinicId);
        }

        return [
            'id' => $this->id,
            'mrn' => $this->mrn,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'gender' => $this->gender,
            'date_of_birth' => $this->date_of_birth?->format('Y-m-d'),
            'blood_group' => $this->blood_group,
            'phone' => $canViewContacts ? $this->phone : null,
            'email' => $canViewContacts ? $this->email : null,
            'national_id' => $this->national_id,
            'address' => $this->address,
            'wilaya' => $this->wilaya,
            'is_active' => (bool) $this->is_active,
            'emergency_contacts' => EmergencyContactResource::collection($this->whenLoaded('emergencyContacts')),
            'allergies' => PatientAllergyResource::collection($this->whenLoaded('allergies')),
            'chronic_conditions' => PatientChronicConditionResource::collection($this->whenLoaded('chronicConditions')),
            'current_medications' => PatientCurrentMedicationResource::collection($this->whenLoaded('currentMedications')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
