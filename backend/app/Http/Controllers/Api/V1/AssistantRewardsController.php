<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AssistantPayoutBatchItem;
use App\Models\AssistantPayoutProfile;
use App\Models\AssistantRewardTransaction;
use App\Services\AssistantLedgerService;
use App\Services\AssistantPayoutProfileService;
use App\Services\AssistantPayoutService;
use App\Services\AssistantProgramLifecycleService;
use App\Services\AssistantRewardRateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AssistantRewardsController extends Controller
{
    public function __construct(
        protected AssistantLedgerService $ledgerService,
        protected AssistantPayoutProfileService $profileService,
        protected AssistantRewardRateService $rateService,
        protected AssistantProgramLifecycleService $lifecycleService
    ) {}

    /**
     * Get reward balance summary for the authenticated doctor assistant.
     */
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole('doctor_assistant')) {
            return response()->json(['message' => 'Unauthorized. Assistant access required.'], 403);
        }

        $balance = $this->ledgerService->getOrCreateBalance($user->id);
        $activeProfile = AssistantPayoutProfile::where('assistant_id', $user->id)
            ->where('status', 'active')
            ->first();

        $hasPendingProfile = AssistantPayoutProfile::where('assistant_id', $user->id)
            ->where('status', 'pending_verification')
            ->exists();

        $latestRejectedProfile = AssistantPayoutProfile::where('assistant_id', $user->id)
            ->where('status', 'rejected')
            ->orderBy('version', 'desc')
            ->first();

        $threshold = 10000;
        $isEligible = (float) $balance->current_balance >= $threshold
            && $activeProfile !== null
            && ! $hasPendingProfile;

        $ineligibilityReason = null;
        if (! $isEligible) {
            if ($hasPendingProfile) {
                $ineligibilityReason = 'pending_profile_verification';
            } elseif ($activeProfile === null) {
                $ineligibilityReason = $latestRejectedProfile ? 'profile_rejected' : 'missing_profile';
            } elseif ((float) $balance->current_balance < $threshold) {
                $ineligibilityReason = 'below_threshold';
            }
        }

        $pendingPayout = (float) AssistantPayoutBatchItem::where('assistant_id', $user->id)
            ->where('status', 'pending')
            ->sum('amount');

        $currentRateInfo = $this->rateService->getCurrentRate();

        return response()->json([
            'status' => 'success',
            'data' => [
                'current_balance' => (float) $balance->current_balance,
                'total_earned' => (float) $balance->total_earned,
                'total_reversed' => (float) $balance->total_reversed,
                'total_deducted' => (float) $balance->total_deducted,
                'total_paid' => (float) $balance->total_paid,
                'total_relieved' => (float) $balance->total_relieved,
                'pending_payout' => $pendingPayout,
                'payout_threshold' => $threshold,
                'current_reward_rate' => (float) $currentRateInfo['amount'],
                'current_rate' => $currentRateInfo,
                'is_eligible_for_payout' => $isEligible,
                'ineligibility_reason' => $ineligibilityReason,
                'active_profile' => $activeProfile ? [
                    'id' => $activeProfile->id,
                    'rip_number' => $activeProfile->rip_number,
                    'version' => $activeProfile->version,
                    'status' => $activeProfile->status,
                ] : null,
                'program_lifecycle' => $this->lifecycleService->getCurrentLifecycle(),
            ],
        ]);
    }

    /**
     * Get paginated ledger transactions for authenticated assistant.
     */
    public function transactions(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole('doctor_assistant')) {
            return response()->json(['message' => 'Unauthorized. Assistant access required.'], 403);
        }

        $perPage = min(max((int) $request->query('per_page', 20), 1), 100);

        $transactions = AssistantRewardTransaction::where('assistant_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $transactions->items(),
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    /**
     * Get all payout profiles submitted by authenticated assistant.
     */
    public function profiles(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole('doctor_assistant')) {
            return response()->json(['message' => 'Unauthorized. Assistant access required.'], 403);
        }

        $profiles = AssistantPayoutProfile::where('assistant_id', $user->id)
            ->orderBy('version', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $profiles,
        ]);
    }

    /**
     * Submit a new RIP payout profile with cheque document.
     */
    public function submitProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole('doctor_assistant')) {
            return response()->json(['message' => 'Unauthorized. Assistant access required.'], 403);
        }

        $validated = $request->validate([
            'rip_number' => ['required', 'string', 'regex:/^\d{20}$/'],
            'cheque_document' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $profile = $this->profileService->submitProfile(
            $user,
            $validated['rip_number'],
            $request->file('cheque_document')
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Payout profile submitted successfully and is pending administrative verification.',
            'data' => $profile,
        ], 201);
    }

    /**
     * Get paginated payout history for the authenticated assistant.
     */
    public function payouts(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole('doctor_assistant')) {
            return response()->json(['message' => 'Unauthorized. Assistant access required.'], 403);
        }

        $perPage = min(max((int) $request->query('per_page', 20), 1), 100);

        $items = AssistantPayoutBatchItem::with('batch:id,batch_number,period_start,period_end,status')
            ->where('assistant_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $items->items(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    /**
     * Stream own cheque document.
     */
    public function streamCheque(Request $request, string $profileId): BinaryFileResponse
    {
        $user = $request->user();
        $profile = AssistantPayoutProfile::findOrFail($profileId);

        return $this->profileService->streamCheque($profile, $user);
    }
}