<?php

namespace Tests\Feature\Api\V1;

use App\Models\BookingCenter;
use App\Models\BookingTransaction;
use App\Models\Permission;
use App\Models\Role;
use App\Models\ScopedPermissionAssignment;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDirectQuotaGrantTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected string $adminToken;
    protected BookingCenter $bookingCenter;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            BookingPackageSeeder::class,
        ]);

        // Create Platform Admin
        $this->adminUser = User::factory()->create([
            'email' => 'admin.quota02@aafiya.dz',
            'is_active' => true,
        ]);
        $this->adminUser->assignRole('admin');
        $this->adminToken = $this->adminUser->createToken('admin-test')->plainTextToken;

        // Create Booking Center Owner & Center
        $bcUser = User::factory()->create([
            'email' => 'bc.owner@aafiya.dz',
            'is_active' => true,
        ]);
        $bcUser->assignRole('booking_center');

        $this->bookingCenter = BookingCenter::create([
            'user_id' => $bcUser->id,
            'name' => 'مركز النور للحجز',
            'phone' => '021998877',
            'address' => 'شارع العربي بن مهيدي',
            'wilaya' => 'الجزائر',
            'commercial_register' => 'CR-16-998877',
            'quota_balance' => 50,
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'verified_at' => now(),
            'is_active' => true,
        ]);
    }

    /**
     * 1. Platform Admin can successfully grant 1 quota unit.
     */
    public function test_platform_admin_can_grant_single_quota_unit(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->adminToken)
            ->postJson("/api/v1/booking-centers/{$this->bookingCenter->id}/grant-quota", [
                'units' => 1,
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.booking_center_id', $this->bookingCenter->id);
        $response->assertJsonPath('data.quota_balance', 51);
        $response->assertJsonPath('data.transaction.units', 1);
        $response->assertJsonPath('data.transaction.balance_after', 51);
        $response->assertJsonPath('data.transaction.transaction_type', 'purchase');

        // Verify Database Persistence
        $this->assertDatabaseHas('booking_centers', [
            'id' => $this->bookingCenter->id,
            'quota_balance' => 51,
        ]);

        $this->assertDatabaseHas('booking_transactions', [
            'booking_center_id' => $this->bookingCenter->id,
            'transaction_type' => 'purchase',
            'units' => 1,
            'balance_after' => 51,
            'reference_note' => 'منح رصيد إداري (+1 وحدة)',
            'created_by_id' => $this->adminUser->id,
        ]);
    }

    /**
     * 2. Platform Admin can grant multiple quota units with custom reference note.
     */
    public function test_platform_admin_can_grant_multiple_quota_units_with_custom_note(): void
    {
        $customNote = 'منحة إدارية تشجيعية لنشاط المركز الاستثنائي';

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->adminToken)
            ->postJson("/api/v1/booking-centers/{$this->bookingCenter->id}/grant-quota", [
                'units' => 25,
                'reference_note' => $customNote,
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.quota_balance', 75);
        $response->assertJsonPath('data.transaction.units', 25);
        $response->assertJsonPath('data.transaction.balance_after', 75);
        $response->assertJsonPath('data.transaction.reference_note', $customNote);

        $this->assertDatabaseHas('booking_centers', [
            'id' => $this->bookingCenter->id,
            'quota_balance' => 75,
        ]);

        $this->assertDatabaseHas('booking_transactions', [
            'booking_center_id' => $this->bookingCenter->id,
            'units' => 25,
            'balance_after' => 75,
            'reference_note' => $customNote,
            'created_by_id' => $this->adminUser->id,
        ]);
    }

    /**
     * 3. Admin Assistant with platform.approve_requests 4D permission can grant quota.
     */
    public function test_admin_assistant_with_delegated_permission_can_grant_quota(): void
    {
        $assistant = User::factory()->create([
            'email' => 'assistant.auth@aafiya.dz',
            'is_active' => true,
        ]);
        $assistant->assignRole('admin_assistant');

        $approvePerm = Permission::where('name', 'platform.approve_requests')->firstOrFail();
        ScopedPermissionAssignment::create([
            'user_id' => $assistant->id,
            'permission_id' => $approvePerm->id,
            'scope_type' => 'platform',
            'is_active' => true,
            'granted_by_id' => $this->adminUser->id,
        ]);

        $astToken = $assistant->createToken('assistant-test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $astToken)
            ->postJson("/api/v1/booking-centers/{$this->bookingCenter->id}/grant-quota", [
                'units' => 5,
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.quota_balance', 55);

        $this->assertDatabaseHas('booking_centers', [
            'id' => $this->bookingCenter->id,
            'quota_balance' => 55,
        ]);
    }

    /**
     * 4. Admin Assistant WITHOUT platform.approve_requests permission is forbidden (HTTP 403).
     */
    public function test_admin_assistant_without_delegated_permission_is_forbidden(): void
    {
        $assistant = User::factory()->create([
            'email' => 'assistant.noauth@aafiya.dz',
            'is_active' => true,
        ]);
        $assistant->assignRole('admin_assistant');

        $astToken = $assistant->createToken('assistant-unauth-test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $astToken)
            ->postJson("/api/v1/booking-centers/{$this->bookingCenter->id}/grant-quota", [
                'units' => 10,
            ]);

        $response->assertStatus(403);
        $response->assertJsonPath('message', 'غير مصرح لك بمنح رصيد حجز لمركز الحجز.');

        // Quota balance remains untouched
        $this->assertDatabaseHas('booking_centers', [
            'id' => $this->bookingCenter->id,
            'quota_balance' => 50,
        ]);

        $this->assertDatabaseMissing('booking_transactions', [
            'booking_center_id' => $this->bookingCenter->id,
        ]);
    }

    /**
     * 5. Unauthorized roles (doctor, booking_center, patient) are rejected with HTTP 403.
     */
    public function test_unauthorized_roles_receive_forbidden(): void
    {
        $rolesToTest = ['doctor', 'booking_center', 'patient'];

        foreach ($rolesToTest as $roleName) {
            $user = User::factory()->create([
                'email' => "user.{$roleName}@aafiya.dz",
                'is_active' => true,
            ]);
            $user->assignRole($roleName);
            $token = $user->createToken("{$roleName}-test")->plainTextToken;

            $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                ->postJson("/api/v1/booking-centers/{$this->bookingCenter->id}/grant-quota", [
                    'units' => 10,
                ]);

            $response->assertStatus(403);
        }

        // Quota remains untouched
        $this->assertEquals(50, $this->bookingCenter->fresh()->quota_balance);
        $this->assertDatabaseMissing('booking_transactions', [
            'booking_center_id' => $this->bookingCenter->id,
        ]);
    }

    /**
     * 6. Unauthenticated requests are rejected with HTTP 401.
     */
    public function test_unauthenticated_requests_are_rejected(): void
    {
        $response = $this->postJson("/api/v1/booking-centers/{$this->bookingCenter->id}/grant-quota", [
            'units' => 1,
        ]);

        $response->assertStatus(401);
        $this->assertEquals(50, $this->bookingCenter->fresh()->quota_balance);
    }

    /**
     * 7. Validation: units = 0 is rejected (HTTP 422).
     */
    public function test_validation_rejects_zero_units(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->adminToken)
            ->postJson("/api/v1/booking-centers/{$this->bookingCenter->id}/grant-quota", [
                'units' => 0,
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['units']);
        $this->assertEquals(50, $this->bookingCenter->fresh()->quota_balance);
    }

    /**
     * 8. Validation: negative units are rejected (HTTP 422).
     */
    public function test_validation_rejects_negative_units(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->adminToken)
            ->postJson("/api/v1/booking-centers/{$this->bookingCenter->id}/grant-quota", [
                'units' => -5,
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['units']);
        $this->assertEquals(50, $this->bookingCenter->fresh()->quota_balance);
    }

    /**
     * 9. Validation: decimal units are rejected (HTTP 422).
     */
    public function test_validation_rejects_decimal_units(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->adminToken)
            ->postJson("/api/v1/booking-centers/{$this->bookingCenter->id}/grant-quota", [
                'units' => 2.5,
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['units']);
        $this->assertEquals(50, $this->bookingCenter->fresh()->quota_balance);
    }

    /**
     * 10. Validation: missing units is rejected (HTTP 422).
     */
    public function test_validation_rejects_missing_units(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->adminToken)
            ->postJson("/api/v1/booking-centers/{$this->bookingCenter->id}/grant-quota", []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['units']);
        $this->assertEquals(50, $this->bookingCenter->fresh()->quota_balance);
    }

    /**
     * 11. Validation: reference note > 255 characters is rejected (HTTP 422).
     */
    public function test_validation_rejects_reference_note_exceeding_max_length(): void
    {
        $tooLongNote = str_repeat('A', 256);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->adminToken)
            ->postJson("/api/v1/booking-centers/{$this->bookingCenter->id}/grant-quota", [
                'units' => 5,
                'reference_note' => $tooLongNote,
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['reference_note']);
        $this->assertEquals(50, $this->bookingCenter->fresh()->quota_balance);
    }

    /**
     * 12. Pessimistic lock and atomic transaction verification: balance matches exactly.
     */
    public function test_balance_and_ledger_integrity_after_consecutive_grants(): void
    {
        $firstGrant = $this->withHeader('Authorization', 'Bearer ' . $this->adminToken)
            ->postJson("/api/v1/booking-centers/{$this->bookingCenter->id}/grant-quota", [
                'units' => 3,
                'reference_note' => 'المنحة الأولى',
            ]);
        $firstGrant->assertStatus(200);
        $firstGrant->assertJsonPath('data.quota_balance', 53);

        $secondGrant = $this->withHeader('Authorization', 'Bearer ' . $this->adminToken)
            ->postJson("/api/v1/booking-centers/{$this->bookingCenter->id}/grant-quota", [
                'units' => 7,
                'reference_note' => 'المنحة الثانية',
            ]);
        $secondGrant->assertStatus(200);
        $secondGrant->assertJsonPath('data.quota_balance', 60);

        $this->assertEquals(60, $this->bookingCenter->fresh()->quota_balance);
        $this->assertEquals(2, BookingTransaction::where('booking_center_id', $this->bookingCenter->id)->count());
    }
}
