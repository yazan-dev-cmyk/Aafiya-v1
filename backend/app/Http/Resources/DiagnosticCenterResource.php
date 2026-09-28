<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiagnosticCenterResource extends JsonResource
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
            'name' => $this->name,
            'type' => $this->type,
            'license_number' => $this->license_number,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'wilaya' => $this->wilaya,
            'is_active' => (bool) $this->is_active,
            'manager' => [
                'id' => $this->user_id,
                'name' => $this->manager?->name,
                'email' => $this->manager?->email,
            ],
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
