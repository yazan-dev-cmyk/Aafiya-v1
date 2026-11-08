<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminAssistantPayoutProfileResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $canViewFullRip = $user && ($user->hasRole('admin') || $user->has4DAccess('platform.rewards.view_full_rip', null, ['scope_type' => 'platform']));

        $rip = $this->rip_number;
        $maskedRip = null;
        if ($rip) {
            $maskedRip = (strlen($rip) >= 8)
                ? substr($rip, 0, 4) . str_repeat('*', 12) . substr($rip, -4)
                : str_repeat('*', strlen($rip));
        }

        return [
            'id' => $this->id,
            'assistant_id' => $this->assistant_id,
            'assistant' => $this->whenLoaded('assistant', function () {
                return $this->assistant ? [
                    'id' => $this->assistant->id,
                    'name' => $this->assistant->name,
                    'email' => $this->assistant->email,
                    'phone' => $this->assistant->phone,
                ] : null;
            }),
            'clinic' => $this->whenLoaded('assistant', function () {
                $activeCa = $this->assistant?->clinicAssistants?->whereNull('deleted_at')->first();
                $anyCa = $activeCa ?: $this->assistant?->clinicAssistants?->sortByDesc('created_at')->first();
                $clinic = $anyCa?->clinic;
                return $clinic ? [
                    'id' => $clinic->id,
                    'name' => $clinic->name,
                ] : null;
            }),
            'version' => (int) $this->version,
            'status' => $this->status,
            'status_display' => $this->status === 'pending_verification' ? 'pending' : $this->status,
            'rip_masked' => $maskedRip,
            'masked_rip' => $maskedRip,
            'rip_full' => $canViewFullRip ? $rip : null,
            'has_document' => !empty($this->cheque_image_path),
            'rejection_reason' => $this->rejection_reason,
            'verified_at' => $this->verified_at?->toIso8601String(),
            'reviewed_at' => $this->verified_at?->toIso8601String(),
            'verified_by' => $this->whenLoaded('verifier', function () {
                return $this->verifier ? [
                    'id' => $this->verifier->id,
                    'name' => $this->verifier->name,
                ] : null;
            }),
            'reviewed_by' => $this->verified_by_id,
            'reviewer_name' => $this->relationLoaded('verifier') ? $this->verifier?->name : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
