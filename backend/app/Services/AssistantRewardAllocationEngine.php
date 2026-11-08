<?php

namespace App\Services;

use App\Models\AssistantPayoutBatchItem;
use App\Models\AssistantReward;
use App\Models\AssistantRewardAllocation;
use App\Models\AssistantUnabsorbedDebt;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AssistantRewardAllocationEngine
{
    /**
     * Retrieve candidate rewards for payout cycle evaluation.
     * Guaranteed to pick up unbatched pending rewards where confirmed_at < cycle_end
     * as well as previously deferred rewards (COR-01).
     */
    public function getCandidateRewards(string $assistantId, Carbon $cycleEndUtc): Collection
    {
        return AssistantReward::where('assistant_id', $assistantId)
            ->whereNull('payout_batch_item_id')
            ->where(function ($query) use ($cycleEndUtc) {
                $query->where(function ($sub) use ($cycleEndUtc) {
                    $sub->where('settlement_status', 'pending')
                        ->where(function ($q) use ($cycleEndUtc) {
                            $q->whereNull('confirmed_at')
                              ->orWhere('confirmed_at', '<', $cycleEndUtc);
                        });
                })->orWhere('settlement_status', 'deferred');
            })
            ->orderByRaw('COALESCE(confirmed_at, created_at) ASC')
            ->orderBy('id', 'ASC')
            ->get();
    }

    /**
     * Retrieve all outstanding unabsorbed debts for assistant.
     */
    public function getOpenDebts(string $assistantId): Collection
    {
        return AssistantUnabsorbedDebt::where('assistant_id', $assistantId)
            ->whereIn('debt_status', ['open', 'partially_settled'])
            ->where('remaining_debt_dzd', '>', 0)
            ->orderBy('created_at', 'ASC')
            ->orderBy('id', 'ASC')
            ->get();
    }

    /**
     * Calculate settlement preview using deterministic FIFO and strict Pnet threshold evaluation.
     * Compliant with DEC-04 Rule 6:
     * - Threshold evaluated exclusively on Pnet = G - D_applied
     * - Gross G is NEVER used as threshold criteria
     */
    public function previewSettlement(Collection $candidateRewards, Collection $openDebts, float $threshold = 5000.00): array
    {
        $grossRewards = 0.00;
        foreach ($candidateRewards as $reward) {
            $grossRewards += $reward->outstanding_amount;
        }
        $grossRewards = round($grossRewards, 2);

        $totalOpenDebt = 0.00;
        foreach ($openDebts as $debt) {
            $totalOpenDebt += (float) $debt->remaining_debt_dzd;
        }
        $totalOpenDebt = round($totalOpenDebt, 2);

        $debtApplied = min($grossRewards, $totalOpenDebt);
        $pnet = round($grossRewards - $debtApplied, 2);
        $debtCarryForward = round($totalOpenDebt - $debtApplied, 2);

        $isThresholdMet = ($pnet >= $threshold);

        return [
            'gross_rewards' => $grossRewards,
            'open_debt' => $totalOpenDebt,
            'debt_applied' => $debtApplied,
            'pnet' => $pnet,
            'carryforward_debt' => $debtCarryForward,
            'threshold' => $threshold,
            'is_threshold_met' => $isThresholdMet,
            'eligible_for_payout' => $isThresholdMet,
            'candidate_count' => $candidateRewards->count(),
            'debt_count' => $openDebts->count(),
        ];
    }

    /**
     * Execute atomic FIFO allocations of rewards against debts and batch item.
     */
    public function executeFifoAllocations(
        AssistantPayoutBatchItem $batchItem,
        Collection $candidateRewards,
        Collection $openDebts,
        ?User $actor = null,
        ?string $systemActor = null
    ): array {
        return DB::transaction(function () use ($batchItem, $candidateRewards, $openDebts, $actor, $systemActor) {
            $allocations = [];
            // Defensively sort candidate rewards by confirmed_at/created_at ASC, id ASC
            $candidateRewards = $candidateRewards->sortBy(fn($r) => [
                ($r->confirmed_at ?? $r->created_at)->timestamp,
                $r->id
            ])->values();

            $debtList = $openDebts->values()->all();
            $debtIndex = 0;

            $totalCashAllocated = 0.00;
            $totalDebtOffset = 0.00;

            foreach ($candidateRewards as $reward) {
                /** @var AssistantReward $lockedReward */
                $lockedReward = AssistantReward::where('id', $reward->id)->lockForUpdate()->firstOrFail();
                $rewardRem = $lockedReward->outstanding_amount;

                $rewardPaidAmount = (float) ($lockedReward->paid_amount_dzd ?? 0.00);
                $rewardOffsetAmount = (float) ($lockedReward->offset_amount_dzd ?? 0.00);

                // If reward has already been allocated to this batch item, retrieve existing allocations idempotently
                if ($rewardRem <= 0 && $lockedReward->payout_batch_item_id === $batchItem->id) {
                    $existingForReward = AssistantRewardAllocation::where('batch_item_id', $batchItem->id)
                        ->where('reward_id', $lockedReward->id)
                        ->get();
                    if ($existingForReward->isNotEmpty()) {
                        foreach ($existingForReward as $existingAlloc) {
                            $allocations[] = $existingAlloc;
                            if ($existingAlloc->allocation_type === 'cash_wire') {
                                $totalCashAllocated = round($totalCashAllocated + (float) $existingAlloc->amount, 2);
                            } else {
                                $totalDebtOffset = round($totalDebtOffset + (float) $existingAlloc->amount, 2);
                            }
                        }
                        continue;
                    }
                }

                // Step 1: Satisfy open debts first using FIFO
                while ($rewardRem > 0 && $debtIndex < count($debtList)) {
                    /** @var AssistantUnabsorbedDebt $debt */
                    $debt = $debtList[$debtIndex];
                    /** @var AssistantUnabsorbedDebt $lockedDebt */
                    $lockedDebt = AssistantUnabsorbedDebt::where('id', $debt->id)->lockForUpdate()->firstOrFail();
                    $debtRem = (float) $lockedDebt->remaining_debt_dzd;

                    if ($debtRem <= 0) {
                        $debtIndex++;
                        continue;
                    }

                    $offsetAmt = round(min($rewardRem, $debtRem), 2);

                    // Deterministic idempotency key for allocation
                    $allocKey = "ALLOC:ITEM:{$batchItem->id}:R:{$lockedReward->id}:D:{$lockedDebt->id}";

                    $allocation = AssistantRewardAllocation::firstOrCreate(
                        ['idempotency_key' => $allocKey],
                        [
                            'reward_id' => $lockedReward->id,
                            'batch_item_id' => $batchItem->id,
                            'debt_id' => $lockedDebt->id,
                            'debt_transaction_id' => $lockedDebt->transaction_id,
                            'allocation_type' => 'debt_offset',
                            'amount' => $offsetAmt,
                            'actor_id' => $actor?->id,
                            'system_actor' => $systemActor,
                        ]
                    );
                    $allocations[] = $allocation;

                    if ($allocation->wasRecentlyCreated) {
                        $rewardRem = round($rewardRem - $offsetAmt, 2);
                        $rewardOffsetAmount = round($rewardOffsetAmount + $offsetAmt, 2);
                        $totalDebtOffset = round($totalDebtOffset + $offsetAmt, 2);

                        $newRemainingDebt = round($debtRem - $offsetAmt, 2);
                        $newSettledOffset = round((float) $lockedDebt->settled_offset_dzd + $offsetAmt, 2);
                        $lockedDebt->remaining_debt_dzd = $newRemainingDebt;
                        $lockedDebt->settled_offset_dzd = $newSettledOffset;
                        $lockedDebt->debt_status = ($newRemainingDebt == 0) ? 'fully_settled' : 'partially_settled';
                        $lockedDebt->save();

                        // Update memory object
                        $debt->remaining_debt_dzd = $newRemainingDebt;

                        if ($newRemainingDebt == 0) {
                            $debtIndex++;
                        }
                    } else {
                        // In case of idempotent replay, adjust in-memory trackers
                        $rewardRem = round($rewardRem - (float) $allocation->amount, 2);
                        $debtRem = (float) $lockedDebt->remaining_debt_dzd;
                        if ($debtRem <= 0) {
                            $debtIndex++;
                        }
                    }
                }

                // Step 2: Remaining reward goes to cash wire
                if ($rewardRem > 0) {
                    $cashAmt = $rewardRem;
                    $allocKey = "ALLOC:ITEM:{$batchItem->id}:R:{$lockedReward->id}:CASH";

                    $allocation = AssistantRewardAllocation::firstOrCreate(
                        ['idempotency_key' => $allocKey],
                        [
                            'reward_id' => $lockedReward->id,
                            'batch_item_id' => $batchItem->id,
                            'debt_id' => null,
                            'debt_transaction_id' => null,
                            'allocation_type' => 'cash_wire',
                            'amount' => $cashAmt,
                            'actor_id' => $actor?->id,
                            'system_actor' => $systemActor,
                        ]
                    );
                    $allocations[] = $allocation;

                    if ($allocation->wasRecentlyCreated) {
                        $rewardPaidAmount = round($rewardPaidAmount + $cashAmt, 2);
                        $totalCashAllocated = round($totalCashAllocated + $cashAmt, 2);
                    }
                    $rewardRem = 0.00;
                }

                // Determine reward settlement status
                $rewardTotal = (float) $lockedReward->amount;
                if ($rewardPaidAmount >= $rewardTotal) {
                    $newStatus = 'settled_paid';
                } elseif ($rewardOffsetAmount >= $rewardTotal) {
                    $newStatus = 'settled_offset';
                } elseif ($rewardPaidAmount > 0 && $rewardOffsetAmount > 0) {
                    $newStatus = 'settled_partial';
                } else {
                    $newStatus = 'batched';
                }

                $lockedReward->paid_amount_dzd = $rewardPaidAmount;
                $lockedReward->offset_amount_dzd = $rewardOffsetAmount;
                $lockedReward->settlement_status = $newStatus;
                $lockedReward->payout_batch_item_id = $batchItem->id;
                $lockedReward->save();
            }

            return [
                'cash_allocated' => $totalCashAllocated,
                'debt_offset' => $totalDebtOffset,
                'allocations' => $allocations,
            ];
        });
    }
}
