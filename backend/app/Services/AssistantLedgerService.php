<?php

namespace App\Services;

use App\Models\AssistantReward;
use App\Models\AssistantRewardAllocation;
use App\Models\AssistantRewardBalance;
use App\Models\AssistantRewardTransaction;
use App\Models\AssistantUnabsorbedDebt;
use App\Models\PlatformOperationalLoss;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class AssistantLedgerService
{
    /**
     * Get existing balance or initialize a new record.
     */
    public function getOrCreateBalance(string $assistantId): AssistantRewardBalance
    {
        return AssistantRewardBalance::firstOrCreate(
            ['assistant_id' => $assistantId],
            [
                'current_balance' => 0.00,
                'total_earned' => 0.00,
                'total_reversed' => 0.00,
                'total_deducted' => 0.00,
                'total_paid' => 0.00,
                'total_relieved' => 0.00,
                'version' => 1,
            ]
        );
    }

    /**
     * Record a financial transaction on the assistant rewards ledger with pessimistic locking.
     */
    public function recordTransaction(
        string $assistantId,
        string $transactionType,
        string $direction,
        float $amount,
        string $referenceType,
        string $referenceId,
        string $idempotencyKey,
        ?string $notes = null,
        ?string $createdBy = null
    ): AssistantRewardTransaction {
        if ($amount < 0) {
            throw new InvalidArgumentException('Transaction amount must be non-negative.');
        }

        if (!in_array($direction, ['credit', 'debit'], true)) {
            throw new InvalidArgumentException("Invalid transaction direction: {$direction}");
        }

        return DB::transaction(function () use (
            $assistantId,
            $transactionType,
            $direction,
            $amount,
            $referenceType,
            $referenceId,
            $idempotencyKey,
            $notes,
            $createdBy
        ) {
            // Idempotency check: if transaction already exists, return existing record
            $existing = AssistantRewardTransaction::where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                return $existing;
            }

            // Ensure balance record exists and acquire pessimistic write lock
            $this->getOrCreateBalance($assistantId);
            $balance = AssistantRewardBalance::where('assistant_id', $assistantId)
                ->lockForUpdate()
                ->firstOrFail();

            $balanceBefore = (float) $balance->current_balance;

            if ($direction === 'credit') {
                $balanceAfter = round($balanceBefore + $amount, 2);
                if ($transactionType === 'reward_earned') {
                    $balance->total_earned = round((float) $balance->total_earned + $amount, 2);
                } elseif ($transactionType === 'departure_deficit_relief') {
                    $balance->total_relieved = round((float) $balance->total_relieved + $amount, 2);
                }
            } else {
                $balanceAfter = round($balanceBefore - $amount, 2);
                if ($transactionType === 'cancellation_deduction') {
                    $balance->total_deducted = round((float) $balance->total_deducted + $amount, 2);
                } elseif ($transactionType === 'payout_settlement') {
                    $balance->total_paid = round((float) $balance->total_paid + $amount, 2);
                }
            }

            $balance->current_balance = $balanceAfter;
            $balance->version += 1;
            $balance->save();

            $tx = AssistantRewardTransaction::create([
                'assistant_id' => $assistantId,
                'transaction_type' => $transactionType,
                'direction' => $direction,
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'idempotency_key' => $idempotencyKey,
                'notes' => $notes,
                'created_by' => $createdBy,
            ]);

            // Track unabsorbed debt if this is a cancellation deduction (COR-02 / COR-13)
            if ($transactionType === 'cancellation_deduction') {
                AssistantUnabsorbedDebt::create([
                    'assistant_id' => $assistantId,
                    'transaction_id' => $tx->id,
                    'initial_debt_dzd' => $amount,
                    'settled_offset_dzd' => 0.00,
                    'remaining_debt_dzd' => $amount,
                    'debt_status' => 'open',
                    'genesis_reason' => $notes ?? "Cancellation deduction for {$referenceType} #{$referenceId}",
                ]);
            }

            return $tx;
        });
    }

    /**
     * Record platform operational loss.
     */
    public function recordPlatformLoss(
        string $assistantId,
        ?string $appointmentId,
        string $lossCategory,
        float $amount,
        string $reason,
        array $metadata = []
    ): PlatformOperationalLoss {
        return PlatformOperationalLoss::create([
            'assistant_id' => $assistantId,
            'appointment_id' => $appointmentId,
            'loss_category' => $lossCategory,
            'amount' => $amount,
            'currency' => 'DZD',
            'reason' => $reason,
            'metadata' => $metadata,
        ]);
    }

    /**
     * Reconstruct and reconcile balance and reward projections against ledger source of truth (COR-05).
     */
    public function reconcileProjections(string $assistantId): array
    {
        return DB::transaction(function () use ($assistantId) {
            $balance = AssistantRewardBalance::where('assistant_id', $assistantId)->lockForUpdate()->first();
            if (!$balance) {
                return ['status' => 'not_found'];
            }

            $credits = (float) AssistantRewardTransaction::where('assistant_id', $assistantId)
                ->where('direction', 'credit')
                ->sum('amount');

            $debits = (float) AssistantRewardTransaction::where('assistant_id', $assistantId)
                ->where('direction', 'debit')
                ->sum('amount');

            $calculatedBalance = round($credits - $debits, 2);

            $discrepancy = round((float) $balance->current_balance - $calculatedBalance, 2);
            if ($discrepancy != 0.00) {
                $balance->current_balance = $calculatedBalance;
                $balance->save();
            }

            return [
                'assistant_id' => $assistantId,
                'previous_balance' => (float) $balance->current_balance,
                'reconciled_balance' => $calculatedBalance,
                'discrepancy' => $discrepancy,
                'status' => ($discrepancy == 0.00) ? 'synchronized' : 'reconciled_correction',
            ];
        });
    }

    /**
     * Verify that the stored balance matches sum of credits minus sum of debits.
     */
    public function verifyBalanceInvariant(string $assistantId): bool
    {
        $balance = AssistantRewardBalance::find($assistantId);
        if (!$balance) {
            return true;
        }

        $credits = (float) AssistantRewardTransaction::where('assistant_id', $assistantId)
            ->where('direction', 'credit')
            ->sum('amount');

        $debits = (float) AssistantRewardTransaction::where('assistant_id', $assistantId)
            ->where('direction', 'debit')
            ->sum('amount');

        return abs(((float) $balance->current_balance) - ($credits - $debits)) < 0.001;
    }
}

