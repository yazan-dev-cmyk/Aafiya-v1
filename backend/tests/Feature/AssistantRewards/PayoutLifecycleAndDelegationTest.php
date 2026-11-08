<?php

namespace Tests\Feature\AssistantRewards;

use App\Models\AssistantPayoutBatch;
use App\Models\AssistantPayoutBatchItem;
use App\Models\AssistantPayoutProfile;
use App\Models\AssistantReward;
use App\Models\AssistantRewardBalance;
use App\Models\Permission;
use App\Models\Role;
use App\Models\ScopedPermissionAssignment;
use App\Models\SecurityAuditLog;
use App\Models\User;
use App\Services\AssistantLedgerService;
use App\Services\AssistantPayoutProfileService;
use App\Services\AssistantPayoutService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use Tests\TestCase;

class PayoutLifecycleAndDelegationTest extends TestCase
{
    use RefreshDatabase;

    protected AssistantPayoutService $payoutService;
    protected AssistantPayoutProfileService $profileService;
    protected AssistantLedgerService $ledgerService;

    protected User $assistantUser;
    protected User $adminUser;
    protected User $adminAssistantUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        $this->payoutService = app(AssistantPayoutService::class);
        $this->profileService = app(AssistantPayoutProfileService::class);
        $this->ledgerService = app(AssistantLedgerService::class);

        // Doctor Assistant
        $this->assistantUser = User::factory()->create(['is_active' => true]);
        $this->assistantUser->assignRole('doctor_assistant');

        // Admin
        $this->adminUser = User::factory()->create(['is_active' => true]);
        $this->adminUser->assignRole('admin');

        // Administrative Assistant
        $this->adminAssistantUser = User::factory()->create(['is_active' => true]);
        $this->adminAssistantUser->assignRole('admin_assistant');

        Storage::fake('local');
    }

    /**
     * Test 1: 20-digit numeric RIP validation and private cheque document upload.
     */
    public function test_rip_profile_submission_validates_20_digits_and_stores_cheque(): void
    {
        $file = UploadedFile::fake()->create('cheque.jpg', 100, 'image/jpeg');

        // Invalid RIP (19 digits)
        try {
            $this->profileService->submitProfile($this->assistantUser, '1234567890123456789', $file);
            $this->fail('Expected InvalidArgumentException was not thrown');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('20 numeric digits', $e->getMessage());
        }

        // Valid RIP (20 digits)
        $validFile = UploadedFile::fake()->create('cheque_valid.jpg', 100, 'image/jpeg');
        $profile = $this->profileService->submitProfile($this->assistantUser, '00799999000123456789', $validFile);

        $this->assertNotNull($profile->id);
        $this->assertEquals(1, $profile->version);
        $this->assertEquals('00799999000123456789', $profile->rip_number);
        $this->assertEquals('pending_verification', $profile->status);
        Storage::disk('local')->assertExists($profile->cheque_image_path);
    }

    /**
     * Test 2: Admin approval activates profile and supersedes older active profile.
     */
    public function test_admin_approval_supersedes_previous_active_profile(): void
    {
        $file1 = UploadedFile::fake()->create('c1.jpg', 100, 'image/jpeg');
        $file2 = UploadedFile::fake()->create('c2.jpg', 100, 'image/jpeg');

        $p1 = $this->profileService->submitProfile($this->assistantUser, '00799999000111111111', $file1);
        $this->profileService->verifyProfile($p1, $this->adminUser, true);
        $p1->refresh();
        $this->assertEquals('active', $p1->status);

        // Submit version 2: immediately supersedes v1 to protect payout eligibility
        $p2 = $this->profileService->submitProfile($this->assistantUser, '00799999000222222222', $file2);
        $this->assertEquals(2, $p2->version);
        $this->assertEquals('pending_verification', $p2->status);

        $p1->refresh();
        $this->assertEquals('superseded', $p1->status, 'v1 must be superseded immediately upon v2 submission.');

        // Verify payout eligibility is suspended while v2 is pending
        $balance = $this->ledgerService->getOrCreateBalance($this->assistantUser->id);
        $balance->update(['current_balance' => 15000.00]);

        $batch = $this->payoutService->generateMonthlyBatch('2026-10-01', '2026-10-31', $this->adminUser);
        $this->assertNull($batch, 'Monthly batch generator must skip assistant when profile is pending verification.');

        // Admin approves v2
        $this->profileService->verifyProfile($p2, $this->adminUser, true);
        $p2->refresh();
        $p1->refresh();

        $this->assertEquals('superseded', $p1->status);
        $this->assertEquals('active', $p2->status);

        // Assistant is now eligible for payout with approved v2
        $batch2 = $this->payoutService->generateMonthlyBatch('2026-10-01', '2026-10-31', $this->adminUser);
        $this->assertNotNull($batch2);
        $this->assertEquals($p2->id, $batch2->items->first()->payout_profile_id);
    }

    /**
     * Test 2b: Rejection of new version does NOT re-activate old superseded version.
     */
    public function test_rejection_of_new_version_does_not_reactivate_older_profile(): void
    {
        $file1 = UploadedFile::fake()->create('c1.jpg', 100, 'image/jpeg');
        $file2 = UploadedFile::fake()->create('c2.jpg', 100, 'image/jpeg');

        $p1 = $this->profileService->submitProfile($this->assistantUser, '00799999000111111111', $file1);
        $this->profileService->verifyProfile($p1, $this->adminUser, true);
        $p1->refresh();
        $this->assertEquals('active', $p1->status);

        // Submit v2
        $p2 = $this->profileService->submitProfile($this->assistantUser, '00799999000222222222', $file2);
        $p1->refresh();
        $this->assertEquals('superseded', $p1->status);

        // Admin rejects v2
        $this->profileService->verifyProfile($p2, $this->adminUser, false, 'Cheque document is unreadable.');
        $p2->refresh();
        $p1->refresh();

        $this->assertEquals('rejected', $p2->status);
        $this->assertEquals('Cheque document is unreadable.', $p2->rejection_reason);
        $this->assertEquals('superseded', $p1->status, 'Prior profile must remain superseded after rejection.');

        // Payout must remain blocked
        $batch = $this->payoutService->generateMonthlyBatch('2026-10-01', '2026-10-31', $this->adminUser);
        $this->assertNull($batch, 'Payout batch must not generate when no profile is active.');
    }

    /**
     * Test 3: Cheque document streaming authorization and security audit log.
     */
    public function test_cheque_document_streaming_authorization_and_audit_log(): void
    {
        $file = UploadedFile::fake()->create('cheque.jpg', 100, 'image/jpeg');
        $profile = $this->profileService->submitProfile($this->assistantUser, '00799999000123456789', $file);

        // Assistant views own cheque
        $response = $this->profileService->streamCheque($profile, $this->assistantUser);
        $this->assertNotNull($response);

        // Check SecurityAuditLog
        $this->assertTrue(
            SecurityAuditLog::where('actor_id', $this->assistantUser->id)
                ->where('action', 'view_cheque_document')
                ->where('resource_id', $profile->id)
                ->exists()
        );

        // Unrelated user blocked
        $unrelated = User::factory()->create();
        $this->expectException(AuthorizationException::class);
        $this->profileService->streamCheque($profile, $unrelated);
    }

    /**
     * Test 4: Monthly batch generation enforces 10,000 DZD threshold and zero premature debit.
     */
    public function test_monthly_batch_generation_enforces_threshold_and_zero_premature_debit(): void
    {
        // Assistant A: 5,000 DZD (below threshold)
        $userA = User::factory()->create();
        $userA->assignRole('doctor_assistant');
        $this->ledgerService->recordTransaction($userA->id, 'reward_earned', 'credit', 5000.00, 'test', '1', 'tx_a');

        // Assistant B: 12,000 DZD with active profile
        $userB = User::factory()->create();
        $userB->assignRole('doctor_assistant');
        $this->ledgerService->recordTransaction($userB->id, 'reward_earned', 'credit', 12000.00, 'test', '2', 'tx_b');
        $file = UploadedFile::fake()->create('cb.jpg', 100, 'image/jpeg');
        $pB = $this->profileService->submitProfile($userB, '00799999000333333333', $file);
        $this->profileService->verifyProfile($pB, $this->adminUser, true);

        // Generate batch
        $batch = $this->payoutService->generateMonthlyBatch(
            now()->subMonth()->startOfMonth()->toDateString(),
            now()->subMonth()->endOfMonth()->toDateString(),
            $this->adminUser
        );

        $this->assertNotNull($batch);
        $this->assertEquals(1, $batch->total_recipients);
        $this->assertEquals(12000.00, (float) $batch->total_amount);

        // Zero premature debit invariant
        $balanceB = AssistantRewardBalance::find($userB->id);
        $this->assertEquals(12000.00, (float) $balanceB->current_balance);
        $this->assertEquals(0.00, (float) $balanceB->total_paid);
    }

    /**
     * Test 5: Admin confirmation of payout transfer debits assistant balance.
     */
    public function test_admin_confirmation_of_payout_transfer_debits_balance(): void
    {
        $this->ledgerService->recordTransaction($this->assistantUser->id, 'reward_earned', 'credit', 10000.00, 'test', '3', 'tx_c');
        $file = UploadedFile::fake()->create('cc.jpg', 100, 'image/jpeg');
        $profile = $this->profileService->submitProfile($this->assistantUser, '00799999000444444444', $file);
        $this->profileService->verifyProfile($profile, $this->adminUser, true);

        $batch = $this->payoutService->generateMonthlyBatch(
            now()->startOfMonth()->toDateString(),
            now()->toDateString(),
            $this->adminUser
        );

        $item = $batch->items()->first();

        // Admin confirms payout
        $this->payoutService->confirmBatchItem($item, 'CCP-TRANSFER-101', $this->adminUser);

        $item->refresh();
        $this->assertEquals('paid', $item->status);
        $this->assertEquals('CCP-TRANSFER-101', $item->transfer_reference);

        // Assistant balance debited
        $balance = AssistantRewardBalance::find($this->assistantUser->id);
        $this->assertEquals(0.00, (float) $balance->current_balance);
        $this->assertEquals(10000.00, (float) $balance->total_paid);
        $this->assertTrue($this->ledgerService->verifyBalanceInvariant($this->assistantUser->id));

        $batch->refresh();
        $this->assertEquals('completed', $batch->status);
    }

    /**
     * Test 6: Delegated administrative assistant with 'platform.confirm_assistant_payout' can confirm payout.
     */
    public function test_delegated_admin_assistant_can_confirm_payout(): void
    {
        // Delegate permission to admin assistant
        $permission = Permission::where('name', 'platform.confirm_assistant_payout')->firstOrFail();
        ScopedPermissionAssignment::create([
            'user_id' => $this->adminAssistantUser->id,
            'permission_id' => $permission->id,
            'scope_type' => 'platform',
            'scope_id' => 'global',
            'is_active' => true,
            'granted_by_id' => $this->adminUser->id,
        ]);

        $this->ledgerService->recordTransaction($this->assistantUser->id, 'reward_earned', 'credit', 10000.00, 'test', '4', 'tx_d');
        $file = UploadedFile::fake()->create('cd.jpg', 100, 'image/jpeg');
        $profile = $this->profileService->submitProfile($this->assistantUser, '00799999000555555555', $file);
        $this->profileService->verifyProfile($profile, $this->adminUser, true);

        $batch = $this->payoutService->generateMonthlyBatch(
            now()->startOfMonth()->toDateString(),
            now()->toDateString(),
            $this->adminUser
        );

        $item = $batch->items()->first();

        // Delegated assistant confirms payout
        $this->payoutService->confirmBatchItem($item, 'DELEGATED-REF-777', $this->adminAssistantUser);

        $item->refresh();
        $this->assertEquals('paid', $item->status);

        $balance = AssistantRewardBalance::find($this->assistantUser->id);
        $this->assertEquals(0.00, (float) $balance->current_balance);
    }

    /**
     * Test 7: Unauthorized administrative assistant without delegated permission is blocked (403).
     */
    public function test_unauthorized_admin_assistant_is_blocked(): void
    {
        $this->ledgerService->recordTransaction($this->assistantUser->id, 'reward_earned', 'credit', 10000.00, 'test', '5', 'tx_e');
        $file = UploadedFile::fake()->create('ce.jpg', 100, 'image/jpeg');
        $profile = $this->profileService->submitProfile($this->assistantUser, '00799999000666666666', $file);
        $this->profileService->verifyProfile($profile, $this->adminUser, true);

        $batch = $this->payoutService->generateMonthlyBatch(
            now()->startOfMonth()->toDateString(),
            now()->toDateString(),
            $this->adminUser
        );

        $item = $batch->items()->first();

        // Attempt confirmation without delegated permission
        $this->expectException(AuthorizationException::class);
        $this->payoutService->confirmBatchItem($item, 'ILLEGAL-REF-999', $this->adminAssistantUser);
    }
}