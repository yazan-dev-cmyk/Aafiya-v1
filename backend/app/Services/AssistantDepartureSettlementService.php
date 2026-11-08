<?php

namespace App\Services;

use App\Models\AssistantPayoutBatch;
use App\Models\AssistantPayoutBatchItem;
use App\Models\AssistantPayoutProfile;
use App\Models\AssistantRewardBalance;
use App\Models\ClinicAssistant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AssistantDepartureSettlementService
{
    public function __construct(
        protected AssistantLedgerService $ledgerService
    ) {}

    /**
     * Settle assistant rewards and balance upon departure from clinic.
     */
    public function processDeparture(ClinicAssistant $clinicAssistant, ?User $actor = null): array
    {
        return DB::transaction(function () use ($clinicAssistant, $actor) {
            $assistantId = $clinicAssistant->user_id;
            $balance = $this->ledgerService->getOrCreateBalance($assistantId);

            $currentBalance = (float) $balance->current_balance;

            // Scenario A: Negative balance (Deficit) at departure -> Platform absorbs loss
            if ($currentBalance < 0) {
                $deficitAmount = abs($currentBalance);

                $this->ledgerService->recordPlatformLoss(
                    assistantId: $assistantId,
                    appointmentId: null,
                    lossCategory: 'departure_deficit_absorption',
                    amount: $deficitAmount,
                    reason: "Platform absorbed departure deficit for assistant {$assistantId} upon leaving clinic {$clinicAssistant->clinic_id}",
                    metadata: [
                        'clinic_id' => $clinicAssistant->clinic_id,
                        'clinic_assistant_id' => $clinicAssistant->id,
                        'actor_id' => $actor?->id,
                    ]
                );

                $this->ledgerService->recordTransaction(
                    assistantId: $assistantId,
                    transactionType: 'departure_deficit_relief',
                    direction: 'credit',
                    amount: $deficitAmount,
                    referenceType: 'departure_settlement',
                    referenceId: $clinicAssistant->id,
                    idempotencyKey: "departure_deficit_relief:assistant:{$assistantId}:{$clinicAssistant->id}",
                    notes: "Platform absorbed departure deficit of {$deficitAmount} DZD",
                    createdBy: $actor?->id
                );

                Log::info("Platform absorbed departure deficit of {$deficitAmount} DZD for assistant {$assistantId}.");

                return [
                    'status' => 'deficit_absorbed',
                    'amount_absorbed' => $deficitAmount,
                    'final_balance' => 0.00,
                ];
            }

            // Positive balance -> Eligible for departure exit payout
            if ($currentBalance > 0) {
                $activeProfile = AssistantPayoutProfile::where('assistant_id', $assistantId)
                    ->where('status', 'active')
                    ->first();

                if ($activeProfile) {
                    $batchNumber = 'DEP-' . strtoupper(Str::random(10));
                    $batch = AssistantPayoutBatch::create([
                        'batch_number' => $batchNumber,
                        'period_start' => now()->startOfMonth()->toDateString(),
                        'period_end' => now()->toDateString(),
                        'status' => 'pending',
                        'total_recipients' => 1,
                        'total_amount' => $currentBalance,
                        'generated_by_id' => $actor?->id,
                    ]);

                    $item = AssistantPayoutBatchItem::create([
                        'batch_id' => $batch->id,
                        'assistant_id' => $assistantId,
                        'payout_profile_id' => $activeProfile->id,
                        'amount' => $currentBalance,
                        'status' => 'pending',
                    ]);

                    Log::info("Created departure payout batch {$batchNumber} for assistant {$assistantId} with amount {$currentBalance} DZD.");

                    return [
                        'status' => 'payout_queued',
                        'payout_batch_id' => $batch->id,
                        'payout_batch_item_id' => $item->id,
                        'amount' => $currentBalance,
                    ];
                }

                Log::warning("Assistant {$assistantId} departed with balance {$currentBalance} DZD but no active RIP profile.");
                return [
                    'status' => 'pending_profile',
                    'amount' => $currentBalance,
                ];
            }

            return [
                'status' => 'settled_zero',
                'amount' => 0.00,
            ];
        });
    }
}