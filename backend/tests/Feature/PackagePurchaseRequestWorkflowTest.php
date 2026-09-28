<?php

namespace Tests\Feature;

use App\Models\BookingCenter;
use App\Models\BookingPackage;
use App\Models\BookingTransaction;
use App\Models\PackagePurchaseRequest;
use App\Models\Permission;
use App\Models\Role;
use App\Models\ScopedPermissionAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PackagePurchaseRequestWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $authorizedAssistantUser;
    protected User $unauthorizedAssistantUser;
    protected User $bookingCenterUser;
    protected User $otherBookingCenterUser;
    protected User $patientUser;
    protected BookingCenter $bookingCenter;
    protected BookingCenter $otherBookingCenter;
    protected BookingPackage $activePackage;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Roles
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Platform Admin']);
        $assistantRole = Role::firstOrCreate(['name' => 'admin_assistant'], ['display_name' => 'Admin Assistant']);
        $bcRole = Role::firstOrCreate(['name' => 'booking_center'], ['display_name' => 'Booking Center']);
        $patientRole = Role::firstOrCreate(['name' => 'patient_registered'], ['display_name' => 'Patient']);

        // 2. Permission
        $approvePerm = Permission::firstOrCreate(
            ['name' => 'platform.approve_requests'],
            ['display_name' => 'Approve Registration Requests', 'category' => 'platform']
        );

        // 3. Actors
        $this->adminUser = User::factory()->create();
        $this->adminUser->roles()->attach($adminRole->id);

        $this->authorizedAssistantUser = User::factory()->create();
        $this->authorizedAssistantUser->roles()->attach($assistantRole->id);
        ScopedPermissionAssignment::create([
            'user_id' => $this->authorizedAssistantUser->id,
            'permission_id' => $approvePerm->id,
            'scope_type' => 'platform',
            'scope_id' => 'global',
            'is_active' => true,
            'granted_by_id' => $this->adminUser->id,
        ]);

        $this->unauthorizedAssistantUser = User::factory()->create();
        $this->unauthorizedAssistantUser->roles()->attach($assistantRole->id);

        $this->bookingCenterUser = User::factory()->create();
        $this->bookingCenterUser->roles()->attach($bcRole->id);
        $this->bookingCenter = BookingCenter::create([
            'user_id' => $this->bookingCenterUser->id,
            'name' => 'مركز حجز الجزائر',
            'phone' => '0555000001',
            'address' => 'الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'quota_balance' => 50,
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'is_active' => true,
        ]);

        $this->otherBookingCenterUser = User::factory()->create();
        $this->otherBookingCenterUser->roles()->attach($bcRole->id);
        $this->otherBookingCenter = BookingCenter::create([
            'user_id' => $this->otherBookingCenterUser->id,
            'name' => 'مركز حجز وهران',
            'phone' => '0555000002',
            'address' => 'وهران',
            'wilaya' => 'وهران',
            'quota_balance' => 20,
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'is_active' => true,
        ]);

        $this->patientUser = User::factory()->create();
        $this->patientUser->roles()->attach($patientRole->id);

        // 4. Booking Package
        $this->activePackage = BookingPackage::create([
            'package_code' => 'PKG-TEST-500',
            'name' => 'باقة 500 موعد اختبارية',
            'quota_units' => 500,
            'price_dzd' => 25000,
            'is_active' => true,
        ]);
    }

    /**
     * A. Creation Workflow Tests
     */
    public function test_booking_center_can_create_purchase_request_in_pending_status_with_snapshots(): void
    {
        $response = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $this->activePackage->id,
            'payment_method' => 'baridimob',
            'transaction_reference' => 'TXN-BARIDI-123456',
            'notes' => 'تحويل رسمي',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.package_name', 'باقة 500 موعد اختبارية')
            ->assertJsonPath('data.package_code', 'PKG-TEST-500')
            ->assertJsonPath('data.quota_units', 500)
            ->assertJsonPath('data.price_dzd', 25000);

        $requestId = $response->json('data.id');
        $this->assertDatabaseHas('package_purchase_requests', [
            'id' => $requestId,
            'status' => 'pending',
            'booking_center_id' => $this->bookingCenter->id,
            'quota_units' => 500,
        ]);

        // Invariants: quota balance unchanged, no ledger transactions
        $this->assertEquals(50, $this->bookingCenter->fresh()->quota_balance);
        $this->assertEquals(0, BookingTransaction::where('booking_center_id', $this->bookingCenter->id)->count());
    }

    /**
     * B. Legacy Compatibility Route Test
     */
    public function test_legacy_purchase_package_endpoint_creates_pending_request_instead_of_direct_credit(): void
    {
        $response = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/booking-centers/purchase-package', [
            'package_id' => $this->activePackage->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.quota_units', 500);

        // Verified: quota did NOT increase immediately
        $this->assertEquals(50, $this->bookingCenter->fresh()->quota_balance);
        $this->assertEquals(0, BookingTransaction::where('booking_center_id', $this->bookingCenter->id)->count());
    }

    /**
     * C. Approval Workflow Tests
     */
    public function test_platform_admin_can_approve_pending_request_and_credits_quota(): void
    {
        $createRes = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $this->activePackage->id,
        ]);
        $requestId = $createRes->json('data.id');

        $approveRes = $this->actingAs($this->adminUser, 'sanctum')->postJson("/api/v1/admin/package-purchase-requests/{$requestId}/approve");

        $approveRes->assertStatus(200)
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.booking_center.quota_balance', 550);

        // Verify Database state
        $this->assertEquals(550, $this->bookingCenter->fresh()->quota_balance);
        $this->assertEquals(1, BookingTransaction::where('booking_center_id', $this->bookingCenter->id)->count());

        $tx = BookingTransaction::where('booking_center_id', $this->bookingCenter->id)->first();
        $this->assertEquals('purchase', $tx->transaction_type);
        $this->assertEquals(500, $tx->units);
        $this->assertEquals(550, $tx->balance_after);

        $this->assertDatabaseHas('package_purchase_requests', [
            'id' => $requestId,
            'status' => 'approved',
            'reviewed_by_id' => $this->adminUser->id,
            'booking_transaction_id' => $tx->id,
        ]);
    }

    public function test_authorized_admin_assistant_can_approve_request(): void
    {
        $createRes = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $this->activePackage->id,
        ]);
        $requestId = $createRes->json('data.id');

        $approveRes = $this->actingAs($this->authorizedAssistantUser, 'sanctum')->postJson("/api/v1/admin/package-purchase-requests/{$requestId}/approve");

        $approveRes->assertStatus(200)
            ->assertJsonPath('data.status', 'approved');

        $this->assertEquals(550, $this->bookingCenter->fresh()->quota_balance);
    }

    /**
     * D. Authorization & Security Tests
     */
    public function test_unauthorized_assistant_cannot_approve_request(): void
    {
        $createRes = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $this->activePackage->id,
        ]);
        $requestId = $createRes->json('data.id');

        $response = $this->actingAs($this->unauthorizedAssistantUser, 'sanctum')->postJson("/api/v1/admin/package-purchase-requests/{$requestId}/approve");
        $response->assertStatus(403);

        $this->assertEquals(50, $this->bookingCenter->fresh()->quota_balance);
    }

    public function test_booking_center_cannot_approve_own_request(): void
    {
        $createRes = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $this->activePackage->id,
        ]);
        $requestId = $createRes->json('data.id');

        $response = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson("/api/v1/admin/package-purchase-requests/{$requestId}/approve");
        $response->assertStatus(403);

        $this->assertEquals(50, $this->bookingCenter->fresh()->quota_balance);
    }

    public function test_patient_cannot_access_or_approve_requests(): void
    {
        $createRes = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $this->activePackage->id,
        ]);
        $requestId = $createRes->json('data.id');

        $this->actingAs($this->patientUser, 'sanctum')->getJson('/api/v1/admin/package-purchase-requests')->assertStatus(403);
        $this->actingAs($this->patientUser, 'sanctum')->postJson("/api/v1/admin/package-purchase-requests/{$requestId}/approve")->assertStatus(403);
    }

    /**
     * E. Rejection Workflow Tests
     */
    public function test_platform_admin_can_reject_request_with_reason_and_zero_quota_effect(): void
    {
        $createRes = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $this->activePackage->id,
        ]);
        $requestId = $createRes->json('data.id');

        $rejectRes = $this->actingAs($this->adminUser, 'sanctum')->postJson("/api/v1/admin/package-purchase-requests/{$requestId}/reject", [
            'rejection_reason' => 'إشعار الدفع غير واضح أو الحساب غير مطابق.',
        ]);

        $rejectRes->assertStatus(200)
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.rejection_reason', 'إشعار الدفع غير واضح أو الحساب غير مطابق.');

        // Invariants
        $this->assertEquals(50, $this->bookingCenter->fresh()->quota_balance);
        $this->assertEquals(0, BookingTransaction::where('booking_center_id', $this->bookingCenter->id)->count());
    }

    public function test_rejection_requires_rejection_reason(): void
    {
        $createRes = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $this->activePackage->id,
        ]);
        $requestId = $createRes->json('data.id');

        $rejectRes = $this->actingAs($this->adminUser, 'sanctum')->postJson("/api/v1/admin/package-purchase-requests/{$requestId}/reject", []);
        $rejectRes->assertStatus(422)->assertJsonValidationErrors(['rejection_reason']);
    }

    /**
     * F. State Guards & Idempotency Tests
     */
    public function test_already_approved_request_cannot_be_approved_again(): void
    {
        $createRes = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $this->activePackage->id,
        ]);
        $requestId = $createRes->json('data.id');

        // First approval -> Success (50 -> 550)
        $this->actingAs($this->adminUser, 'sanctum')->postJson("/api/v1/admin/package-purchase-requests/{$requestId}/approve")->assertStatus(200);
        $this->assertEquals(550, $this->bookingCenter->fresh()->quota_balance);

        // Second approval -> Rejected with 422
        $secondRes = $this->actingAs($this->adminUser, 'sanctum')->postJson("/api/v1/admin/package-purchase-requests/{$requestId}/approve");
        $secondRes->assertStatus(422);

        // Quota remains 550, strictly 1 transaction
        $this->assertEquals(550, $this->bookingCenter->fresh()->quota_balance);
        $this->assertEquals(1, BookingTransaction::where('booking_center_id', $this->bookingCenter->id)->count());
    }

    public function test_already_rejected_request_cannot_be_approved(): void
    {
        $createRes = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $this->activePackage->id,
        ]);
        $requestId = $createRes->json('data.id');

        $this->actingAs($this->adminUser, 'sanctum')->postJson("/api/v1/admin/package-purchase-requests/{$requestId}/reject", [
            'rejection_reason' => 'مرفوض',
        ])->assertStatus(200);

        $approveRes = $this->actingAs($this->adminUser, 'sanctum')->postJson("/api/v1/admin/package-purchase-requests/{$requestId}/approve");
        $approveRes->assertStatus(422);

        $this->assertEquals(50, $this->bookingCenter->fresh()->quota_balance);
    }

    /**
     * G. Isolation & Scoping Tests
     */
    public function test_booking_center_can_only_view_own_requests(): void
    {
        // Center A creates a request
        $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $this->activePackage->id,
        ]);

        // Center B lists its requests
        $resB = $this->actingAs($this->otherBookingCenterUser, 'sanctum')->getJson('/api/v1/booking-centers/purchase-requests');
        $resB->assertStatus(200)->assertJsonCount(0, 'data');

        // Center A lists its requests
        $resA = $this->actingAs($this->bookingCenterUser, 'sanctum')->getJson('/api/v1/booking-centers/purchase-requests');
        $resA->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_package_purchase_requests_pagination_contract_and_page_isolation(): void
    {
        for ($i = 0; $i < 25; $i++) {
            PackagePurchaseRequest::create([
                'request_reference' => "REQ-TEST-{$i}-" . uniqid(),
                'booking_center_id' => $this->bookingCenter->id,
                'booking_package_id' => $this->activePackage->id,
                'package_name' => $this->activePackage->name,
                'package_code' => $this->activePackage->package_code,
                'quota_units' => $this->activePackage->quota_units,
                'price_dzd' => $this->activePackage->price_dzd,
                'status' => 'pending',
                'created_by_id' => $this->bookingCenterUser->id,
            ]);
        }

        $resPage1 = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/admin/package-purchase-requests?page=1&per_page=10');

        $resPage1->assertStatus(200)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 10);

        $data1 = $resPage1->json('data');
        $this->assertCount(10, $data1);
        $page1Ids = array_column($data1, 'id');

        $resPage2 = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/admin/package-purchase-requests?page=2&per_page=10');

        $resPage2->assertStatus(200)
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 10);

        $data2 = $resPage2->json('data');
        $this->assertCount(10, $data2);
        $page2Ids = array_column($data2, 'id');

        $overlap = array_intersect($page1Ids, $page2Ids);
        $this->assertEmpty($overlap, 'Package Purchase Requests Page 1 and Page 2 must not overlap.');
    }
}
