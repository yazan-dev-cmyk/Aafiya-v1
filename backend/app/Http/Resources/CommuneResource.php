<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommuneResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $wilayaCode = null;
        if ($this->relationLoaded('wilaya') && $this->wilaya) {
            $wilayaCode = (string) $this->wilaya->code;
        } elseif (isset($this->wilaya_code)) {
            $wilayaCode = (string) $this->wilaya_code;
        } elseif ($this->wilaya) {
            $wilayaCode = (string) $this->wilaya->code;
        }

        return [
            'code'          => (string) $this->code,
            'wilaya_code'   => (string) $wilayaCode,
            'name_ar'       => (string) $this->name_ar,
            'name_fr'       => (string) $this->name_fr,
            'name_en'       => (string) $this->name_en,
            'postal_code'   => $this->postal_code !== null ? (string) $this->postal_code : null,
            'is_active'     => (bool) $this->is_active,
            'display_order' => (int) $this->display_order,
        ];
    }
}
