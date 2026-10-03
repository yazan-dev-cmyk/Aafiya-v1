<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClinicResource extends JsonResource
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
            'address' => $this->address,
            'wilaya' => $this->wilaya,
            'phone' => $this->phone,
            'max_patients_per_slot' => $this->max_patients_per_slot,
            'slot_duration_min' => $this->slot_duration_min,
            'is_active' => (bool) $this->is_active,
            'director' => $this->whenLoaded('director', function () {
                return $this->director ? [
                    'id' => $this->director->id,
                    'name' => $this->director->user?->name,
                    'specialty' => $this->director->specialty,
                    'specialty_id' => $this->director->specialty_id,
                    'medical_specialty' => $this->director->relationLoaded('medicalSpecialty') && $this->director->medicalSpecialty ? [
                        'id' => $this->director->medicalSpecialty->id,
                        'code' => $this->director->medicalSpecialty->code,
                        'name_ar' => $this->director->medicalSpecialty->name_ar,
                        'name_fr' => $this->director->medicalSpecialty->name_fr,
                        'name_en' => $this->director->medicalSpecialty->name_en,
                    ] : null,
                ] : null;
            }),
            'doctors' => $this->whenLoaded('doctors', function () {
                return $this->doctors->map(fn ($doc) => [
                    'id' => $doc->id,
                    'user_id' => $doc->user_id,
                    'name' => $doc->user?->name,
                    'email' => $doc->user?->email,
                    'phone' => $doc->user?->phone,
                    'specialty' => $doc->specialty,
                    'specialty_id' => $doc->specialty_id,
                    'medical_specialty' => $doc->relationLoaded('medicalSpecialty') && $doc->medicalSpecialty ? [
                        'id' => $doc->medicalSpecialty->id,
                        'code' => $doc->medicalSpecialty->code,
                        'name_ar' => $doc->medicalSpecialty->name_ar,
                        'name_fr' => $doc->medicalSpecialty->name_fr,
                        'name_en' => $doc->medicalSpecialty->name_en,
                    ] : null,
                    'license_number' => $doc->license_number,
                    'position' => $doc->pivot?->position ?? 'doctor',
                    'is_primary' => (bool) ($doc->pivot?->is_primary ?? false),
                    'is_active' => (bool) ($doc->pivot?->is_active ?? true),
                    'joined_at' => $this->formatDateTime($doc->pivot?->joined_at ?? $doc->pivot?->created_at),
                ]);
            }),
            'assistants' => $this->whenLoaded('assistants', function () {
                return $this->assistants->map(fn ($ast) => [
                    'id' => $ast->id,
                    'user_id' => $ast->user_id,
                    'name' => $ast->user?->name,
                    'email' => $ast->user?->email,
                    'phone' => $ast->user?->phone,
                    'position' => 'assistant',
                    'is_active' => (bool) $ast->is_active,
                    'joined_at' => $this->formatDateTime($ast->created_at),
                    'delegated_permissions' => $ast->getDelegatedPermissions(),
                ]);
            }),
            'created_at' => $this->formatDateTime($this->created_at),
            'updated_at' => $this->formatDateTime($this->updated_at),
        ];
    }

    /**
     * Safely format a Carbon instance, DateTime, or date string to ISO-8601 string.
     */
    protected function formatDateTime(mixed $date): ?string
    {
        if (! $date) {
            return null;
        }

        if ($date instanceof \Carbon\CarbonInterface) {
            return $date->toISOString();
        }

        try {
            return \Illuminate\Support\Carbon::parse($date)->toISOString();
        } catch (\Throwable) {
            return (string) $date;
        }
    }
}
