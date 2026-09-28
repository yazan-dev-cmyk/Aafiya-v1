<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiagnosticOrderResource extends JsonResource
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
            'order_reference' => $this->order_reference,
            'secure_token' => $this->secure_token,
            'order_type' => $this->order_type,
            'clinical_indication' => $this->clinical_indication,
            'priority' => $this->priority,
            'status' => $this->status,
            'is_finalized' => $this->isFinalized(),
            'ordered_at' => $this->ordered_at?->toISOString(),
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
            'clinical_visit_id' => $this->clinical_visit_id,
            'diagnostic_center' => $this->diagnostic_center_id ? [
                'id' => $this->diagnostic_center_id,
                'name' => $this->diagnosticCenter?->name,
                'type' => $this->diagnosticCenter?->type,
                'phone' => $this->diagnosticCenter?->phone,
            ] : null,
            'items' => DiagnosticOrderItemResource::collection($this->whenLoaded('items')),
            'samples' => LaboratorySampleResource::collection($this->whenLoaded('samples')),
            'radiology_report' => new RadiologyReportResource($this->whenLoaded('radiologyReport')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
