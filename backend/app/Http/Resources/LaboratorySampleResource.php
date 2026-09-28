<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LaboratorySampleResource extends JsonResource
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
            'sample_barcode' => $this->sample_barcode,
            'sample_type' => $this->sample_type,
            'status' => $this->status,
            'collected_at' => $this->collected_at?->toISOString(),
            'collected_by' => $this->collector?->name,
            'received_at' => $this->received_at?->toISOString(),
            'received_by' => $this->receiver?->name,
            'rejection_reason' => $this->rejection_reason,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
