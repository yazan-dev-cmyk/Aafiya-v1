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
            'specialty_id' => $this->specialty_id,
            'medical_specialty' => ($this->medicalSpecialty ?? null) ? [
                'id' => (int) $this->medicalSpecialty->id,
                'code' => (string) $this->medicalSpecialty->code,
                'name_ar' => (string) $this->medicalSpecialty->name_ar,
                'name_fr' => (string) $this->medicalSpecialty->name_fr,
                'name_en' => (string) $this->medicalSpecialty->name_en,
            ] : null,
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
                        'wilaya_id' => $clinic->wilaya_id,
                        'commune_id' => $clinic->commune_id,
                        'commune' => ($clinic->relationLoaded('commune') && $clinic->commune) ? [
                            'code' => $clinic->commune->code,
                            'name_ar' => $clinic->commune->name_ar,
                            'name_fr' => $clinic->commune->name_fr,
                        ] : null,
                        'address' => $clinic->address,
                        'latitude' => $clinic->latitude !== null ? (float) $clinic->latitude : null,
                        'longitude' => $clinic->longitude !== null ? (float) $clinic->longitude : null,
                        'google_maps_link' => $clinic->google_maps_link,
                        'phone' => $clinic->phone,
                        'position' => $clinic->pivot?->position,
                    ]);
            }),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
