<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TickerAdvertisementResource extends JsonResource
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
            'priority' => (int) $this->priority,
            'status' => $this->status,
            'ticker_clicks_count' => (int) ($this->ticker_clicks_count ?? $this->clicks_count ?? 0),
            'starts_at' => $this->starts_at?->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'placements' => $this->whenLoaded('placements', function () {
                return $this->placements->map(fn ($p) => [
                    'id' => $p->id,
                    'destination' => $p->destination,
                    'audience' => $p->audience,
                ]);
            }),
        ];
    }
}
