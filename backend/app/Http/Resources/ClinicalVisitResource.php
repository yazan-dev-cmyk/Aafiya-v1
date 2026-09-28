<?php

namespace App\Http\Resources;

use App\Services\ClinicalVisitService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClinicalVisitResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $privacyService = app(ClinicalVisitService::class);
        $privacyLevel = $user ? $privacyService->getPrivacyLevel($this->resource, $user) : 'forbidden';

        $canViewClinicalContent = ($privacyLevel === 'full');
        $canViewIntakeVitals = in_array($privacyLevel, ['full', 'intake_only'], true);

        return [
            'id' => $this->id,
            'visit_reference' => $this->visit_reference,
            'visit_date' => $this->visit_date?->format('Y-m-d'),
            'status' => $this->status,
            'is_finalized' => $this->isFinalized(),
            'finalized_at' => $this->finalized_at?->toISOString(),
            'finalized_by' => $this->finalizedBy?->name,
            'privacy_level' => $privacyLevel,
            'patient' => [
                'id' => $this->patient_id,
                'name' => $this->patient?->full_name,
                'mrn' => $this->patient?->mrn,
                'phone' => $this->patient?->phone,
                'gender' => $this->patient?->gender,
                'blood_group' => $this->patient?->blood_group,
            ],
            'doctor' => [
                'id' => $this->doctor_id,
                'name' => $this->doctor?->user?->name,
                'specialty' => $this->doctor?->specialty,
            ],
            'clinic' => [
                'id' => $this->clinic_id,
                'name' => $this->clinic?->name,
            ],
            'appointment' => $this->appointment_id ? [
                'id' => $this->appointment_id,
                'booking_reference' => $this->appointment?->booking_reference,
                'time_slot' => $this->appointment?->time_slot,
            ] : null,
            // Clinical & Confidential Sections (Masked based on P4 Privacy Wall)
            'vital_signs' => $canViewIntakeVitals ? $this->vital_signs_json : null,
            'chief_complaint' => $canViewClinicalContent ? $this->chief_complaint : null,
            'physical_examination' => $canViewClinicalContent ? $this->physical_examination : null,
            'diagnosis' => $canViewClinicalContent ? $this->diagnosis : null,
            'clinical_notes' => $canViewClinicalContent ? $this->clinical_notes : null,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
