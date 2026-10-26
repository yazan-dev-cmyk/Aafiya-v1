<?php

namespace Tests\Feature;

use App\Models\BookingCenter;
use App\Models\BookingPackage;
use App\Models\PackagePurchaseRequest;
use App\Models\Permission;
use App\Models\Role;
use App\Models\ScopedPermissionAssignment;
use App\Models\User;
use App\Services\GoogleDriveService;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class PackagePurchaseRequestReceiptTest extends TestCase
{
    use RefreshDatabase;

    protected Role $adminRole;
    protected Role $assistantRole;
    protected Role $bcRole;

    protected function setUp(): void
    {
        parent::setUp();
        GoogleDriveService::fake();

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            BookingPackageSeeder::class,
        ]);

        $this->adminRole = Role::where('name', 'admin')->firstOrFail();
        $this->assistantRole = Role::where('name', 'admin_assistant')->firstOrFail();
        $this->bcRole = Role::where('name', 'booking_center')->firstOrFail();
    }

    protected function tearDown(): void
    {
        GoogleDriveService::resetFake();
        parent::tearDown();
    }

    protected function createBookingCenterWithUser(): array
    {
        $user = User::factory()->create(['is_active' => true]);
        $user->assignRole('booking_center');

        $center = BookingCenter::create([
            'user_id' => $user->id,
            'name' => 'مركز الشفاء الطبي',
            'code' => 'BC-SHIFA-01',
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'is_active' => true,
            'quota_balance' => 50,
            'address' => 'الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'commune' => 'الجزائر الوسطى',
            'wilaya_code' => '16',
            'commune_code' => '1601',
            'phone' => '0555000000',
        ]);

        return [$user, $center];
    }

    public function test_booking_center_can_upload_receipt_with_purchase_request(): void
    {
        [$user, $center] = $this->createBookingCenterWithUser();

        $package = BookingPackage::where('is_active', true)->firstOrFail();

        $fakeFile = UploadedFile::fake()->create('proof_payment.pdf', 300, 'application/pdf');

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $package->id,
            'payment_method' => 'baridimob',
            'transaction_reference' => 'TXN-998877',
            'notes' => 'تحويل رسمي عبر بريدي موب',
            'receipt_file' => $fakeFile,
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.payment_method', 'baridimob');
        $response->assertJsonPath('data.transaction_reference', 'TXN-998877');
        $response->assertJsonPath('data.has_receipt', true);

        $purchaseRequest = PackagePurchaseRequest::where('booking_center_id', $center->id)->first();
        $this->assertNotNull($purchaseRequest);
        $this->assertStringStartsWith('gdrive:', $purchaseRequest->receipt_document_path);
        $this->assertStringContainsString($purchaseRequest->request_reference, $purchaseRequest->receipt_document_path);
    }

    public function test_rejects_unsupported_receipt_file_types_or_oversized_files(): void
    {
        [$user, $center] = $this->createBookingCenterWithUser();

        $package = BookingPackage::where('is_active', true)->firstOrFail();

        // Unsupported exe file
        $invalidFile = UploadedFile::fake()->create('malicious.exe', 100, 'application/x-msdownload');
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $package->id,
            'receipt_file' => $invalidFile,
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['receipt_file']);

        // Oversized file > 5MB
        $oversizedFile = UploadedFile::fake()->create('large.pdf', 6000, 'application/pdf');
        $responseOversized = $this->actingAs($user, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $package->id,
            'receipt_file' => $oversizedFile,
        ]);
        $responseOversized->assertStatus(422);
        $responseOversized->assertJsonValidationErrors(['receipt_file']);
    }

    public function test_receipt_is_mandatory_for_paid_package(): void
    {
        [$user, $center] = $this->createBookingCenterWithUser();

        $paidPackage = BookingPackage::where('is_active', true)->where('price_dzd', '>', 0)->firstOrFail();

        // Submit without receipt_file
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $paidPackage->id,
            'payment_method' => 'baridimob',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['receipt_file']);
    }

    public function test_free_package_can_be_granted_only_once(): void
    {
        [$user, $center] = $this->createBookingCenterWithUser();

        $freePackage = BookingPackage::create([
            'name' => 'باقة تجريبية مجانية',
            'package_code' => 'PKG-FREE-TRIAL',
            'quota_units' => 15,
            'price_dzd' => 0.00,
            'is_active' => true,
        ]);

        // First request: succeeds without receipt
        $res1 = $this->actingAs($user, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $freePackage->id,
        ]);
        $res1->assertStatus(201);

        // Second request: rejected because already claimed
        $res2 = $this->actingAs($user, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $freePackage->id,
        ]);
        $res2->assertStatus(422);
        $res2->assertJsonValidationErrors(['package_id']);
    }

    public function test_admin_and_authorized_assistant_can_view_and_download_receipt(): void
    {
        [$user, $center] = $this->createBookingCenterWithUser();

        $package = BookingPackage::where('is_active', true)->firstOrFail();

        $fakeFile = UploadedFile::fake()->create('bank_receipt.png', 150, 'image/png');

        $createRes = $this->actingAs($user, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $package->id,
            'receipt_file' => $fakeFile,
        ]);
        $createRes->assertStatus(201);
        $requestId = $createRes->json('data.id');

        // 1. Admin can access receipt
        $admin = User::factory()->create(['is_active' => true]);
        $admin->assignRole('admin');

        $adminRes = $this->actingAs($admin, 'sanctum')->get("/api/v1/admin/package-purchase-requests/{$requestId}/receipt");
        $adminRes->assertStatus(200);
        $this->assertEquals('image/png', $adminRes->headers->get('Content-Type'));

        // 2. Admin Assistant WITH platform.approve_requests permission
        $assistantWithPerm = User::factory()->create(['is_active' => true]);
        $assistantWithPerm->assignRole('admin_assistant');

        $approvePerm = Permission::where('name', 'platform.approve_requests')->firstOrFail();
        ScopedPermissionAssignment::create([
            'user_id' => $assistantWithPerm->id,
            'permission_id' => $approvePerm->id,
            'scope_type' => 'platform',
            'scope_id' => 'global',
            'is_active' => true,
            'granted_by_id' => $admin->id,
        ]);

        $asstRes = $this->actingAs($assistantWithPerm, 'sanctum')->get("/api/v1/admin/package-purchase-requests/{$requestId}/receipt");
        $asstRes->assertStatus(200);

        // 3. Admin Assistant WITHOUT platform.approve_requests permission
        $assistantWithoutPerm = User::factory()->create(['is_active' => true]);
        $assistantWithoutPerm->assignRole('admin_assistant');

        $deniedRes = $this->actingAs($assistantWithoutPerm, 'sanctum')->get("/api/v1/admin/package-purchase-requests/{$requestId}/receipt");
        $deniedRes->assertStatus(403);
    }

    public function test_booking_center_can_view_own_receipt_but_not_others(): void
    {
        [$user1, $center1] = $this->createBookingCenterWithUser();
        [$user2, $center2] = $this->createBookingCenterWithUser();

        $package = BookingPackage::where('is_active', true)->firstOrFail();

        $fakeFile = UploadedFile::fake()->create('center1_receipt.pdf', 100, 'application/pdf');

        $createRes = $this->actingAs($user1, 'sanctum')->postJson('/api/v1/booking-centers/purchase-requests', [
            'package_id' => $package->id,
            'receipt_file' => $fakeFile,
        ]);
        $requestId = $createRes->json('data.id');

        // User 1 can view own receipt
        $ownRes = $this->actingAs($user1, 'sanctum')->get("/api/v1/booking-centers/purchase-requests/{$requestId}/receipt");
        $ownRes->assertStatus(200);
        $this->assertEquals('application/pdf', $ownRes->headers->get('Content-Type'));

        // User 2 cannot view User 1 receipt
        $otherRes = $this->actingAs($user2, 'sanctum')->get("/api/v1/booking-centers/purchase-requests/{$requestId}/receipt");
        $otherRes->assertStatus(403);
    }
}
