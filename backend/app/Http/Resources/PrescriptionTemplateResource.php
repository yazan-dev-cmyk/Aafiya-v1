<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrescriptionTemplateResource extends JsonResource
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
            'doctor_id' => $this->doctor_id,
            'clinic_id' => $this->clinic_id,
            'template_name' => $this->template_name,
            'items_json' => $this->items_json,
            'is_shared' => (bool) $this->is_shared,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
