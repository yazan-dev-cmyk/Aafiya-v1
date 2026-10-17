<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DoctorVacationResource extends JsonResource
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
            'vacation_start' => $this->vacation_start?->format('Y-m-d') ?? (string) $this->vacation_start,
            'vacation_end' => $this->vacation_end?->format('Y-m-d') ?? (string) $this->vacation_end,
            'status' => $this->status,
            'reason' => $this->reason,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'clinics' => $this->vacationClinics->map(function ($vacationClinic) {
                return [
                    'id' => $vacationClinic->clinic_id,
                    'name' => $vacationClinic->clinic?->name,
                    'wilaya' => $vacationClinic->clinic?->wilaya,
                ];
            }),
        ];
    }
}
