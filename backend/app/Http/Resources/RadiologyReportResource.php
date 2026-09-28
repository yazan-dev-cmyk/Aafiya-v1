<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RadiologyReportResource extends JsonResource
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
            'diagnostic_order_id' => $this->diagnostic_order_id,
            'modality' => $this->modality,
            'study_instance_uid' => $this->study_instance_uid,
            'image_urls' => $this->image_urls_json,
            'findings' => $this->findings,
            'impression' => $this->impression,
            'recommendations' => $this->recommendations,
            'status' => $this->status,
            'is_finalized' => $this->isFinalized(),
            'reported_by' => $this->reporter?->name,
            'reported_at' => $this->reported_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
