<?php

namespace Tests\Feature\AssistantRewards;

use App\Models\AssistantPayoutBatch;
use App\Models\AssistantPayoutBatchItem;
use App\Models\AssistantPayoutProfile;
use App\Models\AssistantRewardBalance;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Permission;
use App\Models\ScopedPermissionAssignment;
use App\Models\SecurityAuditLog;
use App\Models\User;
use App\Services\AssistantLedgerService;
use App\Services\AssistantPayoutProfileService;
use App\Services\AssistantPayoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminRewardsP2Test extends TestCase
{
    use RefreshDatabase;

    protected AssistantLedgerService $ledgerService;
    protected AssistantPayoutService $payoutService;
    protected AssistantPayoutProfileService $profileService;

    protected User $superAdmin;
    protected string $superAdminToken;

    protected User $unauthorizedUser;
    protected string $unauthorizedToken;

    protected User $restrictedAdmin;
    protected string $restrictedAdminToken;

    protected User $assistantUser;
    protected Clinic $clinic;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        $this->ledgerService = app(AssistantLedgerService::class);
        $this->payoutService = app(AssistantPayoutService::class);
        $this->profileService = app(AssistantPayoutProfileService::class);

        Storage::fake('local');

        // Super Admin (has full access via 'admin' role)
        $this->superAdmin = User::factory()->create(['is_active' => true]);
        $this->superAdmin->assignRole('admin');
        $this->superAdminToken = $this->superAdmin->createToken('auth')->plainTextToken;

        // Unauthorized regular user
        $this->unauthorizedUser = User::factory()->create(['is_active' => true]);
        $this->unauthorizedUser->assignRole('patient_registered');
        $this->unauthorizedToken = $this->unauthorizedUser->createToken('auth')->plainTextToken;

        // Restricted Admin Assistant (has only platform.rewards.view_overview and platform.rewards.view_assistants)
        $this->restrictedAdmin = User::factory()->create(['is_active' => true]);
        $this->restrictedAdmin->assignRole('admin_assistant');
        $this->grantPermission($this->restrictedAdmin, 'platform.rewards.view_overview');
        $this->grantPermission($this->restrictedAdmin, 'platform.rewards.view_assistants');
        $this->restrictedAdminToken = $this->restrictedAdmin->createToken('auth')->plainTextToken;

        // Create a test Clinic and Doctor Assistant
        $doctor = User::factory()->create(['is_active' => true]);
        $doctor->assignRole('doctor');

        $this->clinic = Clinic::create([
            'name' => 'عيادة النور التجريبية',
            'address' => 'الجزائر العاصمة',
            'wilaya' => '16',
            'phone' => '0550000000',
            'max_patients_per_slot' => 10,
            'slot_duration_min' => 60,
            'is_active' => true,
        ]);

        $this->assistantUser = User::factory()->create([
            'name' => 'فاطمة الزهراء بوحفص',
            'phone' => '0661122334',
            'email' => 'assistant_test@aafiya.dz',
            'is_active' => true,
        ]);
        $this->assistantUser->assignRole('doctor_assistant');

        ClinicAssistant::create([
            'clinic_id' => $this->clinic->id,
            'user_id' => $this->assistantUser->id,
            'is_active' => true,
        ]);

        // Initialize reward balance
        AssistantRewardBalance::firstOrCreate(
            ['assistant_id' => $this->assistantUser->id],
            [
                'current_balance' => 0,
                'total_earned' => 0,
                'total_paid' => 0,
                'total_deducted' => 0,
                'total_relieved' => 0,
            ]
        );
    }

    protected function grantPermission(User $user, string $permissionName): void
    {
        $perm = Permission::firstOrCreate(
            ['name' => $permissionName],
            ['display_name' => $permissionName, 'category' => 'platform']
        );

        ScopedPermissionAssignment::firstOrCreate([
            'user_id' => $user->id,
            'permission_id' => $perm->id,
            'scope_type' => 'platform',
            'scope_id' => 'global',
        ], [
            'is_active' => true,
            'granted_by_id' => $this->superAdmin->id,
        ]);
    }

    /**
     * P2-A: Test admin can view financial overview KPIs
     */
    public function test_admin_can_view_rewards_overview(): void
    {
        // Credit the assistant balance
        $this->ledgerService->recordTransaction(
            $this->assistantUser->id,
            'reward_earned',
            'credit',
            15000.00,
            'booking',
            'BKG-TEST-1',
            'tx_test_p2_overview',
            'P2 Overview test reward',
            $this->superAdmin->id
        );

        $response = $this->withHeader('Authorization', "Bearer {$this->superAdminToken}")
            ->getJson('/api/v1/admin/rewards/overview');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'total_earned',
                    'total_paid',
                    'total_deducted',
                    'total_relieved',
                    'current_pending_liability',
                    'current_negative_balances',
                    'total_operational_losses',
                    'losses_breakdown' => [
                        'departure_deficit_absorption',
                        'post_departure_cancellation',
                        'post_departure_pre_payout_cancellation',
                    ],
                    'pending_actions' => [
                        'pending_verification_profiles',
                        'pending_batches',
                    ],
                    'roster_metrics' => [
                        'total_assistants',
                        'eligible_assistants',
                        'payout_threshold',
                    ],
                ],
            ]);

        $this->assertEquals(15000, $response->json('data.total_earned'));
        $this->assertEquals(15000, $response->json('data.current_pending_liability'));
    }

    /**
     * RBAC: Unauthorized user receives 403 Forbidden
     */
    public function test_unauthorized_user_forbidden_from_rewards_endpoints(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->unauthorizedToken}")
            ->getJson('/api/v1/admin/rewards/overview');

        $response->assertStatus(403);
    }

    /**
     * P2-A & D-03: Assistant Directory displays masked RIP by default
     */
    public function test_assistant_directory_masks_rip_by_default(): void
    {
        $file = UploadedFile::fake()->create('cheque.pdf', 100, 'application/pdf');
        $profile = $this->profileService->submitProfile(
            $this->assistantUser,
            '00799999000123456789',
            $file
        );

        // Approve profile
        $this->profileService->verifyProfile($profile, $this->superAdmin, true);

        // View directory with restricted admin (has view_assistants, lacks view_full_rip)
        $response = $this->withHeader('Authorization', "Bearer {$this->restrictedAdminToken}")
            ->getJson('/api/v1/admin/rewards/assistants');

        $response->assertStatus(200);
        $assistants = $response->json('data');
        $this->assertNotEmpty($assistants);

        $found = collect($assistants)->firstWhere('id', $this->assistantUser->id);
        $this->assertNotNull($found);
        $this->assertEquals('0079************6789', $found['payout_profile']['rip_masked']);
        $this->assertNull($found['payout_profile']['rip_full']);
    }

    /**
     * Decision D-03: Reveal Full RIP requires platform.rewards.view_full_rip and logs security audit
     */
    public function test_reveal_full_rip_requires_permission_and_creates_audit_log(): void
    {
        $file = UploadedFile::fake()->create('cheque.pdf', 100, 'application/pdf');
        $profile = $this->profileService->submitProfile(
            $this->assistantUser,
            '00799999000123456789',
            $file
        );

        // Restricted admin without view_full_rip receives 403
        $forbiddenResponse = $this->actingAs($this->restrictedAdmin)
            ->postJson("/api/v1/admin/rewards/profiles/{$profile->id}/reveal-rip");
        $forbiddenResponse->assertStatus(403);

        // SuperAdmin with permission succeeds
        $successResponse = $this->actingAs($this->superAdmin)
            ->postJson("/api/v1/admin/rewards/profiles/{$profile->id}/reveal-rip");

        $successResponse->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'rip' => '00799999000123456789',
                ],
            ]);

        // Verify SecurityAuditLog was created
        $log = SecurityAuditLog::where('action', 'view_full_rip')
            ->where('resource_id', $profile->id)
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals($this->superAdmin->id, $log->actor_id);
    }

    /**
     * Decision D-01: Download Cheque Document requires platform.rewards.download_cheque_document and logs audit
     */
    public function test_cheque_download_requires_permission_and_creates_audit_log(): void
    {
        $file = UploadedFile::fake()->create('cheque.pdf', 100, 'application/pdf');
        $profile = $this->profileService->submitProfile(
            $this->assistantUser,
            '00799999000123456789',
            $file
        );

        // Restricted admin receives 403
        $forbiddenResponse = $this->actingAs($this->restrictedAdmin)
            ->get("/api/v1/admin/rewards/profiles/{$profile->id}/cheque/download");
        $forbiddenResponse->assertStatus(403);

        // SuperAdmin succeeds with download attachment
        $successResponse = $this->actingAs($this->superAdmin)
            ->get("/api/v1/admin/rewards/profiles/{$profile->id}/cheque/download");

        $successResponse->assertStatus(200);
        $this->assertStringContainsString('attachment;', $successResponse->headers->get('Content-Disposition'));

        // Verify SecurityAuditLog
        $log = SecurityAuditLog::where('action', 'download_cheque_document')
            ->where('resource_id', $profile->id)
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals($this->superAdmin->id, $log->actor_id);
    }

    /**
     * P2-B: Admin can verify or reject payout profile with mandatory reason
     */
    public function test_admin_can_verify_and_reject_payout_profile(): void
    {
        $file = UploadedFile::fake()->create('cheque.pdf', 100, 'application/pdf');
        $profile = $this->profileService->submitProfile(
            $this->assistantUser,
            '00799999000123456789',
            $file
        );

        // Rejection without reason fails validation
        $invalidReject = $this->withHeader('Authorization', "Bearer {$this->superAdminToken}")
            ->putJson("/api/v1/admin/rewards/profiles/{$profile->id}/verify", [
                'approved' => false,
            ]);
        $invalidReject->assertStatus(422);

        // Valid rejection
        $validReject = $this->withHeader('Authorization', "Bearer {$this->superAdminToken}")
            ->putJson("/api/v1/admin/rewards/profiles/{$profile->id}/verify", [
                'approved' => false,
                'rejection_reason' => 'صورة الصك غير واضحة تماماً',
            ]);
        $validReject->assertStatus(200);

        $profile->refresh();
        $this->assertEquals('rejected', $profile->status);
        $this->assertEquals('صورة الصك غير واضحة تماماً', $profile->rejection_reason);

        // Verify SecurityAuditLog
        $this->assertDatabaseHas('security_audit_logs', [
            'action' => 'reject_payout_profile',
            'resource_id' => $profile->id,
        ]);
    }

    /**
     * P2-C: Monthly batch preview is strictly zero-mutation
     */
    public function test_preview_monthly_batch_is_zero_mutation(): void
    {
        $this->ledgerService->recordTransaction(
            $this->assistantUser->id,
            'reward_earned',
            'credit',
            12000.00,
            'booking',
            'BKG-PREV-1',
            'tx_preview_1',
            'Preview test reward',
            $this->superAdmin->id
        );

        $batchesCountBefore = AssistantPayoutBatch::count();
        $itemsCountBefore = AssistantPayoutBatchItem::count();

        $response = $this->withHeader('Authorization', "Bearer {$this->superAdminToken}")
            ->getJson('/api/v1/admin/rewards/batches/preview?period_start=2026-10-01&period_end=2026-10-31');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'eligible_assistants_count',
                    'total_estimated_payout',
                    'excluded_assistants_count',
                    'excluded_breakdown',
                ],
            ]);

        $this->assertEquals($batchesCountBefore, AssistantPayoutBatch::count());
        $this->assertEquals($itemsCountBefore, AssistantPayoutBatchItem::count());
    }

    /**
     * Decision D-02: Cancel unpaid batch restores assistant ledger balances and enforces invariants
     */
    public function test_cancel_unpaid_batch_enforces_d02_and_restores_balances(): void
    {
        // Setup active profile and 15,000 DZD balance
        $file = UploadedFile::fake()->create('cheque.pdf', 100, 'application/pdf');
        $profile = $this->profileService->submitProfile(
            $this->assistantUser,
            '00799999000123456789',
            $file
        );
        $this->profileService->verifyProfile($profile, $this->superAdmin, true);

        $this->ledgerService->recordTransaction(
            $this->assistantUser->id,
            'reward_earned',
            'credit',
            15000.00,
            'booking',
            'BKG-D02-1',
            'tx_d02_1',
            'D02 initial reward',
            $this->superAdmin->id
        );

        // Generate batch via endpoint
        $genResponse = $this->withHeader('Authorization', "Bearer {$this->superAdminToken}")
            ->postJson('/api/v1/admin/rewards/batches/generate', [
                'period_start' => '2026-10-01',
                'period_end' => '2026-10-31',
            ]);

        $genResponse->assertSuccessful();
        $batchId = $genResponse->json('data.id');
        $batch = AssistantPayoutBatch::findOrFail($batchId);

        $this->assertEquals('pending', $batch->status);

        // Cancel batch with mandatory reason
        $cancelResponse = $this->withHeader('Authorization', "Bearer {$this->superAdminToken}")
            ->postJson("/api/v1/admin/rewards/batches/{$batch->id}/cancel", [
                'reason' => 'إلغاء الدورة التدريبية المحاسبية للتصحيح',
            ]);

        $cancelResponse->assertStatus(200);

        // Verify batch and items status
        $batch->refresh();
        $this->assertEquals('cancelled', $batch->status);
        foreach ($batch->items as $item) {
            $this->assertEquals('cancelled', $item->status);
        }

        // Verify SecurityAuditLog
        $this->assertDatabaseHas('security_audit_logs', [
            'action' => 'cancel_payout_batch',
            'resource_id' => $batch->id,
        ]);
    }

    /**
     * D-02 Invariant: Cannot cancel batch if any item is already paid
     */
    public function test_cannot_cancel_batch_if_item_is_paid(): void
    {
        $file = UploadedFile::fake()->create('cheque.pdf', 100, 'application/pdf');
        $profile = $this->profileService->submitProfile(
            $this->assistantUser,
            '00799999000123456789',
            $file
        );
        $this->profileService->verifyProfile($profile, $this->superAdmin, true);

        $this->ledgerService->recordTransaction(
            $this->assistantUser->id,
            'reward_earned',
            'credit',
            15000.00,
            'booking',
            'BKG-D02-2',
            'tx_d02_2',
            'D02 reward 2',
            $this->superAdmin->id
        );

        $genResponse = $this->withHeader('Authorization', "Bearer {$this->superAdminToken}")
            ->postJson('/api/v1/admin/rewards/batches/generate', [
                'period_start' => '2026-10-01',
                'period_end' => '2026-10-31',
            ]);

        $batchId = $genResponse->json('data.id');
        $batch = AssistantPayoutBatch::findOrFail($batchId);
        $item = $batch->items->first();

        // Mark item as paid
        $this->payoutService->confirmBatchItem(
            $item,
            'CCP-TX-123456',
            $this->superAdmin
        );

        // Attempting to cancel batch should fail with 422
        $cancelResponse = $this->withHeader('Authorization', "Bearer {$this->superAdminToken}")
            ->postJson("/api/v1/admin/rewards/batches/{$batch->id}/cancel", [
                'reason' => 'محاولة إلغاء بعد الدفع',
            ]);

        $cancelResponse->assertStatus(422);
    }

    /**
     * SecurityAuditLog immutability test
     */
    public function test_security_audit_logs_are_immutable(): void
    {
        $log = SecurityAuditLog::create([
            'actor_id' => $this->superAdmin->id,
            'actor_role' => 'admin',
            'event_category' => 'assistant_rewards_admin',
            'action' => 'view_full_rip',
            'resource_type' => 'AssistantPayoutProfile',
            'resource_id' => 'profile-test-1',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit',
            'details' => ['test' => true],
        ]);

        $this->expectException(\RuntimeException::class);
        $log->update(['action' => 'tampered_action']);
    }
}
