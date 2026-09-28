<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingPackageResource extends JsonResource
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
            'package_code' => $this->package_code,
            'name' => $this->name,
            'quota_units' => (int) $this->quota_units,
            'price_dzd' => (float) $this->price_dzd,
            'description' => $this->description,
            'is_active' => (bool) $this->is_active,
        ];
    }
}
