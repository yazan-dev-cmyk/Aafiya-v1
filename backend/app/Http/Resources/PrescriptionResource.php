<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrescriptionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'prescription_reference' => $this->prescription_reference,
            'secure_token' => $this->secure_token,
            'qr_verification_url' => url("/v/{$this->secure_token}"),
            'patient' => [
                'id' => $this->patient_id,
                'name' => $this->patient?->full_name,
                'mrn' => $this->patient?->mrn,
                'phone' => $this->patient?->phone,
            ],
            'doctor' => [
                'id' => $this->doctor_id,
                'name' => $this->doctor?->user?->name,
                'specialty' => $this->doctor?->specialty,
            ],
            'clinic' => [
                'id' => $this->clinic_id,
                'name' => $this->clinic?->name,
                'phone' => $this->clinic?->phone,
            ],
            'clinical_visit_id' => $this->clinical_visit_id,
            'issue_date' => $this->issue_date?->format('Y-m-d'),
            'expiry_date' => $this->expiry_date?->format('Y-m-d'),
            'status' => $this->status,
            'is_valid' => $this->isValid(),
            'notes' => $this->notes,
            'items' => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'medication_name' => $item->medication_name,
                'dosage' => $item->dosage,
                'frequency' => $item->frequency,
                'duration' => $item->duration,
                'instructions' => $item->instructions,
            ]),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
