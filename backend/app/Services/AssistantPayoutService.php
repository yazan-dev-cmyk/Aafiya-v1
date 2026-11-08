<?php

namespace App\Services;

use App\Models\AssistantPayoutBatch;
use App\Models\AssistantPayoutBatchItem;
use App\Models\AssistantPayoutProfile;
use App\Models\AssistantReward;
use App\Models\AssistantRewardBalance;
use App\Models\PayoutBounceIncident;
use App\Models\SecurityAuditLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

class AssistantPayoutService
{
    public const PAYOUT_THRESHOLD = 5000.00;

    public function __construct(
        protected AssistantLedgerService $ledgerService,
        protected AssistantRewardAllocationEngine $allocationEngine
    ) {}

    /**
     * Generate monthly payout batch for assistants reaching the payout threshold evaluated strictly against Pnet.
     * Compliant with DEC-04 Rule 6:
     * - Evaluated exclusively against Pnet = G - D_applied
     * - Gross G is NEVER used as threshold eligibility basis
     * - Batches persist applied_threshold_dzd at creation time
     */
    public function generateMonthlyBatch(
        string $periodStart,
        string $periodEnd,
        ?User $actor = null,
        float $threshold = self::PAYOUT_THRESHOLD
    ): ?AssistantPayoutBatch {
        return DB::transaction(function () use ($periodStart, $periodEnd, $actor, $threshold) {
            $cycleEndUtc = Carbon::parse($periodEnd, 'Africa/Algiers')->setTimezone('UTC')->endOfDay();
            $payoutCycle = Carbon::parse($periodStart, 'Africa/Algiers')->format('Y-m');

            // Find all assistants with an existing balance or unbatched pending rewards (scope parity)
            $assistantIds = AssistantRewardBalance::pluck('assistant_id')
                ->merge(AssistantReward::whereNull('payout_batch_item_id')->where('settlement_status', 'pending')->pluck('assistant_id'))
                ->unique();

            $allBalances = AssistantRewardBalance::whereIn('assistant_id', $assistantIds)->get();

            $itemsToCreate = [];
            $totalAmount = 0.00;

            foreach ($allBalances as $balance) {
                // Strict check: if assistant already has a pending batch item, skip
                $hasPendingBatchItem = AssistantPayoutBatchItem::where('assistant_id', $balance->assistant_id)
                    ->where('status', 'pending')
                    ->exists();

                if ($hasPendingBatchItem) {
                    Log::info("Assistant {$balance->assistant_id} already has a pending payout batch item. Skipped.");
                    continue;
                }

                // Strict check: profile pending verification suspends payout
                $hasPendingProfile = AssistantPayoutProfile::where('assistant_id', $balance->assistant_id)
                    ->where('status', 'pending_verification')
                    ->exists();

                if ($hasPendingProfile) {
                    Log::info("Assistant {$balance->assistant_id} has a payout profile pending verification. Payout suspended.");
                    continue;
                }

                // Must have an active payout profile
                $activeProfile = AssistantPayoutProfile::where('assistant_id', $balance->assistant_id)
                    ->where('status', 'active')
                    ->first();

                if (!$activeProfile) {
                    Log::info("Assistant {$balance->assistant_id} has no active payout profile. Skipped from batch.");
                    continue;
                }

                // Retrieve candidate rewards and open debts
                $candidateRewards = $this->allocationEngine->getCandidateRewards($balance->assistant_id, $cycleEndUtc);
                $openDebts = $this->allocationEngine->getOpenDebts($balance->assistant_id);

                if ($candidateRewards->isNotEmpty()) {
                    $settlement = $this->allocationEngine->previewSettlement($candidateRewards, $openDebts, $threshold);
                    $gross = $settlement['gross_rewards'];
                    $debtOffset = $settlement['debt_applied'];
                    $pnet = $settlement['pnet'];
                } else {
                    // Fallback for legacy balance without reward rows
                    $gross = (float) $balance->current_balance;
                    $totalDebt = (float) $openDebts->sum('remaining_debt_dzd');
                    $debtOffset = min($gross, $totalDebt);
                    $pnet = round($gross - $debtOffset, 2);
                }

                // DEC-04 Rule 6: Mandatory Threshold Evaluation on Pnet ONLY
                if ($pnet < $threshold) {
                    Log::info("Assistant {$balance->assistant_id} has Pnet ({$pnet} DZD) below threshold ({$threshold} DZD). Skipped from batch. Rewards preserved without forfeiture.");
                    continue;
                }

                $itemsToCreate[] = [
                    'assistant_id' => $balance->assistant_id,
                    'payout_profile_id' => $activeProfile->id,
                    'gross_amount' => $gross,
                    'debt_offset_amount' => $debtOffset,
                    'net_amount' => $pnet,
                    'amount' => $pnet,
                    'settlement_category' => ($debtOffset > 0) ? 'partially_settled' : 'completed',
                    'candidate_rewards' => $candidateRewards,
                ];
                $totalAmount += $pnet;
            }

            if (empty($itemsToCreate)) {
                return null;
            }

            $batchNumber = 'BAT-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));
            $batch = AssistantPayoutBatch::create([
                'batch_number' => $batchNumber,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'payout_cycle' => $payoutCycle,
                'applied_threshold_dzd' => $threshold,
                'status' => 'pending',
                'total_recipients' => count($itemsToCreate),
                'total_amount' => $totalAmount,
                'generated_by_id' => $actor?->id,
            ]);

            foreach ($itemsToCreate as $itemData) {
                $item = AssistantPayoutBatchItem::create([
                    'batch_id' => $batch->id,
                    'assistant_id' => $itemData['assistant_id'],
                    'payout_profile_id' => $itemData['payout_profile_id'],
                    'amount' => $itemData['amount'],
                    'gross_amount' => $itemData['gross_amount'],
                    'debt_offset_amount' => $itemData['debt_offset_amount'],
                    'net_amount' => $itemData['net_amount'],
                    'settlement_category' => $itemData['settlement_category'],
                    'status' => 'pending',
                ]);

                // Attach candidate rewards to batch item in 'batched' state
                if (!empty($itemData['candidate_rewards'])) {
                    foreach ($itemData['candidate_rewards'] as $candReward) {
                        $candReward->update([
                            'payout_batch_item_id' => $item->id,
                            'settlement_status' => 'batched',
                        ]);
                    }
                }
            }

            SecurityAuditLog::create([
                'actor_id' => $actor?->id,
                'actor_role' => $actor?->roles->first()?->name ?? 'admin',
                'event_category' => 'assistant_rewards_admin',
                'action' => 'generate_payout_batch',
                'resource_type' => 'AssistantPayoutBatch',
                'resource_id' => $batch->id,
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'user_agent' => request()->userAgent() ?? 'CLI',
                'details' => [
                    'batch_number' => $batchNumber,
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd,
                    'applied_threshold_dzd' => $threshold,
                    'total_recipients' => count($itemsToCreate),
                    'total_amount' => $totalAmount,
                ],
            ]);

            Log::info("Generated payout batch {$batchNumber} with " . count($itemsToCreate) . " recipients, total {$totalAmount} DZD (Threshold: {$threshold} DZD).");

            return $batch;
        });
    }

    /**
     * Preview monthly payout batch without creating records or mutating database.
     * Evaluates threshold exclusively on Pnet (DEC-04 Rule 6).
     */
    public function previewMonthlyBatch(
        string $periodStart,
        string $periodEnd,
        float $threshold = self::PAYOUT_THRESHOLD
    ): array {
        $cycleEndUtc = Carbon::parse($periodEnd, 'Africa/Algiers')->setTimezone('UTC')->endOfDay();
        $assistantIds = AssistantRewardBalance::pluck('assistant_id')
            ->merge(AssistantReward::whereNull('payout_batch_item_id')->where('settlement_status', 'pending')->pluck('assistant_id'))
            ->unique();

        $allBalances = AssistantRewardBalance::with('assistant')->whereIn('assistant_id', $assistantIds)->get();

        $eligibleAssistants = [];
        $excludedAssistants = [];
        $totalEstimatedAmount = 0.00;

        foreach ($allBalances as $balance) {
            $assistant = $balance->assistant;
            $currentBalance = (float) $balance->current_balance;

            $activeProfile = AssistantPayoutProfile::where('assistant_id', $balance->assistant_id)
                ->where('status', 'active')
                ->first();

            $hasPendingProfile = AssistantPayoutProfile::where('assistant_id', $balance->assistant_id)
                ->where('status', 'pending_verification')
                ->exists();

            $hasPendingBatchItem = AssistantPayoutBatchItem::where('assistant_id', $balance->assistant_id)
                ->where('status', 'pending')
                ->exists();

            $candidateRewards = $this->allocationEngine->getCandidateRewards($balance->assistant_id, $cycleEndUtc);
            $openDebts = $this->allocationEngine->getOpenDebts($balance->assistant_id);

            if ($candidateRewards->isNotEmpty()) {
                $settlement = $this->allocationEngine->previewSettlement($candidateRewards, $openDebts, $threshold);
                $gross = $settlement['gross_rewards'];
                $debtOffset = $settlement['debt_applied'];
                $pnet = $settlement['pnet'];
            } else {
                $gross = $currentBalance;
                $totalDebt = (float) $openDebts->sum('remaining_debt_dzd');
                $debtOffset = min($gross, $totalDebt);
                $pnet = round($gross - $debtOffset, 2);
            }

            if ($pnet >= $threshold && $activeProfile && !$hasPendingProfile && !$hasPendingBatchItem) {
                $eligibleAssistants[] = [
                    'assistant_id' => $balance->assistant_id,
                    'name' => $assistant?->name ?? 'Assistant',
                    'email' => $assistant?->email,
                    'phone' => $assistant?->phone,
                    'gross_amount' => $gross,
                    'debt_offset_amount' => $debtOffset,
                    'payable_amount' => $pnet,
                    'pnet' => $pnet,
                    'payout_profile_id' => $activeProfile->id,
                    'rip_masked' => (strlen($activeProfile->rip_number) >= 8)
                        ? substr($activeProfile->rip_number, 0, 4) . str_repeat('*', 12) . substr($activeProfile->rip_number, -4)
                        : str_repeat('*', strlen($activeProfile->rip_number)),
                ];
                $totalEstimatedAmount += $pnet;
            } else {
                $reason = 'below_threshold';
                if ($currentBalance < 0) {
                    $reason = 'deficit';
                } elseif ($hasPendingBatchItem) {
                    $reason = 'pending_batch_in_progress';
                } elseif ($hasPendingProfile) {
                    $reason = 'profile_pending_verification';
                } elseif (!$activeProfile) {
                    $reason = 'missing_active_profile';
                }

                $excludedAssistants[] = [
                    'assistant_id' => $balance->assistant_id,
                    'name' => $assistant?->name ?? 'Assistant',
                    'email' => $assistant?->email,
                    'gross_amount' => $gross,
                    'debt_offset_amount' => $debtOffset,
                    'pnet' => $pnet,
                    'current_balance' => $currentBalance,
                    'reason' => $reason,
                ];
            }
        }

        return [
            'period_start' => $periodStart,
            'period_end' => $periodEnd,
            'threshold' => $threshold,
            'eligible_assistants_count' => count($eligibleAssistants),
            'total_estimated_payout' => $totalEstimatedAmount,
            'excluded_assistants_count' => count($excludedAssistants),
            'excluded_breakdown' => [
                'below_threshold_count' => collect($excludedAssistants)->where('reason', 'below_threshold')->count(),
                'missing_active_profile_count' => collect($excludedAssistants)->whereIn('reason', ['missing_active_profile', 'profile_pending_verification'])->count(),
                'negative_balance_count' => collect($excludedAssistants)->where('reason', 'deficit')->count(),
            ],
            'summary' => [
                'eligible_count' => count($eligibleAssistants),
                'total_estimated_amount' => $totalEstimatedAmount,
                'excluded_count' => count($excludedAssistants),
            ],
            'eligible_assistants' => $eligibleAssistants,
            'excluded_assistants' => $excludedAssistants,
        ];
    }

    /**
     * Authorize whether the user is permitted to confirm payout transfers.
     * Allowed: System Admin OR Administrative Assistant with delegated 'platform.confirm_assistant_payout' permission.
     */
    public function authorizePayoutConfirmation(User $user): void
    {
        if ($user->hasRole('admin')) {
            return;
        }

        if ($user->hasRole('admin_assistant') && $user->has4DAccess('platform.confirm_assistant_payout', null, ['scope_type' => 'platform'])) {
            return;
        }

        throw new AuthorizationException('Forbidden: Unauthorized to confirm assistant rewards payout transfers.');
    }

    /**
     * Confirm execution of a payout transfer for a batch item.
     * Enforces deterministic locking order (Level 1 User -> Level 2 Balance -> Level 3 Debts -> Level 4 Rewards -> Level 5 Batch -> Level 6 Item).
     */
    public function confirmBatchItem(AssistantPayoutBatchItem $item, string $transferReference, User $confirmer): void
    {
        $this->authorizePayoutConfirmation($confirmer);

        DB::transaction(function () use ($item, $transferReference, $confirmer) {
            // Level 1 & 2: Lock User and Balance
            User::where('id', $item->assistant_id)->lockForUpdate()->firstOrFail();
            $balance = AssistantRewardBalance::where('assistant_id', $item->assistant_id)->lockForUpdate()->firstOrFail();

            // Level 5 & 6: Lock Batch and Item
            $batch = AssistantPayoutBatch::where('id', $item->batch_id)->lockForUpdate()->firstOrFail();
            /** @var AssistantPayoutBatchItem $lockedItem */
            $lockedItem = AssistantPayoutBatchItem::where('id', $item->id)->lockForUpdate()->firstOrFail();

            if ($lockedItem->status !== 'pending') {
                throw new RuntimeException("Cannot confirm batch item in status ({$lockedItem->status}). Must be pending.");
            }

            // Retrieve attached or candidate rewards and open debts (deterministic FIFO ordering)
            $candidateRewards = AssistantReward::where('payout_batch_item_id', $lockedItem->id)
                ->orderByRaw('COALESCE(confirmed_at, created_at) ASC')
                ->orderBy('id', 'ASC')
                ->get();
            if ($candidateRewards->isEmpty()) {
                $candidateRewards = $this->allocationEngine->getCandidateRewards($lockedItem->assistant_id, now());
            }
            $openDebts = $this->allocationEngine->getOpenDebts($lockedItem->assistant_id);

            // Execute FIFO allocations if rewards exist
            if ($candidateRewards->isNotEmpty()) {
                $this->allocationEngine->executeFifoAllocations(
                    $lockedItem,
                    $candidateRewards,
                    $openDebts,
                    $confirmer
                );
            }

            // Debit the assistant balance by actual cash payout (net_amount)
            $payoutAmount = (float) ($lockedItem->net_amount > 0 ? $lockedItem->net_amount : $lockedItem->amount);

            $this->ledgerService->recordTransaction(
                assistantId: $lockedItem->assistant_id,
                transactionType: 'payout_settlement',
                direction: 'debit',
                amount: $payoutAmount,
                referenceType: 'payout_batch_item',
                referenceId: $lockedItem->id,
                idempotencyKey: "payout_settlement:batch_item:{$lockedItem->id}",
                notes: "Payout transfer confirmed. Reference: {$transferReference}",
                createdBy: $confirmer->id
            );

            $lockedItem->update([
                'status' => 'paid',
                'transfer_reference' => $transferReference,
                'transferred_at' => now(),
            ]);

            // Check if entire batch is completed
            $pendingCount = AssistantPayoutBatchItem::where('batch_id', $batch->id)
                ->where('status', 'pending')
                ->count();

            if ($pendingCount === 0) {
                $batch->update([
                    'status' => 'completed',
                    'confirmed_by_id' => $confirmer->id,
                    'confirmed_at' => now(),
                ]);
            }

            SecurityAuditLog::create([
                'actor_id' => $confirmer->id,
                'actor_role' => $confirmer->roles->first()?->name ?? 'admin',
                'event_category' => 'assistant_rewards_admin',
                'action' => 'confirm_payout_transfer',
                'resource_type' => 'AssistantPayoutBatchItem',
                'resource_id' => $lockedItem->id,
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'user_agent' => request()->userAgent() ?? 'CLI',
                'details' => [
                    'batch_id' => $lockedItem->batch_id,
                    'assistant_id' => $lockedItem->assistant_id,
                    'gross_amount' => (float) $lockedItem->gross_amount,
                    'debt_offset_amount' => (float) $lockedItem->debt_offset_amount,
                    'net_amount' => $payoutAmount,
                    'transfer_reference' => $transferReference,
                ],
            ]);
        });
    }

    /**
     * Defer a batch item to the next monthly cycle (DEC-B & DEC-02).
     * Attached rewards are released back to general available balance with status 'deferred'.
     */
    public function deferBatchItem(AssistantPayoutBatchItem $item, string $deferralReason, User $actor): void
    {
        $this->authorizePayoutConfirmation($actor);

        if (empty(trim($deferralReason))) {
            throw new InvalidArgumentException('A non-empty deferral reason is required.');
        }

        DB::transaction(function () use ($item, $deferralReason, $actor) {
            /** @var AssistantPayoutBatchItem $lockedItem */
            $lockedItem = AssistantPayoutBatchItem::where('id', $item->id)->lockForUpdate()->firstOrFail();

            if ($lockedItem->status !== 'pending') {
                throw new RuntimeException("Cannot defer batch item in status ({$lockedItem->status}). Must be pending.");
            }

            // Release attached rewards back to general pool with status 'deferred'
            AssistantReward::where('payout_batch_item_id', $lockedItem->id)->update([
                'payout_batch_item_id' => null,
                'settlement_status' => 'deferred',
            ]);

            $lockedItem->update([
                'status' => 'deferred',
                'settlement_category' => 'unsettled_deferred',
                'rejection_reason' => $deferralReason,
            ]);

            // Check if batch can be completed
            $batch = $lockedItem->batch()->lockForUpdate()->first();
            $pendingCount = AssistantPayoutBatchItem::where('batch_id', $batch->id)
                ->where('status', 'pending')
                ->count();

            if ($pendingCount === 0) {
                $batch->update([
                    'status' => 'completed',
                    'confirmed_by_id' => $actor->id,
                    'confirmed_at' => now(),
                ]);
            }

            SecurityAuditLog::create([
                'actor_id' => $actor->id,
                'actor_role' => $actor->roles->first()?->name ?? 'admin',
                'event_category' => 'assistant_rewards_admin',
                'action' => 'defer_payout_batch_item',
                'resource_type' => 'AssistantPayoutBatchItem',
                'resource_id' => $lockedItem->id,
                'details' => [
                    'batch_id' => $lockedItem->batch_id,
                    'assistant_id' => $lockedItem->assistant_id,
                    'amount' => (float) $lockedItem->amount,
                    'deferral_reason' => $deferralReason,
                ],
            ]);

            Log::info("Deferred batch item {$lockedItem->id} for assistant {$lockedItem->assistant_id}. Reason: {$deferralReason}");
        });
    }

    /**
     * Mark a batch item as failed/rejected (e.g. invalid bank RIP at transfer time).
     */
    public function failBatchItem(AssistantPayoutBatchItem $item, string $rejectionReason, User $confirmer): void
    {
        $this->authorizePayoutConfirmation($confirmer);

        DB::transaction(function () use ($item, $rejectionReason, $confirmer) {
            /** @var AssistantPayoutBatchItem $lockedItem */
            $lockedItem = AssistantPayoutBatchItem::where('id', $item->id)->lockForUpdate()->firstOrFail();

            if ($lockedItem->status !== 'pending') {
                throw new RuntimeException("Cannot fail batch item in status ({$lockedItem->status}). Must be pending.");
            }

            $lockedItem->update([
                'status' => 'failed',
                'settlement_category' => 'unsettled_rejected',
                'rejection_reason' => $rejectionReason,
            ]);

            $batch = $lockedItem->batch()->lockForUpdate()->first();
            $pendingCount = AssistantPayoutBatchItem::where('batch_id', $batch->id)
                ->where('status', 'pending')
                ->count();

            if ($pendingCount === 0) {
                $batch->update([
                    'status' => 'completed',
                    'confirmed_by_id' => $confirmer->id,
                    'confirmed_at' => now(),
                ]);
            }

            SecurityAuditLog::create([
                'actor_id' => $confirmer->id,
                'actor_role' => $confirmer->roles->first()?->name ?? 'admin',
                'event_category' => 'assistant_rewards_admin',
                'action' => 'fail_payout_transfer',
                'resource_type' => 'AssistantPayoutBatchItem',
                'resource_id' => $lockedItem->id,
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'user_agent' => request()->userAgent() ?? 'CLI',
                'details' => [
                    'batch_id' => $lockedItem->batch_id,
                    'assistant_id' => $lockedItem->assistant_id,
                    'amount' => (float) $lockedItem->amount,
                    'rejection_reason' => $rejectionReason,
                ],
            ]);
        });
    }

    /**
     * Atomically cancel an unpaid payout batch.
     * Releases attached rewards back to pending balance.
     */
    public function cancelBatch(AssistantPayoutBatch $batch, string $cancellationReason, User $actor): void
    {
        if (empty(trim($cancellationReason))) {
            throw new InvalidArgumentException('A non-empty cancellation reason is required.');
        }

        DB::transaction(function () use ($batch, $cancellationReason, $actor) {
            /** @var AssistantPayoutBatch $lockedBatch */
            $lockedBatch = AssistantPayoutBatch::where('id', $batch->id)->lockForUpdate()->firstOrFail();

            if ($lockedBatch->status !== 'pending') {
                throw new RuntimeException("Cannot cancel batch in status ({$lockedBatch->status}). Only pending batches can be cancelled.");
            }

            $items = AssistantPayoutBatchItem::where('batch_id', $lockedBatch->id)->lockForUpdate()->get();

            foreach ($items as $item) {
                if ($item->status !== 'pending') {
                    throw new RuntimeException("Cannot cancel batch: Item ({$item->id}) is in status ({$item->status}). All items must be pending.");
                }
            }

            // Release all attached rewards back to pending pool
            foreach ($items as $item) {
                AssistantReward::where('payout_batch_item_id', $item->id)->update([
                    'payout_batch_item_id' => null,
                    'settlement_status' => 'pending',
                ]);
            }

            // Set items to cancelled
            AssistantPayoutBatchItem::where('batch_id', $lockedBatch->id)->update([
                'status' => 'cancelled',
                'settlement_category' => 'cancelled',
                'rejection_reason' => "Batch cancelled: {$cancellationReason}",
            ]);

            $lockedBatch->update([
                'status' => 'cancelled',
            ]);

            SecurityAuditLog::create([
                'actor_id' => $actor->id,
                'actor_role' => $actor->roles->first()?->name ?? 'admin',
                'event_category' => 'assistant_rewards_admin',
                'action' => 'cancel_payout_batch',
                'resource_type' => 'AssistantPayoutBatch',
                'resource_id' => $lockedBatch->id,
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'user_agent' => request()->userAgent() ?? 'CLI',
                'details' => [
                    'batch_number' => $lockedBatch->batch_number,
                    'cancellation_reason' => $cancellationReason,
                    'total_recipients' => $lockedBatch->total_recipients,
                    'total_amount' => (float) $lockedBatch->total_amount,
                ],
            ]);

            Log::info("Cancelled payout batch {$lockedBatch->batch_number} by user {$actor->id}. Reason: {$cancellationReason}");
        });
    }

    /**
     * Handle returned/bounced postal transfer as an independent financial incident (DEC-08).
     * Preserves original batch item and creates compensating credit transaction.
     */
    public function handleTransferReturn(
        AssistantPayoutBatchItem $item,
        float $returnedAmount,
        string $returnReason,
        User $actor,
        ?string $postalReference = null,
        ?string $idempotencyKey = null
    ): PayoutBounceIncident {
        $this->authorizePayoutConfirmation($actor);

        if ($returnedAmount <= 0) {
            throw new InvalidArgumentException('Returned amount must be strictly positive.');
        }

        $postalReference = $postalReference ?: ("POST-RTN-{$item->id}-" . (($item->return_count ?? 0) + 1));
        $idempotencyKey = $idempotencyKey ?: ("RTN:ITEM:{$item->id}:REF:{$postalReference}");

        $payloadHash = hash('sha256', json_encode([
            'batch_item_id' => $item->id,
            'amount' => number_format($returnedAmount, 2, '.', ''),
            'postal_ref' => $postalReference,
        ]));

        return DB::transaction(function () use ($item, $returnedAmount, $returnReason, $actor, $postalReference, $idempotencyKey, $payloadHash) {
            // Level 1 & 2: Lock User and Balance
            User::where('id', $item->assistant_id)->lockForUpdate()->firstOrFail();
            AssistantRewardBalance::where('assistant_id', $item->assistant_id)->lockForUpdate()->firstOrFail();

            // Level 5 & 6: Lock Batch and Item
            AssistantPayoutBatch::where('id', $item->batch_id)->lockForUpdate()->firstOrFail();
            /** @var AssistantPayoutBatchItem $lockedItem */
            $lockedItem = AssistantPayoutBatchItem::where('id', $item->id)->lockForUpdate()->firstOrFail();

            // Idempotency Gate
            $existingIncident = PayoutBounceIncident::where('idempotency_key', $idempotencyKey)->first();
            if ($existingIncident) {
                if ($existingIncident->payload_hash !== $payloadHash) {
                    throw new InvalidArgumentException("Idempotency key [{$idempotencyKey}] already used with different parameters.");
                }
                return $existingIncident;
            }

            // Duplicate Postal Reference check for this item
            $existingPostal = PayoutBounceIncident::where('batch_item_id', $lockedItem->id)
                ->where('postal_reference', $postalReference)
                ->exists();
            if ($existingPostal) {
                throw new InvalidArgumentException("Postal return reference [{$postalReference}] has already been processed for this payout item.");
            }

            // Status check: must be refundable ('paid' or 'partially_returned')
            if (!in_array($lockedItem->status, ['paid', 'partially_returned'], true)) {
                throw new RuntimeException("Cannot process return for batch item in status ({$lockedItem->status}). Must be paid or partially_returned.");
            }

            // Refundable Bounds Verification using bcmath
            $netAmount = bcsub((string) $lockedItem->net_amount, '0.00', 2);
            $alreadyReturned = bcsub((string) ($lockedItem->returned_amount ?? 0), '0.00', 2);
            $remainingRefundable = bcsub($netAmount, $alreadyReturned, 2);
            $requestedReturn = bcsub((string) $returnedAmount, '0.00', 2);

            if (bccomp($requestedReturn, '0.00', 2) <= 0) {
                throw new InvalidArgumentException('Returned amount must be strictly positive.');
            }

            if (bccomp($requestedReturn, $remainingRefundable, 2) === 1) {
                throw new InvalidArgumentException("Returned amount ({$requestedReturn} DZD) exceeds remaining refundable balance ({$remainingRefundable} DZD).");
            }

            // Create Incident row
            $incident = PayoutBounceIncident::create([
                'batch_item_id' => $lockedItem->id,
                'batch_id' => $lockedItem->batch_id,
                'assistant_id' => $lockedItem->assistant_id,
                'returned_amount_dzd' => (float) $requestedReturn,
                'return_reason' => $returnReason,
                'postal_reference' => $postalReference,
                'idempotency_key' => $idempotencyKey,
                'payload_hash' => $payloadHash,
                'incident_status' => 'settled',
                'verified_by_id' => $actor->id,
                'verified_at' => now(),
            ]);

            // Compensating credit transaction back to assistant's balance
            $transaction = $this->ledgerService->recordTransaction(
                assistantId: $lockedItem->assistant_id,
                transactionType: 'payout_transfer_reversal',
                direction: 'credit',
                amount: (float) $requestedReturn,
                referenceType: 'payout_bounce_incident',
                referenceId: $incident->id,
                idempotencyKey: "payout_transfer_reversal:incident:{$incident->id}",
                notes: "Returned postal transfer credited back for item #{$lockedItem->id} (Ref: {$postalReference}). Reason: {$returnReason}",
                createdBy: $actor->id
            );

            // Link transaction to incident
            $incident->transaction_id = $transaction->id;
            $incident->save();

            // Update payout item state
            $newReturnedTotal = bcadd($alreadyReturned, $requestedReturn, 2);
            $newReturnCount = ($lockedItem->return_count ?? 0) + 1;
            $newStatus = (bccomp($newReturnedTotal, $netAmount, 2) === 0) ? 'fully_returned' : 'partially_returned';

            $lockedItem->returned_amount = (float) $newReturnedTotal;
            $lockedItem->return_count = $newReturnCount;
            $lockedItem->status = $newStatus;
            $lockedItem->save();

            SecurityAuditLog::create([
                'actor_id' => $actor->id,
                'actor_role' => $actor->roles->first()?->name ?? 'admin',
                'event_category' => 'assistant_rewards_admin',
                'action' => 'return_payout_transfer',
                'resource_type' => 'AssistantPayoutBatchItem',
                'resource_id' => $lockedItem->id,
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'user_agent' => request()->userAgent() ?? 'CLI',
                'details' => [
                    'incident_id' => $incident->id,
                    'batch_id' => $lockedItem->batch_id,
                    'assistant_id' => $lockedItem->assistant_id,
                    'returned_amount' => (float) $requestedReturn,
                    'remaining_refundable' => (float) bcsub($remainingRefundable, $requestedReturn, 2),
                    'return_reason' => $returnReason,
                    'postal_reference' => $postalReference,
                    'new_status' => $newStatus,
                ],
            ]);

            Log::info("Processed postal transfer return of {$requestedReturn} DZD (incident #{$incident->id}) for assistant {$lockedItem->assistant_id} on item {$lockedItem->id}. Status now: {$newStatus}.");

            return $incident;
        });
    }
}
