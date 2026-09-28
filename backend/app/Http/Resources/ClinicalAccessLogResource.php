<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClinicalAccessLogResource extends JsonResource
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
            'actor' => [
                'id' => $this->actor_id,
                'name' => $this->actor?->name,
                'email' => $this->actor?->email,
                'role' => $this->actor_role,
                'position' => $this->actor_position,
            ],
            'patient' => [
                'id' => $this->patient_id,
                'name' => $this->patient?->full_name,
                'mrn' => $this->patient?->mrn,
            ],
            'resource_type' => $this->resource_type,
            'resource_id' => $this->resource_id,
            'action' => $this->action,
            'access_reason' => $this->access_reason,
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent,
            'request_id' => $this->request_id,
            'timestamp' => $this->created_at?->toISOString(),
        ];
    }
}
