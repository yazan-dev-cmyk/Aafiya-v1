<?php

namespace App\Http\Resources;

use App\Services\AssistantPayoutService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminAssistantDirectoryResource extends JsonResource
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

        // Resolve active or last clinic membership
        $activeMembership = $this->clinicAssistants->first(fn ($ca) => $ca->deleted_at === null);
        $lastMembership = $activeMembership ?: $this->clinicAssistants->sortByDesc('created_at')->first();
        $clinic = $lastMembership?->clinic;

        // Resolve active payout profile
        $activeProfile = $this->payoutProfiles->first(fn ($p) => $p->status === 'active');
        $latestProfile = $activeProfile ?: $this->payoutProfiles->sortByDesc('version')->first();

        $balance = $this->rewardBalance;
        $currentBalance = (float) ($balance?->current_balance ?? 0.0);
        $totalEarned = (float) ($balance?->total_earned ?? 0.0);
        $totalPaid = (float) ($balance?->total_paid ?? 0.0);
        $totalDeducted = (float) ($balance?->total_deducted ?? 0.0);
        $totalRelieved = (float) ($balance?->total_relieved ?? 0.0);

        // Mask RIP: First 4 + 12 asterisks + last 4
        $maskRip = function (?string $rip) use ($canViewFullRip) {
            if (!$rip) return null;
            if ($canViewFullRip) return $rip;
            if (strlen($rip) < 8) return str_repeat('*', strlen($rip));
            return substr($rip, 0, 4) . str_repeat('*', 12) . substr($rip, -4);
        };

        // Determine eligibility
        $isEligible = $currentBalance >= AssistantPayoutService::PAYOUT_THRESHOLD && $activeProfile !== null;
        $ineligibilityReason = null;
        if (!$isEligible) {
            if ($currentBalance < 0) {
                $ineligibilityReason = 'deficit';
            } elseif ($currentBalance < AssistantPayoutService::PAYOUT_THRESHOLD) {
                $ineligibilityReason = 'threshold_not_met';
            } elseif (!$activeProfile) {
                $ineligibilityReason = 'missing_active_profile';
            }
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'membership_status' => $activeMembership ? 'active' : 'departed',
            'is_active_member' => $activeMembership !== null,
            'clinic' => $clinic ? [
                'id' => $clinic->id,
                'name' => $clinic->name,
                'wilaya' => $clinic->wilaya ?? null,
                'wilaya_id' => $clinic->wilaya_id ?? null,
            ] : null,
            'balance' => [
                'current_balance' => $currentBalance,
                'total_earned' => $totalEarned,
                'total_paid' => $totalPaid,
                'total_deducted' => $totalDeducted,
                'total_relieved' => $totalRelieved,
            ],
            'payout_profile' => $latestProfile ? [
                'id' => $latestProfile->id,
                'version' => $latestProfile->version,
                'status' => $latestProfile->status,
                'rip_masked' => $maskRip($latestProfile->rip_number),
                'rip_full' => $canViewFullRip ? $latestProfile->rip_number : null,
                'is_active' => $latestProfile->status === 'active',
            ] : null,
            'payout_eligibility' => [
                'is_eligible' => $isEligible,
                'reason' => $ineligibilityReason,
                'threshold' => AssistantPayoutService::PAYOUT_THRESHOLD,
            ],
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
