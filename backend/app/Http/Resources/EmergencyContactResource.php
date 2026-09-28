<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmergencyContactResource extends JsonResource
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
            'patient_id' => $this->patient_id,
            'name' => $this->name,
            'relationship' => $this->relationship,
            'phone' => $this->phone,
            'is_primary' => (bool) $this->is_primary,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
