<?php

namespace Tests\Feature\AssistantRewards;

use App\Models\Appointment;
use App\Models\AssistantPayoutBatch;
use App\Models\AssistantPayoutBatchItem;
use App\Models\AssistantPayoutProfile;
use App\Models\AssistantReward;
use App\Models\AssistantRewardAllocation;
use App\Models\AssistantRewardBalance;
use App\Models\AssistantRewardTransaction;
use App\Models\AssistantUnabsorbedDebt;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\PayoutBounceIncident;
use App\Models\User;
use App\Services\AssistantLedgerService;
use App\Services\AssistantPayoutProfileService;
use App\Services\AssistantPayoutService;
use App\Services\AssistantRewardAllocationEngine;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class FifoSettlementAndDebtOffsetTest extends TestCase
{
    use RefreshDatabase;

    protected AssistantPayoutService $payoutService;
    protected AssistantLedgerService $ledgerService;
    protected AssistantPayoutProfileService $profileService;
    protected AssistantRewardAllocationEngine $allocationEngine;

    protected User $superAdmin;
    protected User $assistantUser;
    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected ClinicAssistant $clinicAssistant;
    protected User $patientUser;
    protected Patient $patient;
    protected User $bcUser;
    protected BookingCenter $bookingCenter;
    protected AssistantPayoutProfile $payoutProfile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        $this->payoutService = app(AssistantPayoutService::class);
        $this->ledgerService = app(AssistantLedgerService::class);
        $this->profileService = app(AssistantPayoutProfileService::class);
        $this->allocationEngine = app(AssistantRewardAllocationEngine::class);

        Storage::fake('local');

        // Admin
        $this->superAdmin = User::factory()->create(['is_active' => true]);
        $this->superAdmin->assignRole('admin');

        // Doctor & Clinic
        $this->doctorUser = User::factory()->create(['is_active' => true]);
        $this->doctorUser->assignRole('doctor');
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-QUAL-' . rand(100, 999),
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة النور التجريبية',
            'address' => 'الجزائر العاصمة',
            'wilaya' => '16',
            'phone' => '0550000000',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 10,
            'slot_duration_min' => 60,
            'is_active' => true,
        ]);

        // Assistant
        $this->assistantUser = User::factory()->create(['is_active' => true]);
        $this->assistantUser->assignRole('doctor_assistant');

        $this->clinicAssistant = ClinicAssistant::create([
            'user_id' => $this->assistantUser->id,
            'clinic_id' => $this->clinic->id,
            'is_active' => true,
        ]);

        // Booking Center
        $this->bcUser = User::factory()->create(['is_active' => true]);
        $this->bcUser->assignRole('booking_center');
        $this->bookingCenter = BookingCenter::create([
            'user_id' => $this->bcUser->id,
            'name' => 'مركز حجز الأمل',
            'phone' => '021333444',
            'address' => 'الجزائر',
            'wilaya' => '16',
            'quota_balance' => 100,
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'verified_at' => now(),
            'is_active' => true,
        ]);

        // Patient
        $this->patientUser = User::factory()->create(['is_active' => true]);
        $this->patient = Patient::create([
            'user_id' => $this->patientUser->id,
            'mrn' => 'MRN-2026-' . rand(100000, 999999),
            'first_name' => 'Karim',
            'last_name' => 'Bensalem',
            'phone' => '0555999888',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
            'wilaya' => '16',
        ]);

        // Active Payout Profile
        $file = UploadedFile::fake()->create('cheque.pdf', 100, 'application/pdf');
        $this->payoutProfile = $this->profileService->submitProfile(
            $this->assistantUser,
            '00799999000123456789',
            $file
        );
        $this->profileService->verifyProfile($this->payoutProfile, $this->superAdmin, true);

        // Initialize Ledger Balance
        $this->ledgerService->getOrCreateBalance($this->assistantUser->id);
    }

    /**
     * Helper to create qualified rewards with deterministic confirmed_at
     */
    protected function createReward(float $amount, string $confirmedAt, string $period = '2026-10'): AssistantReward
    {
        $appointment = Appointment::create([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => 'Karim Bensalem',
            'patient_phone' => '0555999888',
            'booking_reference' => 'BK-' . strtoupper(Str::random(8)),
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '10:00',
            'creator_type' => 'booking_center',
            'booking_center_id' => $this->bookingCenter->id,
            'created_by_id' => $this->bcUser->id,
            'confirmed_at' => $confirmedAt,
            'confirmed_by_id' => $this->assistantUser->id,
            'status' => 'completed',
        ]);

        $reward = AssistantReward::create([
            'appointment_id' => $appointment->id,
            'assistant_id' => $this->assistantUser->id,
            'clinic_id' => $this->clinic->id,
            'clinic_assistant_id' => $this->clinicAssistant->id,
            'amount' => $amount,
            'confirmed_at' => $confirmedAt,
            'earning_period' => $period,
            'settlement_status' => 'pending',
            'paid_amount_dzd' => 0.00,
            'offset_amount_dzd' => 0.00,
            'cancellation_status' => 'none',
        ]);

        $this->ledgerService->recordTransaction(
            $this->assistantUser->id,
            'reward_earned',
            'credit',
            $amount,
            'appointment',
            $appointment->id,
            "reward_earned:test:{$appointment->id}",
            "Reward for appointment {$appointment->id}",
            $this->assistantUser->id
        );

        return $reward;
    }

    /**
     * Helper to create unabsorbed debt record
     */
    protected function createDebt(float $amount, string $createdAt, string $reason = 'Cancellation deduction'): AssistantUnabsorbedDebt
    {
        $tx = $this->ledgerService->recordTransaction(
            $this->assistantUser->id,
            'cancellation_deduction',
            'debit',
            $amount,
            'appointment_test',
            (string) Str::uuid(),
            "cancellation_deduction:test:" . Str::random(10),
            $reason,
            $this->superAdmin->id
        );

        return AssistantUnabsorbedDebt::where('transaction_id', $tx->id)->firstOrFail();
    }

    /**
     * MANDATORY TEST 1: G >= threshold while Pnet < threshold (DEC-04 Rule 6)
     */
    public function test_mandatory_pnet_below_threshold_skips_payout_and_preserves_rewards(): void
    {
        // 1. Create 50 rewards of 100 DZD = 5,000 DZD gross
        for ($i = 1; $i <= 50; $i++) {
            $this->createReward(100.00, "2026-10-15 10:00:00");
        }

        // 2. Create 3,000 DZD debt
        $debt = $this->createDebt(3000.00, "2026-10-10 09:00:00", "Cancellation of 30 appointments");

        // Assistant current balance in ledger is 2,000 DZD (5,000 - 3,000)
        $balance = AssistantRewardBalance::find($this->assistantUser->id);
        $this->assertEquals(2000.00, (float) $balance->current_balance);

        // 3. Attempt to generate monthly batch with threshold = 5,000 DZD
        $batch = $this->payoutService->generateMonthlyBatch('2026-10-01', '2026-10-31', $this->superAdmin, 5000.00);

        // Assert: No batch created because Pnet (2,000 DZD) < threshold (5,000 DZD)
        $this->assertNull($batch, 'No payout batch must be generated when Pnet is below threshold.');

        // 4. Invariant: Earned rewards MUST NOT be cancelled, deleted, or frozen
        $this->assertEquals(50, AssistantReward::where('assistant_id', $this->assistantUser->id)->count());
        $pendingCount = AssistantReward::where('assistant_id', $this->assistantUser->id)
            ->where('settlement_status', 'pending')
            ->whereNull('payout_batch_item_id')
            ->count();
        $this->assertEquals(50, $pendingCount, 'All 50 earned rewards must remain pending without forfeiture.');

        // 5. Invariant: Debt must remain open
        $debt->refresh();
        $this->assertEquals('open', $debt->debt_status);
        $this->assertEquals(3000.00, (float) $debt->remaining_debt_dzd);
        $this->assertEquals(0.00, (float) $debt->settled_offset_dzd);

        // 6. Preview must explicitly report reason as 'below_threshold'
        $preview = $this->payoutService->previewMonthlyBatch('2026-10-01', '2026-10-31', 5000.00);
        $this->assertEquals(0, $preview['eligible_assistants_count']);
        $this->assertEquals(1, $preview['excluded_assistants_count']);
        $this->assertEquals('below_threshold', $preview['excluded_assistants'][0]['reason']);
        $this->assertEquals(5000.00, (float) $preview['excluded_assistants'][0]['gross_amount']);
        $this->assertEquals(3000.00, (float) $preview['excluded_assistants'][0]['debt_offset_amount']);
        $this->assertEquals(2000.00, (float) $preview['excluded_assistants'][0]['pnet']);
    }

    /**
     * MANDATORY TEST 2: Pnet reaches threshold in subsequent cycle and settles via FIFO
     */
    public function test_subsequent_cycle_pnet_reaches_threshold_and_executes_fifo_settlement(): void
    {
        for ($i = 1; $i <= 50; $i++) {
            $this->createReward(100.00, "2026-10-15 10:00:00", "2026-10");
        }
        $debt = $this->createDebt(3000.00, "2026-10-10 09:00:00", "Initial October Debt");

        for ($i = 1; $i <= 30; $i++) {
            $this->createReward(100.00, "2026-11-10 11:00:00", "2026-11");
        }

        $batch = $this->payoutService->generateMonthlyBatch('2026-11-01', '2026-11-30', $this->superAdmin, 5000.00);

        $this->assertNotNull($batch);
        $this->assertEquals(5000.00, (float) $batch->applied_threshold_dzd);
        $this->assertEquals(1, $batch->total_recipients);
        $this->assertEquals(5000.00, (float) $batch->total_amount);

        $item = $batch->items->first();
        $this->assertEquals(8000.00, (float) $item->gross_amount);
        $this->assertEquals(3000.00, (float) $item->debt_offset_amount);
        $this->assertEquals(5000.00, (float) $item->net_amount);
        $this->assertEquals('partially_settled', $item->settlement_category);

        $this->payoutService->confirmBatchItem($item, 'CCP-TRANSFER-REF-999', $this->superAdmin);

        $item->refresh();
        $this->assertEquals('paid', $item->status);
        $this->assertEquals('CCP-TRANSFER-REF-999', $item->transfer_reference);

        $debt->refresh();
        $this->assertEquals('fully_settled', $debt->debt_status);
        $this->assertEquals(0.00, (float) $debt->remaining_debt_dzd);
        $this->assertEquals(3000.00, (float) $debt->settled_offset_dzd);

        $offsetAllocations = AssistantRewardAllocation::where('batch_item_id', $item->id)
            ->where('allocation_type', 'debt_offset')
            ->get();
        $this->assertEquals(3000.00, (float) $offsetAllocations->sum('amount'));

        $cashAllocations = AssistantRewardAllocation::where('batch_item_id', $item->id)
            ->where('allocation_type', 'cash_wire')
            ->get();
        $this->assertEquals(5000.00, (float) $cashAllocations->sum('amount'));

        $balance = AssistantRewardBalance::find($this->assistantUser->id);
        $this->assertEquals(0.00, (float) $balance->current_balance);
        $this->assertEquals(5000.00, (float) $balance->total_paid);
    }

    /**
     * TEST 3: Partial debt setoff across multiple debts and carry-forward
     */
    public function test_partial_debt_setoff_across_multiple_debts_and_carryforward(): void
    {
        for ($i = 1; $i <= 40; $i++) {
            $this->createReward(100.00, "2026-10-15 10:00:00");
        }
        $d1 = $this->createDebt(2500.00, "2026-09-10 08:00:00", "Debt 1");
        $d2 = $this->createDebt(3000.00, "2026-09-25 08:00:00", "Debt 2");

        $candidateRewards = $this->allocationEngine->getCandidateRewards($this->assistantUser->id, now());
        $openDebts = $this->allocationEngine->getOpenDebts($this->assistantUser->id);

        $settlement = $this->allocationEngine->previewSettlement($candidateRewards, $openDebts, 5000.00);

        $this->assertEquals(4000.00, $settlement['gross_rewards']);
        $this->assertEquals(5500.00, $settlement['open_debt']);
        $this->assertEquals(4000.00, $settlement['debt_applied']);
        $this->assertEquals(0.00, $settlement['pnet']);
        $this->assertEquals(1500.00, $settlement['carryforward_debt']);
        $this->assertFalse($settlement['is_threshold_met']);
    }

    /**
     * TEST 4: Batch deferral releases rewards back to available balance (DEC-B & DEC-02)
     */
    public function test_batch_deferral_releases_rewards_and_preserves_history(): void
    {
        for ($i = 1; $i <= 60; $i++) {
            $this->createReward(100.00, "2026-10-15 10:00:00");
        }

        $batch = $this->payoutService->generateMonthlyBatch('2026-10-01', '2026-10-31', $this->superAdmin, 5000.00);
        $this->assertNotNull($batch);
        $item = $batch->items->first();

        $this->payoutService->deferBatchItem($item, 'Postponed due to bank holiday verification', $this->superAdmin);

        $item->refresh();
        $this->assertEquals('deferred', $item->status);
        $this->assertEquals('unsettled_deferred', $item->settlement_category);

        $deferredCount = AssistantReward::where('assistant_id', $this->assistantUser->id)
            ->where('settlement_status', 'deferred')
            ->whereNull('payout_batch_item_id')
            ->count();
        $this->assertEquals(60, $deferredCount);

        $candidatesNext = $this->allocationEngine->getCandidateRewards($this->assistantUser->id, Carbon::parse('2026-11-30')->endOfDay());
        $this->assertEquals(60, $candidatesNext->count(), 'Deferred rewards must be picked up in subsequent candidate evaluation.');
    }

    /**
     * TEST 5: Batch cancellation releases rewards back to pending pool
     */
    public function test_batch_cancellation_releases_rewards_back_to_pending(): void
    {
        for ($i = 1; $i <= 60; $i++) {
            $this->createReward(100.00, "2026-10-15 10:00:00");
        }

        $batch = $this->payoutService->generateMonthlyBatch('2026-10-01', '2026-10-31', $this->superAdmin, 5000.00);
        $this->assertNotNull($batch);

        $this->payoutService->cancelBatch($batch, 'Mistakenly triggered before reconciliation', $this->superAdmin);

        $batch->refresh();
        $this->assertEquals('cancelled', $batch->status);

        $pendingCount = AssistantReward::where('assistant_id', $this->assistantUser->id)
            ->where('settlement_status', 'pending')
            ->whereNull('payout_batch_item_id')
            ->count();
        $this->assertEquals(60, $pendingCount, 'All rewards must return to pending pool upon batch cancellation.');
    }

    /**
     * TEST 6: Bounced / returned transfer handled as independent incident (DEC-08)
     */
    public function test_bounced_transfer_incident_creates_compensating_credit_and_preserves_payout(): void
    {
        for ($i = 1; $i <= 60; $i++) {
            $this->createReward(100.00, "2026-10-15 10:00:00");
        }

        $batch = $this->payoutService->generateMonthlyBatch('2026-10-01', '2026-10-31', $this->superAdmin, 5000.00);
        $item = $batch->items->first();
        $this->payoutService->confirmBatchItem($item, 'CCP-WIRE-ORIGINAL', $this->superAdmin);

        $item->refresh();
        $this->assertEquals('paid', $item->status);
        $this->assertEquals(6000.00, (float) $item->net_amount);

        $incident = $this->payoutService->handleTransferReturn(
            $item,
            6000.00,
            'Postal center reported account closed',
            $this->superAdmin,
            'POST-REF-6000'
        );

        $this->assertInstanceOf(PayoutBounceIncident::class, $incident);
        $this->assertEquals(6000.00, (float) $incident->returned_amount);
        $this->assertEquals('settled', $incident->incident_status);

        $item->refresh();
        $this->assertEquals('fully_returned', $item->status);
        $this->assertEquals(6000.00, (float) $item->returned_amount);
        $this->assertEquals(1, $item->return_count);
        $this->assertEquals(0.00, (float) $item->remaining_refundable_amount);

        $balance = AssistantRewardBalance::find($this->assistantUser->id);
        $this->assertEquals(6000.00, (float) $balance->current_balance);

        $this->assertDatabaseHas('payout_bounce_incidents', [
            'id' => $incident->id,
            'batch_item_id' => $item->id,
            'postal_reference' => 'POST-REF-6000',
            'returned_amount_dzd' => 6000.00,
        ]);

        $this->assertDatabaseHas('assistant_reward_transactions', [
            'assistant_id' => $this->assistantUser->id,
            'transaction_type' => 'payout_transfer_reversal',
            'direction' => 'credit',
            'amount' => 6000.00,
            'idempotency_key' => "payout_transfer_reversal:incident:{$incident->id}",
        ]);
    }

    /**
     * TEST 7: Return amount strictly bounded by remaining refundable balance (CRIT-01).
     */
    public function test_transfer_return_rejects_exceeding_refundable_ceiling(): void
    {
        for ($i = 1; $i <= 60; $i++) {
            $this->createReward(100.00, "2026-10-15 10:00:00");
        }

        $batch = $this->payoutService->generateMonthlyBatch('2026-10-01', '2026-10-31', $this->superAdmin, 5000.00);
        $item = $batch->items->first();
        $this->payoutService->confirmBatchItem($item, 'CCP-WIRE-ORIGINAL', $this->superAdmin);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('exceeds remaining refundable balance');

        // Net amount is 6000.00 DZD, attempting 6000.01 DZD must fail
        $this->payoutService->handleTransferReturn($item, 6000.01, 'Over-return attempt', $this->superAdmin);
    }

    /**
     * TEST 8: Multiple partial returns accurately track remaining refundable ceiling.
     */
    public function test_transfer_return_supports_partial_returns_and_tracks_remaining_ceiling(): void
    {
        for ($i = 1; $i <= 60; $i++) {
            $this->createReward(100.00, "2026-10-15 10:00:00");
        }

        $batch = $this->payoutService->generateMonthlyBatch('2026-10-01', '2026-10-31', $this->superAdmin, 5000.00);
        $item = $batch->items->first();
        $this->payoutService->confirmBatchItem($item, 'CCP-WIRE-ORIGINAL', $this->superAdmin);

        // First partial return: 2500 DZD
        $inc1 = $this->payoutService->handleTransferReturn(
            $item,
            2500.00,
            'First partial return from regional center',
            $this->superAdmin,
            'PART-01'
        );

        $item->refresh();
        $this->assertEquals('partially_returned', $item->status);
        $this->assertEquals(2500.00, (float) $item->returned_amount);
        $this->assertEquals(1, $item->return_count);
        $this->assertEquals(3500.00, (float) $item->remaining_refundable_amount);

        // Attempt second return exceeding remaining ceiling (3500 DZD): 3500.01 DZD
        try {
            $this->payoutService->handleTransferReturn($item, 3500.01, 'Exceeding second return', $this->superAdmin, 'PART-BAD');
            $this->fail('Expected InvalidArgumentException for exceeding remaining ceiling.');
        } catch (\InvalidArgumentException $e) {
            $this->assertStringContainsString('exceeds remaining refundable balance', $e->getMessage());
        }

        // Legitimate second return for remainder: 3500 DZD
        $inc2 = $this->payoutService->handleTransferReturn(
            $item,
            3500.00,
            'Final remainder return',
            $this->superAdmin,
            'PART-02'
        );

        $item->refresh();
        $this->assertEquals('fully_returned', $item->status);
        $this->assertEquals(6000.00, (float) $item->returned_amount);
        $this->assertEquals(2, $item->return_count);
        $this->assertEquals(0.00, (float) $item->remaining_refundable_amount);

        // Attempt third return after item is fully returned: must be rejected
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Must be paid or partially_returned');
        $this->payoutService->handleTransferReturn($item, 100.00, 'Attempt on fully returned', $this->superAdmin, 'PART-03');
    }

    /**
     * TEST 9: Idempotent replay returns existing incident; mutated payload is aborted.
     */
    public function test_transfer_return_idempotency_replay_and_mutation_detection(): void
    {
        for ($i = 1; $i <= 60; $i++) {
            $this->createReward(100.00, "2026-10-15 10:00:00");
        }

        $batch = $this->payoutService->generateMonthlyBatch('2026-10-01', '2026-10-31', $this->superAdmin, 5000.00);
        $item = $batch->items->first();
        $this->payoutService->confirmBatchItem($item, 'CCP-WIRE-ORIGINAL', $this->superAdmin);

        $idemKey = 'IDEM-TEST-REPLAY-001';
        $postalRef = 'POST-IDEM-001';

        // Initial submission
        $inc1 = $this->payoutService->handleTransferReturn(
            $item,
            2000.00,
            'Initial return',
            $this->superAdmin,
            $postalRef,
            $idemKey
        );

        $this->assertEquals(2000.00, (float) $inc1->returned_amount);

        // Exact replay with same idempotency key and identical payload
        $inc2 = $this->payoutService->handleTransferReturn(
            $item,
            2000.00,
            'Initial return retry',
            $this->superAdmin,
            $postalRef,
            $idemKey
        );

        $this->assertEquals($inc1->id, $inc2->id, 'Replay must return exact same incident.');
        $this->assertEquals(1, PayoutBounceIncident::where('idempotency_key', $idemKey)->count());
        $this->assertEquals(1, AssistantRewardTransaction::where('assistant_id', $this->assistantUser->id)->where('transaction_type', 'payout_transfer_reversal')->count());

        // Mutated replay with same idempotency key but different amount: must abort
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('already used with different parameters');
        $this->payoutService->handleTransferReturn(
            $item,
            3000.00,
            'Mutated amount attempt',
            $this->superAdmin,
            $postalRef,
            $idemKey
        );
    }

    /**
     * TEST 10: Duplicate postal reference is strictly rejected across distinct idempotency keys.
     */
    public function test_duplicate_postal_reference_rejected(): void
    {
        for ($i = 1; $i <= 60; $i++) {
            $this->createReward(100.00, "2026-10-15 10:00:00");
        }

        $batch = $this->payoutService->generateMonthlyBatch('2026-10-01', '2026-10-31', $this->superAdmin, 5000.00);
        $item = $batch->items->first();
        $this->payoutService->confirmBatchItem($item, 'CCP-WIRE-ORIGINAL', $this->superAdmin);

        $this->payoutService->handleTransferReturn(
            $item,
            1000.00,
            'First return',
            $this->superAdmin,
            'POST-DUP-CHECK',
            'KEY-AAA'
        );

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Postal return reference [POST-DUP-CHECK] has already been processed');

        $this->payoutService->handleTransferReturn(
            $item,
            1000.00,
            'Second return with same postal ref',
            $this->superAdmin,
            'POST-DUP-CHECK',
            'KEY-BBB'
        );
    }

    /**
     * TEST 11: Single reward split across 2 debts and cash remainder generates deterministic, unique allocation keys (HIGH-01).
     */
    public function test_deterministic_allocation_keys_under_reward_splitting(): void
    {
        $r1 = $this->createReward(5000.00, "2026-10-01 10:00:00");
        $d1 = $this->createDebt(2000.00, "2026-09-10 08:00:00", "Debt 1");
        $d2 = $this->createDebt(1500.00, "2026-09-25 08:00:00", "Debt 2");

        $batch = AssistantPayoutBatch::create([
            'batch_number' => 'BAT-SPLIT-TEST',
            'period_start' => '2026-10-01',
            'period_end' => '2026-10-31',
            'payout_cycle' => '2026-10',
            'applied_threshold_dzd' => 1000.00,
            'status' => 'pending',
            'total_recipients' => 1,
            'total_amount' => 1500.00,
            'created_by_id' => $this->superAdmin->id,
        ]);

        $item = AssistantPayoutBatchItem::create([
            'batch_id' => $batch->id,
            'assistant_id' => $this->assistantUser->id,
            'payout_profile_id' => $this->payoutProfile->id,
            'gross_amount' => 5000.00,
            'debt_offset_amount' => 3500.00,
            'net_amount' => 1500.00,
            'amount' => 1500.00,
            'status' => 'pending',
            'settlement_category' => 'partially_settled',
        ]);

        $r1->update(['payout_batch_item_id' => $item->id]);

        $candidateRewards = collect([$r1]);
        $openDebts = collect([$d1, $d2]);

        $res1 = $this->allocationEngine->executeFifoAllocations(
            $item,
            $candidateRewards,
            $openDebts,
            $this->superAdmin
        );

        $this->assertEquals(1500.00, $res1['cash_allocated']);
        $this->assertEquals(3500.00, $res1['debt_offset']);
        $this->assertCount(3, $res1['allocations']);

        $expectedKey1 = "ALLOC:ITEM:{$item->id}:R:{$r1->id}:D:{$d1->id}";
        $expectedKey2 = "ALLOC:ITEM:{$item->id}:R:{$r1->id}:D:{$d2->id}";
        $expectedKey3 = "ALLOC:ITEM:{$item->id}:R:{$r1->id}:CASH";

        $this->assertDatabaseHas('assistant_reward_allocations', [
            'idempotency_key' => $expectedKey1,
            'amount' => 2000.00,
            'allocation_type' => 'debt_offset',
        ]);
        $this->assertDatabaseHas('assistant_reward_allocations', [
            'idempotency_key' => $expectedKey2,
            'amount' => 1500.00,
            'allocation_type' => 'debt_offset',
        ]);
        $this->assertDatabaseHas('assistant_reward_allocations', [
            'idempotency_key' => $expectedKey3,
            'amount' => 1500.00,
            'allocation_type' => 'cash_wire',
        ]);

        // Re-executing must be completely idempotent without unique index violation
        $res2 = $this->allocationEngine->executeFifoAllocations(
            $item,
            $candidateRewards,
            $openDebts,
            $this->superAdmin
        );

        $this->assertCount(3, $res2['allocations']);
        $this->assertEquals(3, AssistantRewardAllocation::where('batch_item_id', $item->id)->count());
    }
}
