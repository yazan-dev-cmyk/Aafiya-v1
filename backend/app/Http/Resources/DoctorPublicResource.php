<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DoctorPublicResource extends JsonResource
{
    /**
     * Transform the resource into an array with only public clinical information.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->user?->name,
            'specialty' => $this->specialty,
            'bio' => $this->bio,
            'is_verified' => (bool) $this->is_verified,
            'clinics' => $this->whenLoaded('clinics', function () {
                return $this->clinics
                    ->filter(fn ($clinic) => (bool) ($clinic->pivot?->is_active ?? true) && (bool) ($clinic->is_active ?? true))
                    ->values()
                    ->map(fn ($clinic) => [
                        'id' => $clinic->id,
                        'name' => $clinic->name,
                        'wilaya' => $clinic->wilaya,
                        'address' => $clinic->address,
                        'phone' => $clinic->phone,
                        'position' => $clinic->pivot?->position,
                    ]);
            }),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
