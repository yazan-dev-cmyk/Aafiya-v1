<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiagnosticStaffResource extends JsonResource
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
            'diagnostic_center_id' => $this->diagnostic_center_id,
            'user' => [
                'id' => $this->user_id,
                'name' => $this->user?->name,
                'email' => $this->user?->email,
                'phone' => $this->user?->phone,
            ],
            'role_type' => $this->role_type,
            'is_active' => (bool) $this->is_active,
            'delegated_permissions' => $this->getDelegatedPermissions(),
            'permissions' => $this->getDelegatedPermissions(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
