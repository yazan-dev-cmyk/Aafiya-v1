<?php

namespace App\Http\Resources;

use App\Models\BookingCenter;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingCenterResource extends JsonResource
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
            'commercial_register' => $this->commercial_register,
            'license_number' => $this->license_number,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'wilaya' => $this->wilaya,
            'wilaya_id' => $this->wilaya_id,
            'commune_id' => $this->commune_id,
            'commune' => ($this->relationLoaded('commune') && $this->commune) ? [
                'code' => $this->commune->code,
                'name_ar' => $this->commune->name_ar,
                'name_fr' => $this->commune->name_fr,
            ] : null,
            'latitude' => $this->latitude !== null ? (float) $this->latitude : null,
            'longitude' => $this->longitude !== null ? (float) $this->longitude : null,
            'google_maps_link' => $this->google_maps_link,
            'quota_balance' => (int) $this->quota_balance,
            'verification_status' => $this->verification_status ?? BookingCenter::STATUS_PENDING,
            'verified_at' => $this->verified_at?->toISOString(),
            'reviewed_by' => $this->reviewedBy ? [
                'id' => $this->reviewedBy->id,
                'name' => $this->reviewedBy->name,
            ] : null,
            'rejection_reason' => $this->rejection_reason,
            'is_active' => (bool) $this->is_active,
            'manager' => [
                'id' => $this->user_id,
                'name' => $this->user?->name,
                'email' => $this->user?->email,
            ],
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
