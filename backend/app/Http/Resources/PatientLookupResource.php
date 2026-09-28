<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientLookupResource extends JsonResource
{
    /**
     * Transform the resource into a sanitized identification-only array.
     * Strictly omits clinical data, emergency contacts, and national_id.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'mrn'           => $this->mrn,
            'first_name'    => $this->first_name,
            'last_name'     => $this->last_name,
            'full_name'     => $this->full_name,
            'gender'        => $this->gender,
            'date_of_birth' => $this->date_of_birth?->format('Y-m-d'),
            'phone'         => $this->phone,
            'email'         => $this->email,
            'wilaya'        => $this->wilaya,
            'address'       => $this->address,
            'is_active'     => (bool) $this->is_active,
            'created_at'    => $this->created_at?->toISOString(),
        ];
    }
}
