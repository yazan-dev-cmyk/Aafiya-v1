<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminAssistantDirectoryResource;
use App\Http\Resources\AdminAssistantLedgerTransactionResource;
use App\Http\Resources\AdminAssistantPayoutProfileResource;
use App\Models\AssistantPayoutBatch;
use App\Models\AssistantPayoutBatchItem;
use App\Models\AssistantPayoutProfile;
use App\Models\AssistantRewardBalance;
use App\Models\AssistantRewardTransaction;
use App\Models\PlatformOperationalLoss;
use App\Models\SecurityAuditLog;
use App\Models\User;
use App\Services\AssistantPayoutProfileService;
use App\Services\AssistantPayoutService;
use App\Services\AssistantProgramLifecycleService;
use App\Services\AssistantRewardRateService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AdminAssistantRewardsController extends Controller
{
    public function __construct(
        protected AssistantPayoutService $payoutService,
        protected AssistantPayoutProfileService $profileService,
        protected AssistantRewardRateService $rateService,
        protected AssistantProgramLifecycleService $lifecycleService
    ) {}

    /**
     * Helper to verify granular permission for admin or administrative assistant.
     */
    protected function authorizePermission(Request $request, string $permission): void
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        if ($user->hasRole('admin')) {
            return;
        }

        if ($user->hasRole('admin_assistant') && $user->has4DAccess($permission, null, ['scope_type' => 'platform'])) {
            return;
        }

        abort(403, "Forbidden: Unauthorized. Missing '{$permission}' permission.");
    }

    /**
     * Rewards program configuration and settings overview.
     */
    public function settings(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.view_settings');

        return response()->json([
            'status' => 'success',
            'data' => [
                'current_rate' => $this->rateService->getCurrentRate(),
                'lifecycle' => $this->lifecycleService->getCurrentLifecycle(),
                'payout_threshold' => AssistantPayoutService::PAYOUT_THRESHOLD,
            ],
        ]);
    }

    /**
     * List reward rate schedules and history.
     */
    public function rates(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.view_settings');

        $perPage = min(max((int) $request->query('per_page', 20), 1), 100);
        $status = $request->query('status');

        $paginated = $this->rateService->getRatesHistory($perPage, $status);

        return response()->json([
            'status' => 'success',
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Schedule a new prospective reward rate.
     */
    public function scheduleRate(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.schedule_rate');

        $validated = $request->validate([
            'rate_amount' => ['required', 'numeric', 'min:1', 'max:10000'],
            'effective_from' => ['required', 'date'],
            'decision_reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $schedule = $this->rateService->scheduleRate(
                (float) $validated['rate_amount'],
                $validated['effective_from'],
                $request->user(),
                $validated['decision_reference'] ?? null,
                $validated['notes'] ?? null
            );
        } catch (\InvalidArgumentException|\RuntimeException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'تم جدولة قيمة المكافأة الجديدة بنجاح.',
            'data' => $schedule->load('creator'),
        ], 201);
    }

    /**
     * Cancel a scheduled rate before its effective datetime.
     */
    public function cancelScheduledRate(Request $request, string $id): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.cancel_scheduled_rate');

        $validated = $request->validate([
            'cancellation_reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        try {
            $schedule = $this->rateService->cancelScheduledRate(
                $id,
                $validated['cancellation_reason'],
                $request->user()
            );
        } catch (\InvalidArgumentException|\RuntimeException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'تم إلغاء الجدولة بنجاح.',
            'data' => $schedule->load('canceller'),
        ]);
    }

    /**
     * Get program lifecycle event history.
     */
    public function lifecycleHistory(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.view_settings');

        $perPage = min(max((int) $request->query('per_page', 20), 1), 100);
        $paginated = $this->lifecycleService->getLifecycleHistory($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Transition program lifecycle state (active, suspended, terminated).
     */
    public function transitionLifecycle(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.manage_lifecycle');

        $validated = $request->validate([
            'target_state' => ['required', 'in:active,suspended,terminated'],
            'effective_at' => ['required', 'date'],
            'notice_deadline_at' => ['nullable', 'date', 'required_if:target_state,terminated'],
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
            'decision_reference' => ['nullable', 'string', 'max:100'],
        ]);

        try {
            $event = $this->lifecycleService->transitionState(
                $validated['target_state'],
                $validated['effective_at'],
                $request->user(),
                $validated['reason'],
                $validated['notice_deadline_at'] ?? null,
                $validated['decision_reference'] ?? null
            );
        } catch (\InvalidArgumentException|\RuntimeException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'تم تحويل دورة حياة برنامج المكافآت بنجاح.',
            'data' => $event->load('authorizer'),
        ]);
    }

    /**
     * Rewards system financial overview.
     */
    public function overview(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.view_overview');

        $totalEarned = (float) AssistantRewardBalance::sum('total_earned');
        $totalPaid = (float) AssistantRewardBalance::sum('total_paid');
        $totalDeducted = (float) AssistantRewardBalance::sum('total_deducted');
        $totalRelieved = (float) AssistantRewardBalance::sum('total_relieved');
        $currentPendingLiability = (float) AssistantRewardBalance::where('current_balance', '>', 0)->sum('current_balance');
        $currentNegativeBalances = (float) AssistantRewardBalance::where('current_balance', '<', 0)->sum('current_balance');

        $totalOperationalLosses = (float) PlatformOperationalLoss::sum('amount');
        $lossesByCategory = PlatformOperationalLoss::groupBy('loss_category')
            ->selectRaw('loss_category, sum(amount) as total_amount, count(*) as count')
            ->get()
            ->keyBy('loss_category');

        $pendingVerificationProfiles = AssistantPayoutProfile::where('status', 'pending_verification')->count();
        $pendingBatches = AssistantPayoutBatch::where('status', 'pending')->count();

        // Assistant count metrics
        $totalAssistantsCount = User::whereHas('roles', fn ($q) => $q->where('name', 'doctor_assistant'))
            ->orWhereHas('clinicAssistants')
            ->count();

        $eligibleAssistantsCount = AssistantRewardBalance::where('current_balance', '>=', AssistantPayoutService::PAYOUT_THRESHOLD)
            ->whereHas('assistant.payoutProfiles', fn ($q) => $q->where('status', 'active'))
            ->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_earned' => $totalEarned,
                'total_paid' => $totalPaid,
                'total_deducted' => $totalDeducted,
                'total_relieved' => $totalRelieved,
                'current_pending_liability' => $currentPendingLiability,
                'current_negative_balances' => $currentNegativeBalances,
                'total_operational_losses' => $totalOperationalLosses,
                'losses_breakdown' => [
                    'departure_deficit_absorption' => (float) ($lossesByCategory['departure_deficit_absorption']->total_amount ?? 0),
                    'post_departure_cancellation' => (float) ($lossesByCategory['post_departure_cancellation']->total_amount ?? 0),
                    'post_departure_pre_payout_cancellation' => (float) ($lossesByCategory['post_departure_pre_payout_cancellation']->total_amount ?? 0),
                ],
                'pending_actions' => [
                    'pending_verification_profiles' => $pendingVerificationProfiles,
                    'pending_batches' => $pendingBatches,
                ],
                'roster_metrics' => [
                    'total_assistants' => $totalAssistantsCount,
                    'eligible_assistants' => $eligibleAssistantsCount,
                    'payout_threshold' => AssistantPayoutService::PAYOUT_THRESHOLD,
                ],
                'rate_info' => $this->rateService->getCurrentRate(),
                'lifecycle_info' => $this->lifecycleService->getCurrentLifecycle(),
            ],
        ]);
    }

    /**
     * Paginated assistant directory with filters and search (P2-A).
     */
    public function assistants(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.view_assistants');

        $perPage = min(max((int) $request->query('per_page', 20), 1), 100);

        $query = User::where(function ($q) {
            $q->whereHas('roles', fn ($r) => $r->where('name', 'doctor_assistant'))
              ->orWhereHas('clinicAssistants');
        })->with([
            'clinicAssistants.clinic',
            'rewardBalance',
            'payoutProfiles',
        ]);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('id', $search);
            });
        }

        if ($clinicId = $request->query('clinic_id')) {
            $query->whereHas('clinicAssistants', fn ($q) => $q->where('clinic_id', $clinicId));
        }

        if ($wilayaId = $request->query('wilaya_id')) {
            $query->whereHas('clinicAssistants.clinic', fn ($q) => $q->where('wilaya_id', $wilayaId));
        }

        if ($membership = $request->query('membership')) {
            if ($membership === 'active') {
                $query->whereHas('clinicAssistants', fn ($q) => $q->whereNull('deleted_at'));
            } elseif ($membership === 'departed') {
                $query->whereDoesntHave('clinicAssistants', fn ($q) => $q->whereNull('deleted_at'));
            }
        }

        if ($eligibility = $request->query('eligibility')) {
            if ($eligibility === 'eligible') {
                $query->whereHas('rewardBalance', fn ($q) => $q->where('current_balance', '>=', AssistantPayoutService::PAYOUT_THRESHOLD))
                      ->whereHas('payoutProfiles', fn ($q) => $q->where('status', 'active'));
            } elseif ($eligibility === 'below_threshold') {
                $query->whereHas('rewardBalance', fn ($q) => $q->where('current_balance', '>', 0)->where('current_balance', '<', AssistantPayoutService::PAYOUT_THRESHOLD));
            } elseif ($eligibility === 'deficit') {
                $query->whereHas('rewardBalance', fn ($q) => $q->where('current_balance', '<', 0));
            } elseif ($eligibility === 'missing_profile') {
                $query->whereDoesntHave('payoutProfiles', fn ($q) => $q->where('status', 'active'));
            }
        }

        if ($profileStatus = $request->query('profile_status')) {
            if ($profileStatus === 'none') {
                $query->doesntHave('payoutProfiles');
            } else {
                $query->whereHas('payoutProfiles', fn ($q) => $q->where('status', $profileStatus));
            }
        }

        $paginated = $query->orderBy('name', 'asc')->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => AdminAssistantDirectoryResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Get individual assistant ledger transaction history (P2-A).
     */
    public function assistantLedger(Request $request, string $id): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.view_assistant_ledger');

        $assistant = User::findOrFail($id);
        $perPage = min(max((int) $request->query('per_page', 25), 1), 100);

        $transactions = AssistantRewardTransaction::where('assistant_id', $assistant->id)
            ->with('creator')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        SecurityAuditLog::create([
            'actor_id' => $request->user()->id,
            'actor_role' => $request->user()->roles->first()?->name ?? 'admin',
            'event_category' => 'assistant_rewards_admin',
            'action' => 'view_assistant_ledger',
            'resource_type' => 'User',
            'resource_id' => $assistant->id,
            'ip_address' => $request->ip() ?? '127.0.0.1',
            'user_agent' => $request->userAgent() ?? 'CLI',
            'details' => [
                'assistant_id' => $assistant->id,
                'assistant_name' => $assistant->name,
            ],
        ]);

        return response()->json([
            'status' => 'success',
            'assistant' => [
                'id' => $assistant->id,
                'name' => $assistant->name,
                'email' => $assistant->email,
                'phone' => $assistant->phone,
            ],
            'data' => AdminAssistantLedgerTransactionResource::collection($transactions->items()),
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    /**
     * List payout profiles with comprehensive status filters (P2-B).
     */
    public function profiles(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.verify_payout_profile');

        $status = $request->query('status', 'all');
        $perPage = min(max((int) $request->query('per_page', 20), 1), 100);

        $query = AssistantPayoutProfile::with(['assistant.clinicAssistants.clinic', 'verifier'])
            ->orderBy('created_at', 'desc');

        if ($status && $status !== 'all') {
            $normalizedStatus = match ($status) {
                'pending', 'pending_verification' => 'pending_verification',
                'active', 'approved' => 'active',
                'rejected' => 'rejected',
                'superseded' => 'superseded',
                default => $status,
            };
            $query->where('status', $normalizedStatus);
        }

        $paginated = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => AdminAssistantPayoutProfileResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Get pending RIP profiles for backward compatibility.
     */
    public function pendingProfiles(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.verify_payout_profile');

        $profiles = AssistantPayoutProfile::where('status', 'pending_verification')
            ->with(['assistant.clinicAssistants.clinic', 'verifier'])
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => AdminAssistantPayoutProfileResource::collection($profiles),
        ]);
    }

    /**
     * Approve or reject a submitted RIP profile (P2-B).
     */
    public function verifyProfile(Request $request, string $profileId): JsonResponse
    {
        $validated = $request->validate([
            'approved' => ['required', 'boolean'],
            'rejection_reason' => ['nullable', 'string', 'required_if:approved,false', 'max:500'],
        ]);

        if (!$validated['approved']) {
            $reason = trim($validated['rejection_reason'] ?? '');
            if (empty($reason) || mb_strlen($reason) < 3) {
                return response()->json([
                    'message' => 'The rejection reason field is required and must not be empty or whitespace only.',
                    'errors' => [
                        'rejection_reason' => ['سبب الرفض إلزامي ويجب ألا يقل عن 3 أحرف ولا يحتوي على مسافات فقط.'],
                    ],
                ], 422);
            }
            $validated['rejection_reason'] = $reason;
        }

        $requiredPermission = $validated['approved']
            ? 'platform.rewards.verify_payout_profile'
            : 'platform.rewards.reject_payout_profile';

        $this->authorizePermission($request, $requiredPermission);

        $profile = AssistantPayoutProfile::findOrFail($profileId);

        $verified = $this->profileService->verifyProfile(
            $profile,
            $request->user(),
            $validated['approved'],
            $validated['rejection_reason'] ?? null
        );

        return response()->json([
            'status' => 'success',
            'message' => $validated['approved'] ? 'Profile verified and activated.' : 'Profile rejected.',
            'data' => new AdminAssistantPayoutProfileResource($verified->load(['assistant.clinicAssistants.clinic', 'verifier'])),
        ]);
    }

    /**
     * Disclose full unmasked 20-digit RIP (Decision D-03).
     */
    public function revealFullRip(Request $request, string $profileId): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.view_full_rip');

        $profile = AssistantPayoutProfile::findOrFail($profileId);
        $fullRip = $this->profileService->revealFullRip($profile, $request->user());

        return response()->json([
            'status' => 'success',
            'profile_id' => $profile->id,
            'rip_full' => $fullRip,
            'data' => [
                'rip' => $fullRip,
                'rip_full' => $fullRip,
            ],
        ]);
    }

    /**
     * Stream cheque document for inline viewing (Decision D-01).
     */
    public function streamCheque(Request $request, string $profileId): BinaryFileResponse
    {
        $this->authorizePermission($request, 'platform.rewards.view_cheque_document');
        $profile = AssistantPayoutProfile::findOrFail($profileId);

        return $this->profileService->streamCheque($profile, $request->user());
    }

    /**
     * Download crossed-cheque document (Decision D-01 Option B).
     */
    public function downloadCheque(Request $request, string $profileId): BinaryFileResponse
    {
        $this->authorizePermission($request, 'platform.rewards.download_cheque_document');
        $profile = AssistantPayoutProfile::findOrFail($profileId);

        return $this->profileService->downloadCheque($profile, $request->user());
    }

    /**
     * Preview monthly payout batch without DB mutations (P2-C).
     */
    public function batchPreview(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.generate_payout_batch');

        $validated = $request->validate([
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
        ]);

        $preview = $this->payoutService->previewMonthlyBatch(
            $validated['period_start'],
            $validated['period_end']
        );

        return response()->json([
            'status' => 'success',
            'data' => $preview,
        ]);
    }

    /**
     * List payout batches.
     */
    public function batches(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.generate_payout_batch');

        $perPage = min(max((int) $request->query('per_page', 20), 1), 100);

        $batches = AssistantPayoutBatch::with(['generator', 'confirmer'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $batches->items(),
            'meta' => [
                'current_page' => $batches->currentPage(),
                'last_page' => $batches->lastPage(),
                'per_page' => $batches->perPage(),
                'total' => $batches->total(),
            ],
        ]);
    }

    /**
     * Get specific batch with items.
     */
    public function batchDetails(Request $request, string $id): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.generate_payout_batch');

        $batch = AssistantPayoutBatch::with([
            'items.assistant',
            'items.payoutProfile',
            'generator',
            'confirmer',
        ])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $batch,
        ]);
    }

    /**
     * Trigger generation of a monthly payout batch.
     */
    public function generateBatch(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.generate_payout_batch');

        $validated = $request->validate([
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
        ]);

        $batch = $this->payoutService->generateMonthlyBatch(
            $validated['period_start'],
            $validated['period_end'],
            $request->user()
        );

        if (!$batch) {
            return response()->json([
                'status' => 'info',
                'message' => 'No assistants reached the payout threshold with active profiles for this period.',
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Payout batch successfully generated.',
            'data' => $batch->load('items.assistant'),
        ], 201);
    }

    /**
     * Cancel an unpaid payout batch (Decision D-02 Option A).
     */
    public function cancelBatch(Request $request, string $id): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.cancel_payout_batch');

        $reason = $request->input('cancellation_reason') ?? $request->input('reason');
        if (!$reason || strlen(trim($reason)) < 3) {
            return response()->json([
                'status' => 'error',
                'code' => 422,
                'message' => 'The cancellation reason field is required and must be at least 3 characters.',
                'errors' => ['cancellation_reason' => ['The cancellation reason field is required.']],
            ], 422);
        }

        $batch = AssistantPayoutBatch::findOrFail($id);

        try {
            $this->payoutService->cancelBatch($batch, trim($reason), $request->user());
        } catch (\RuntimeException $e) {
            return response()->json([
                'status' => 'error',
                'code' => 422,
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Payout batch successfully cancelled.',
            'data' => $batch->fresh('items'),
        ]);
    }

    /**
     * Confirm payout transfer for a specific batch item.
     */
    public function confirmBatchItem(Request $request, string $batchId, string $itemId): JsonResponse
    {
        $user = $request->user();
        $this->payoutService->authorizePayoutConfirmation($user);

        $validated = $request->validate([
            'transfer_reference' => ['required', 'string', 'max:100'],
        ]);

        $item = AssistantPayoutBatchItem::where('batch_id', $batchId)->where('id', $itemId)->firstOrFail();
        $this->payoutService->confirmBatchItem($item, $validated['transfer_reference'], $user);

        return response()->json([
            'status' => 'success',
            'message' => 'Payout transfer confirmed and assistant balance debited successfully.',
            'data' => $item->fresh(['batch', 'assistant']),
        ]);
    }

    /**
     * Mark payout batch item as failed.
     */
    public function failBatchItem(Request $request, string $batchId, string $itemId): JsonResponse
    {
        $user = $request->user();
        $this->payoutService->authorizePayoutConfirmation($user);

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:500'],
        ]);

        $item = AssistantPayoutBatchItem::where('batch_id', $batchId)->where('id', $itemId)->firstOrFail();
        $this->payoutService->failBatchItem($item, $validated['rejection_reason'], $user);

        return response()->json([
            'status' => 'success',
            'message' => 'Payout batch item marked as failed.',
            'data' => $item->fresh(),
        ]);
    }

    /**
     * Defer payout batch item to next monthly cycle (DEC-B & DEC-02).
     */
    public function deferBatchItem(Request $request, string $batchId, string $itemId): JsonResponse
    {
        $user = $request->user();
        $this->payoutService->authorizePayoutConfirmation($user);

        $validated = $request->validate([
            'deferral_reason' => ['required', 'string', 'max:500'],
        ]);

        $item = AssistantPayoutBatchItem::where('batch_id', $batchId)->where('id', $itemId)->firstOrFail();
        $this->payoutService->deferBatchItem($item, $validated['deferral_reason'], $user);

        return response()->json([
            'status' => 'success',
            'message' => 'Payout batch item successfully deferred to next cycle.',
            'data' => $item->fresh(),
        ]);
    }

    /**
     * Process bounced / returned postal transfer incident (DEC-08).
     */
    public function returnBatchItem(Request $request, string $batchId, string $itemId): JsonResponse
    {
        $user = $request->user();
        $this->payoutService->authorizePayoutConfirmation($user);

        $validated = $request->validate([
            'returned_amount' => ['required', 'numeric', 'min:0.01'],
            'return_reason' => ['required', 'string', 'max:500'],
            'postal_reference' => ['nullable', 'string', 'max:100'],
            'idempotency_key' => ['nullable', 'string', 'max:191'],
        ]);

        $postalReference = $validated['postal_reference'] ?? null;
        $idempotencyKey = $validated['idempotency_key'] ?? $request->header('X-Idempotency-Key');

        $item = AssistantPayoutBatchItem::where('batch_id', $batchId)->where('id', $itemId)->firstOrFail();

        $incident = $this->payoutService->handleTransferReturn(
            $item,
            (float) $validated['returned_amount'],
            $validated['return_reason'],
            $user,
            $postalReference,
            $idempotencyKey
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Returned transfer credited back to assistant balance.',
            'incident' => $incident,
            'data' => $item->fresh(['bounceIncidents']),
        ]);
    }

    /**
     * List platform operational losses.
     */
    public function losses(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.view_overview');

        $perPage = min(max((int) $request->query('per_page', 20), 1), 100);

        $losses = PlatformOperationalLoss::with(['assistant', 'appointment'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $losses->items(),
            'meta' => [
                'current_page' => $losses->currentPage(),
                'last_page' => $losses->lastPage(),
                'per_page' => $losses->perPage(),
                'total' => $losses->total(),
            ],
        ]);
    }

    /**
     * List assistant rewards audit logs (P2-D).
     */
    public function auditLogs(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'platform.rewards.view_audit_logs');

        $perPage = min(max((int) $request->query('per_page', 25), 1), 100);

        $logs = SecurityAuditLog::whereIn('event_category', ['assistant_rewards_admin', 'financial_document_access'])
            ->with('actor')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}