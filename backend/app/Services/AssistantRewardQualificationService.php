<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AssistantReward;
use App\Models\ClinicAssistant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AssistantRewardQualificationService
{
    public function __construct(
        protected AssistantLedgerService $ledgerService,
        protected AssistantRewardRateService $rateService,
        protected AssistantProgramLifecycleService $lifecycleService
    ) {}

    /**
     * Qualify an appointment for the doctor assistant reward upon confirmation.
     * Compliant with DEC-ARP-01, DEC-03 (dynamic rates), and DEC-05 (lifecycle).
     */
    public function qualifyAppointment(Appointment $appointment, ?User $actor = null): ?AssistantReward
    {
        // 1. Eligibility rule: Must be booked genuinely via Booking Center
        if (empty($appointment->booking_center_id) || $appointment->creator_type !== 'booking_center') {
            return null;
        }

        return DB::transaction(function () use ($appointment, $actor) {
            // 2. Idempotency: Do not duplicate if already qualified
            $existing = AssistantReward::where('appointment_id', $appointment->id)->first();
            if ($existing) {
                return $existing;
            }

            // 3. Identify the actual confirmation actor
            $confirmationActor = $actor;
            if (!$confirmationActor && $appointment->confirmed_by_id) {
                $confirmationActor = User::find($appointment->confirmed_by_id);
            }

            if (!$confirmationActor) {
                Log::info("No confirmation actor provided or found for appointment {$appointment->id}. Reward skipped.");
                return null;
            }

            // 4. Actor Eligibility: The confirmation actor MUST have the 'doctor_assistant' role.
            if (!$confirmationActor->hasRole('doctor_assistant')) {
                Log::info("Confirmation actor {$confirmationActor->id} is not a doctor assistant. Reward skipped for appointment {$appointment->id}.");
                return null;
            }

            // 5. Clinic Membership: The confirmation actor MUST have an active assistant membership in this clinic at confirmation time.
            $clinicAssistant = ClinicAssistant::where('user_id', $confirmationActor->id)
                ->where('clinic_id', $appointment->clinic_id)
                ->whereNull('deleted_at')
                ->where('is_active', true)
                ->first();

            if (!$clinicAssistant) {
                Log::info("Confirmation actor {$confirmationActor->id} does not have an active assistant membership in clinic {$appointment->clinic_id}. Reward skipped for appointment {$appointment->id}.");
                return null;
            }

            // 6. Temporal Rigor: Capture confirmed_at and earning_period in Africa/Algiers timezone
            $confirmedAt = $appointment->confirmed_at ? Carbon::parse($appointment->confirmed_at, 'Africa/Algiers') : now('Africa/Algiers');
            $earningPeriod = $confirmedAt->format('Y-m');

            // 7. Lifecycle Check (DEC-05 & DEC-06): Must be active and within notice deadline
            if (!$this->lifecycleService->isConfirmationEligible($confirmedAt)) {
                Log::info("Reward skipped for appointment {$appointment->id}: Program is not active or confirmation is post-deadline at {$confirmedAt->toDateTimeString()}.");
                return null;
            }

            // 8. Dynamic Rate Resolution (DEC-03): Resolve effective rate and schedule at confirmation moment
            $effectiveRate = $this->rateService->getEffectiveRateAt($confirmedAt);
            $effectiveSchedule = $this->rateService->getEffectiveScheduleAt($confirmedAt);

            // 9. Persist Assistant Reward exclusively for the confirming assistant with snapshot amount
            $reward = AssistantReward::create([
                'appointment_id' => $appointment->id,
                'assistant_id' => $clinicAssistant->user_id,
                'clinic_id' => $appointment->clinic_id,
                'clinic_assistant_id' => $clinicAssistant->id,
                'amount' => $effectiveRate,
                'rate_schedule_id' => $effectiveSchedule?->id,
                'confirmed_at' => $confirmedAt,
                'earning_period' => $earningPeriod,
                'settlement_status' => 'pending',
                'paid_amount_dzd' => 0.00,
                'offset_amount_dzd' => 0.00,
                'cancellation_status' => 'none',
            ]);

            // 10. Credit ledger transaction for the confirming assistant with snapshot amount
            $this->ledgerService->recordTransaction(
                assistantId: $clinicAssistant->user_id,
                transactionType: 'reward_earned',
                direction: 'credit',
                amount: $effectiveRate,
                referenceType: 'appointment',
                referenceId: $appointment->id,
                idempotencyKey: "reward_earned:appointment:{$appointment->id}",
                notes: "Reward earned for confirmed Booking Center appointment #{$appointment->id} (Rate: {$effectiveRate} DZD)",
                createdBy: $confirmationActor->id
            );

            return $reward;
        });
    }
}