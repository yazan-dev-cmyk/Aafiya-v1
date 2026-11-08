<?php

namespace Tests\Feature\AssistantRewards;

use App\Models\AssistantRewardBalance;
use App\Models\AssistantRewardTransaction;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\User;
use App\Services\AssistantLedgerService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class TenureAndLedgerIntegrityTest extends TestCase
{
    use RefreshDatabase;

    protected AssistantLedgerService $ledgerService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->ledgerService = app(AssistantLedgerService::class);
    }

    protected function createClinic(string $name = 'Test Clinic'): Clinic
    {
        return Clinic::create([
            'name' => $name,
            'address' => 'Algiers',
            'wilaya' => '16',
            'phone' => '0555123456',
            'is_active' => true,
        ]);
    }

    /**
     * Test 1: Single active tenure constraint - assistant cannot have 2 active clinic memberships simultaneously.
     */
    public function test_assistant_cannot_have_two_active_memberships_simultaneously(): void
    {
        $assistant = User::factory()->create(['is_active' => true]);
        $assistant->assignRole('doctor_assistant');

        $clinicA = $this->createClinic('Clinic A');
        $clinicB = $this->createClinic('Clinic B');

        // Membership in clinic A
        ClinicAssistant::create([
            'user_id' => $assistant->id,
            'clinic_id' => $clinicA->id,
            'is_active' => true,
        ]);

        // Attempt second active membership in clinic B should fail unique constraint
        $this->expectException(QueryException::class);
        ClinicAssistant::create([
            'user_id' => $assistant->id,
            'clinic_id' => $clinicB->id,
            'is_active' => true,
        ]);
    }

    /**
     * Test 2: Rehire after departure - soft deleting active membership allows new active membership.
     */
    public function test_assistant_can_be_rehired_after_previous_membership_is_soft_deleted(): void
    {
        $assistant = User::factory()->create(['is_active' => true]);
        $assistant->assignRole('doctor_assistant');

        $clinicA = $this->createClinic('Clinic A');
        $clinicB = $this->createClinic('Clinic B');

        $membershipA = ClinicAssistant::create([
            'user_id' => $assistant->id,
            'clinic_id' => $clinicA->id,
            'is_active' => true,
        ]);

        // Departure: soft delete membership A
        $membershipA->delete();

        // New membership in clinic B should succeed
        $membershipB = ClinicAssistant::create([
            'user_id' => $assistant->id,
            'clinic_id' => $clinicB->id,
            'is_active' => true,
        ]);

        $this->assertNotNull($membershipB->id);
        $this->assertEquals(2, ClinicAssistant::withTrashed()->where('user_id', $assistant->id)->count());
    }

    /**
     * Test 3: Financial ledger initialization & credit transaction.
     */
    public function test_ledger_initialization_and_credit_transaction(): void
    {
        $assistant = User::factory()->create();
        $balance = $this->ledgerService->getOrCreateBalance($assistant->id);

        $this->assertEquals(0.00, (float) $balance->current_balance);

        $tx = $this->ledgerService->recordTransaction(
            assistantId: $assistant->id,
            transactionType: 'reward_earned',
            direction: 'credit',
            amount: 10.00,
            referenceType: 'appointment',
            referenceId: 'app-123',
            idempotencyKey: 'test_credit_1'
        );

        $this->assertEquals(0.00, (float) $tx->balance_before);
        $this->assertEquals(10.00, (float) $tx->balance_after);

        $balance->refresh();
        $this->assertEquals(10.00, (float) $balance->current_balance);
        $this->assertEquals(10.00, (float) $balance->total_earned);
        $this->assertTrue($this->ledgerService->verifyBalanceInvariant($assistant->id));
    }

    /**
     * Test 4: Financial ledger debit transaction and negative balance support.
     */
    public function test_ledger_debit_transaction_and_negative_balance_support(): void
    {
        $assistant = User::factory()->create();

        // Start with 10 DZD
        $this->ledgerService->recordTransaction(
            assistantId: $assistant->id,
            transactionType: 'reward_earned',
            direction: 'credit',
            amount: 10.00,
            referenceType: 'appointment',
            referenceId: 'app-1',
            idempotencyKey: 'init_credit'
        );

        // Deduct 20 DZD (two cancellations)
        $this->ledgerService->recordTransaction(
            assistantId: $assistant->id,
            transactionType: 'cancellation_deduction',
            direction: 'debit',
            amount: 20.00,
            referenceType: 'appointment',
            referenceId: 'app-cancellations',
            idempotencyKey: 'deduct_20'
        );

        $balance = AssistantRewardBalance::find($assistant->id);
        $this->assertEquals(-10.00, (float) $balance->current_balance);
        $this->assertEquals(10.00, (float) $balance->total_earned);
        $this->assertEquals(20.00, (float) $balance->total_deducted);
        $this->assertTrue($this->ledgerService->verifyBalanceInvariant($assistant->id));
    }

    /**
     * Test 5: Idempotency prevents duplicate balance mutation.
     */
    public function test_ledger_idempotency_prevents_duplicate_mutation(): void
    {
        $assistant = User::factory()->create();

        $tx1 = $this->ledgerService->recordTransaction(
            assistantId: $assistant->id,
            transactionType: 'reward_earned',
            direction: 'credit',
            amount: 10.00,
            referenceType: 'appointment',
            referenceId: 'app-same',
            idempotencyKey: 'idemp-key-unique'
        );

        $tx2 = $this->ledgerService->recordTransaction(
            assistantId: $assistant->id,
            transactionType: 'reward_earned',
            direction: 'credit',
            amount: 10.00,
            referenceType: 'appointment',
            referenceId: 'app-same',
            idempotencyKey: 'idemp-key-unique'
        );

        $this->assertEquals($tx1->id, $tx2->id);
        $balance = AssistantRewardBalance::find($assistant->id);
        $this->assertEquals(10.00, (float) $balance->current_balance);
    }

    /**
     * Test 6: Ledger transactions are strictly immutable and cannot be updated or deleted.
     */
    public function test_ledger_transactions_are_strictly_immutable(): void
    {
        $assistant = User::factory()->create();

        $tx = $this->ledgerService->recordTransaction(
            assistantId: $assistant->id,
            transactionType: 'reward_earned',
            direction: 'credit',
            amount: 10.00,
            referenceType: 'appointment',
            referenceId: 'app-imm',
            idempotencyKey: 'imm-1'
        );

        $this->expectException(RuntimeException::class);
        $tx->update(['amount' => 50.00]);
    }
}