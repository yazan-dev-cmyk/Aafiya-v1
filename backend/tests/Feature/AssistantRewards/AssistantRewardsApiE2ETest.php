<?php

namespace Tests\Feature\AssistantRewards;

use App\Models\AssistantPayoutBatch;
use App\Models\AssistantPayoutBatchItem;
use App\Models\AssistantPayoutProfile;
use App\Models\AssistantRewardBalance;
use App\Models\Permission;
use App\Models\ScopedPermissionAssignment;
use App\Models\User;
use App\Services\AssistantLedgerService;
use App\Services\AssistantPayoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AssistantRewardsApiE2ETest extends TestCase
{
    use RefreshDatabase;

    protected AssistantLedgerService $ledgerService;
    protected AssistantPayoutService $payoutService;

    protected User $assistantUser;
    protected string $assistantToken;
    protected User $adminUser;
    protected string $adminToken;
    protected User $adminAssistantUser;
    protected string $adminAssistantToken;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        $this->ledgerService = app(AssistantLedgerService::class);
        $this->payoutService = app(AssistantPayoutService::class);

        Storage::fake('local');

        // Assistant User
        $this->assistantUser = User::factory()->create(['is_active' => true]);
        $this->assistantUser->assignRole('doctor_assistant');
        $this->assistantToken = $this->assistantUser->createToken('auth')->plainTextToken;

        // Admin User
        $this->adminUser = User::factory()->create(['is_active' => true]);
        $this->adminUser->assignRole('admin');
        $this->adminToken = $this->adminUser->createToken('auth')->plainTextToken;

        // Admin Assistant User (Delegated)
        $this->adminAssistantUser = User::factory()->create(['is_active' => true]);
        $this->adminAssistantUser->assignRole('admin_assistant');
        $this->adminAssistantToken = $this->adminAssistantUser->createToken('auth')->plainTextToken;
    }

    /**
     * Test 1: Assistant summary and transactions API endpoints.
     */
    public function test_assistant_can_fetch_rewards_summary_and_transactions(): void
    {
        // Credit 50 DZD
        $this->ledgerService->recordTransaction(
            $this->assistantUser->id,
            'reward_earned',
            'credit',
            50.00,
            'appointment',
            'app-1',
            'tx-summary-1'
        );

        $response = $this->actingAs($this->assistantUser)
            ->getJson('/api/v1/assistant/rewards/summary');

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'success');
        $response->assertJsonPath('data.current_balance', 50);
        $response->assertJsonPath('data.total_earned', 50);
        $response->assertJsonPath('data.payout_threshold', 10000);

        // Fetch transactions
        $txResponse = $this->actingAs($this->assistantUser)
            ->getJson('/api/v1/assistant/rewards/transactions');

        $txResponse->assertStatus(200);
        $txResponse->assertJsonPath('status', 'success');
        $this->assertCount(1, $txResponse->json('data'));
    }

    /**
     * Test 2: Assistant can submit RIP profile and Admin can verify it via API.
     */
    public function test_assistant_submits_profile_and_admin_verifies(): void
    {
        $file = UploadedFile::fake()->create('cheque.jpg', 100, 'image/jpeg');

        $submitResponse = $this->actingAs($this->assistantUser)
            ->postJson('/api/v1/assistant/rewards/profiles', [
                'rip_number' => '00799999000888888888',
                'cheque_document' => $file,
            ]);

        $submitResponse->assertStatus(201);
        $submitResponse->assertJsonPath('status', 'success');
        $profileId = $submitResponse->json('data.id');

        // Admin lists pending profiles
        $pendingResponse = $this->actingAs($this->adminUser)
            ->getJson('/api/v1/admin/rewards/profiles/pending');

        $pendingResponse->assertStatus(200);
        $this->assertNotEmpty($pendingResponse->json('data'));

        // Admin verifies & approves
        $verifyResponse = $this->actingAs($this->adminUser)
            ->putJson("/api/v1/admin/rewards/profiles/{$profileId}/verify", [
                'approved' => true,
            ]);

        $verifyResponse->assertStatus(200);
        $verifyResponse->assertJsonPath('data.status', 'active');
    }

    /**
     * Test 3: Admin Overview, Batch Generation, and Delegated Assistant Transfer Confirmation.
     */
    public function test_admin_overview_batch_generation_and_delegated_confirmation(): void
    {
        // 1. Give assistant 15,000 DZD
        $this->ledgerService->recordTransaction(
            $this->assistantUser->id,
            'reward_earned',
            'credit',
            15000.00,
            'appointment',
            'app-big',
            'tx-big-1'
        );

        // Activate RIP profile
        $file = UploadedFile::fake()->create('cheque_act.jpg', 100, 'image/jpeg');
        $profile = app(\App\Services\AssistantPayoutProfileService::class)->submitProfile(
            $this->assistantUser,
            '00799999000999999999',
            $file
        );
        app(\App\Services\AssistantPayoutProfileService::class)->verifyProfile($profile, $this->adminUser, true);

        // 2. Admin Overview API
        $overviewResponse = $this->actingAs($this->adminUser)
            ->getJson('/api/v1/admin/rewards/overview');

        $overviewResponse->assertStatus(200);
        $overviewResponse->assertJsonPath('status', 'success');
        $overviewResponse->assertJsonPath('data.total_earned', 15000);
        $overviewResponse->assertJsonPath('data.current_pending_liability', 15000);

        // 3. Admin generates monthly batch
        $batchResponse = $this->actingAs($this->adminUser)
            ->postJson('/api/v1/admin/rewards/batches/generate', [
                'period_start' => now()->startOfMonth()->toDateString(),
                'period_end' => now()->toDateString(),
            ]);

        $batchResponse->assertStatus(201);
        $batchId = $batchResponse->json('data.id');
        $this->assertNotNull($batchId);

        $batchDetailsResponse = $this->actingAs($this->adminUser)
            ->getJson("/api/v1/admin/rewards/batches/{$batchId}");

        $batchDetailsResponse->assertStatus(200);
        $itemId = $batchDetailsResponse->json('data.items.0.id');
        $this->assertNotNull($itemId);

        // 4. Delegated Admin Assistant confirms transfer
        $permission = Permission::where('name', 'platform.confirm_assistant_payout')->firstOrFail();
        ScopedPermissionAssignment::create([
            'user_id' => $this->adminAssistantUser->id,
            'permission_id' => $permission->id,
            'scope_type' => 'platform',
            'scope_id' => 'global',
            'is_active' => true,
            'granted_by_id' => $this->adminUser->id,
        ]);

        $confirmResponse = $this->actingAs($this->adminAssistantUser)
            ->postJson("/api/v1/admin/rewards/batches/{$batchId}/items/{$itemId}/confirm", [
                'transfer_reference' => 'CCP-DELEGATED-API-001',
            ]);

        $confirmResponse->assertStatus(200);
        $confirmResponse->assertJsonPath('status', 'success');
        $confirmResponse->assertJsonPath('data.status', 'paid');

        // Check assistant balance after confirmation
        $balance = AssistantRewardBalance::find($this->assistantUser->id);
        $this->assertEquals(0.00, (float) $balance->current_balance);
        $this->assertEquals(15000.00, (float) $balance->total_paid);

        // 5. Assistant can view own payouts history
        $payoutsResponse = $this->actingAs($this->assistantUser)
            ->getJson('/api/v1/assistant/rewards/payouts');

        $payoutsResponse->assertStatus(200);
        $payoutsResponse->assertJsonPath('status', 'success');
        $this->assertCount(1, $payoutsResponse->json('data'));
        $this->assertEquals('paid', $payoutsResponse->json('data.0.status'));
        $this->assertEquals('CCP-DELEGATED-API-001', $payoutsResponse->json('data.0.transfer_reference'));
        $this->assertEquals(15000, $payoutsResponse->json('data.0.amount'));
    }
}