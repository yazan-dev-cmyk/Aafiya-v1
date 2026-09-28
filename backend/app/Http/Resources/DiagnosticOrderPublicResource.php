<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiagnosticOrderPublicResource extends JsonResource
{
    /**
     * Transform the resource into an array with strict public data minimization, null-safety & privacy boundaries.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $isFinalized = $this->status === 'finalized';

        return [
            'order_reference' => $this->order_reference,
            'order_type' => $this->order_type,
            'clinical_indication' => $this->clinical_indication,
            'priority' => $this->priority,
            'status' => $this->status,
            'is_finalized' => $isFinalized,
            'ordered_at' => $this->ordered_at?->toISOString(),
            'privacy_notice' => $isFinalized ? null : 'النتائج الطبية محجوبة حتى الاعتماد الرسمي من مدير المركز الطبي.',
            'patient' => $this->patient ? [
                'name' => $this->patient->full_name,
                'mrn' => $this->patient->mrn,
                'gender' => $this->patient->gender,
            ] : null,
            'doctor' => $this->doctor ? [
                'name' => $this->doctor->user?->name,
                'specialty' => $this->doctor->specialty,
            ] : null,
            'clinic' => $this->clinic ? [
                'name' => $this->clinic->name,
                'wilaya' => $this->clinic->wilaya,
            ] : null,
            'diagnostic_center' => $this->diagnosticCenter ? [
                'name' => $this->diagnosticCenter->name,
                'type' => $this->diagnosticCenter->type,
                'license_number' => $this->diagnosticCenter->license_number,
            ] : null,
            'items' => ($this->items ?? collect())->map(function ($item) use ($isFinalized) {
                return [
                    'test_name' => $item->test_name,
                    'test_code' => $item->test_code,
                    'status' => $item->status,
                    'is_finalized' => $item->status === 'finalized',
                    'result_value' => $isFinalized ? $item->result_value : null,
                    'reference_range' => $isFinalized ? $item->reference_range : null,
                    'unit' => $isFinalized ? $item->unit : null,
                    'interpretation' => $isFinalized ? $item->interpretation : null,
                    'notes' => $isFinalized ? $item->notes : null,
                ];
            })->values(),
            'radiology_report' => $this->radiologyReport ? [
                'modality' => $this->radiologyReport->modality,
                'status' => $this->radiologyReport->status,
                'is_finalized' => $this->radiologyReport->status === 'finalized',
                'findings' => $isFinalized ? $this->radiologyReport->findings : null,
                'impression' => $isFinalized ? $this->radiologyReport->impression : null,
                'recommendations' => $isFinalized ? $this->radiologyReport->recommendations : null,
                'reported_by' => $isFinalized ? $this->radiologyReport->reporter?->name : null,
                'reported_at' => $isFinalized ? $this->radiologyReport->reported_at?->toISOString() : null,
            ] : null,
        ];
    }
}
