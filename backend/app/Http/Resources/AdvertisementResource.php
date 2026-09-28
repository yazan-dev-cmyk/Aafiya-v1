<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdvertisementResource extends JsonResource
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
            'title' => $this->title,
            'content' => $this->content,
            'banner_image_url' => $this->banner_image_url,
            'target_url' => $this->target_url,
            'placement' => $this->placement,
            'target_role' => $this->target_role,
            'target_specialty' => $this->target_specialty,
            'target_wilaya' => $this->target_wilaya,
            'is_welcome_offer' => (bool) $this->is_welcome_offer,
            'status' => $this->status,
            'is_active' => $this->isActive(),
            'rejection_reason' => $this->rejection_reason,
            'start_date' => $this->start_date?->format('Y-m-d'),
            'end_date' => $this->end_date?->format('Y-m-d'),
            'impressions_count' => $this->impressions_count,
            'clicks_count' => $this->clicks_count,
            'clinic' => $this->clinic_id ? [
                'id' => $this->clinic_id,
                'name' => $this->clinic?->name,
            ] : null,
            'doctor' => $this->doctor_id ? [
                'id' => $this->doctor_id,
                'name' => $this->doctor?->user?->name,
                'specialty' => $this->doctor?->specialty,
            ] : null,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
