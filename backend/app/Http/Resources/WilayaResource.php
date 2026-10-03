<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WilayaResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'code'          => (string) $this->code,
            'name_ar'       => (string) $this->name_ar,
            'name_fr'       => (string) $this->name_fr,
            'name_en'       => (string) $this->name_en,
            'is_active'     => (bool) $this->is_active,
            'display_order' => (int) $this->display_order,
        ];
    }
}
