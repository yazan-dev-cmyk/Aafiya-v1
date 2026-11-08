<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AssistantPayoutBatchItem;
use App\Models\AssistantReward;
use App\Models\ClinicAssistant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AssistantRewardReversalService
{
    public function __construct(
        protected AssistantLedgerService $ledgerService
    ) {}

    /**
     * Handle appointment cancellation/rejection according to the cancellation matrix.
     * Compliant with DEC-01: strictly deducts the actual earned reward snapshot amount ($reward->amount).
     */
    public function handleCancellation(Appointment $appointment, ?User $actor = null, ?string $reason = null): void
    {
        DB::transaction(function () use ($appointment, $actor, $reason) {
            /** @var AssistantReward|null $reward */
            $reward = AssistantReward::where('appointment_id', $appointment->id)
                ->lockForUpdate()
                ->first();

            if (!$reward) {
                return;
            }

            // Already handled
            if ($reward->cancellation_status !== 'none') {
                return;
            }

            // Deduct actual monetary reward value recorded on the specific appointment record (DEC-01 Rule 1)
            $actualRewardAmount = (float) $reward->amount;

            // Check if assistant is departed from the clinic
            $clinicAssistant = ClinicAssistant::withTrashed()->find($reward->clinic_assistant_id);
            $isDeparted = !$clinicAssistant || $clinicAssistant->trashed() || !$clinicAssistant->is_active;

            if ($isDeparted) {
                // Post-departure cancellation: Platform absorbs the loss
                $isPaid = ($reward->settlement_status === 'settled') ||
                    AssistantPayoutBatchItem::where('assistant_id', $reward->assistant_id)
                        ->whereIn('status', ['paid', 'partially_returned', 'fully_returned'])
                        ->exists();

                $lossCategory = $isPaid
                    ? 'post_departure_cancellation' // Scenario B
                    : 'post_departure_pre_payout_cancellation'; // Scenario C (Decision REW-DEC-07)

                $this->ledgerService->recordPlatformLoss(
                    assistantId: $reward->assistant_id,
                    appointmentId: $appointment->id,
                    lossCategory: $lossCategory,
                    amount: $actualRewardAmount,
                    reason: "Platform operational loss on post-departure cancellation of appointment #{$appointment->id} (Reason: {$reason})",
                    metadata: [
                        'actor_id' => $actor?->id,
                        'clinic_id' => $appointment->clinic_id,
                        'is_paid' => $isPaid,
                        'reward_id' => $reward->id,
                        'actual_reward_amount' => $actualRewardAmount,
                    ]
                );

                $reward->cancellation_status = 'absorbed';
                $reward->save();

                Log::info("Platform absorbed {$lossCategory} loss of {$actualRewardAmount} DZD for departed assistant {$reward->assistant_id} on appointment {$appointment->id}.");
                return;
            }

            // Assistant is active: evaluate actor against Cancellation Matrix
            $isClinicActor = false;
            if ($actor) {
                if ($actor->hasRole('doctor_assistant')) {
                    $isClinicActor = true;
                } elseif ($actor->doctor && ($actor->doctor->id === $appointment->doctor_id || $actor->doctor->isDirectorOf($appointment->clinic_id))) {
                    $isClinicActor = true;
                } elseif ($actor->clinicAssistant && $actor->clinicAssistant->clinic_id === $appointment->clinic_id) {
                    $isClinicActor = true;
                }
            }

            if ($isClinicActor) {
                // Clinic employee / doctor cancelled -> Actual reward snapshot amount deduction applies (DEC-01)
                $this->ledgerService->recordTransaction(
                    assistantId: $reward->assistant_id,
                    transactionType: 'cancellation_deduction',
                    direction: 'debit',
                    amount: $actualRewardAmount,
                    referenceType: 'appointment',
                    referenceId: $appointment->id,
                    idempotencyKey: "cancellation_deduction:appointment:{$appointment->id}",
                    notes: "Deduction due to clinic staff cancellation of appointment #{$appointment->id} (Actual reward: {$actualRewardAmount} DZD)",
                    createdBy: $actor?->id
                );

                $reward->cancellation_status = 'deducted';
                $reward->save();

                Log::info("Assistant {$reward->assistant_id} deducted {$actualRewardAmount} DZD for clinic-initiated cancellation of appointment {$appointment->id}.");
            } else {
                // Patient, Booking Center, Admin, or System cancelled -> Zero deduction, assistant keeps reward
                Log::info("Appointment {$appointment->id} cancelled by non-clinic actor ({$actor?->id}). Assistant {$reward->assistant_id} retains reward.");
            }
        });
    }
}