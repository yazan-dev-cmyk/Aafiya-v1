<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BookingCenter;
use App\Models\BookingPackage;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Permission;
use App\Models\Role;
use App\Models\ScopedPermissionAssignment;
use App\Models\User;
use App\Services\BookingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class BookingCenterVerificationLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $authorizedAssistantUser;
    protected User $unauthorizedAssistantUser;
    protected User $centerManagerUser;
    protected BookingCenter $pendingCenter;
    protected Role $adminRole;
    protected Role $assistantRole;
    protected Role $bcRole;
    protected Role $patientRole;
    protected Permission $approvePerm;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Roles
        $this->adminRole = Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Platform Admin']);
        $this->assistantRole = Role::firstOrCreate(['name' => 'admin_assistant'], ['display_name' => 'Admin Assistant']);
        $this->bcRole = Role::firstOrCreate(['name' => 'booking_center'], ['display_name' => 'Booking Center']);
        $this->patientRole = Role::firstOrCreate(['name' => 'patient_registered'], ['display_name' => 'Patient']);

        // 2. Permissions
        $this->approvePerm = Permission::firstOrCreate(
            ['name' => 'platform.approve_requests'],
            ['display_name' => 'Approve Registration Requests', 'category' => 'platform']
        );

        // 3. Actors
        $this->adminUser = User::factory()->create();
        $this->adminUser->roles()->attach($this->adminRole->id);

        $this->authorizedAssistantUser = User::factory()->create();
        $this->authorizedAssistantUser->roles()->attach($this->assistantRole->id);
        ScopedPermissionAssignment::create([
            'user_id'       => $this->authorizedAssistantUser->id,
            'permission_id' => $this->approvePerm->id,
            'scope_type'    => 'platform',
            'scope_id'      => 'global',
            'is_active'     => true,
            'granted_by_id' => $this->adminUser->id,
        ]);

        $this->unauthorizedAssistantUser = User::factory()->create();
        $this->unauthorizedAssistantUser->roles()->attach($this->assistantRole->id);

        // 4. Pending Booking Center
        $this->centerManagerUser = User::factory()->create(['name' => 'مدير المركز']);
        $this->centerManagerUser->roles()->attach($this->bcRole->id);

        $this->pendingCenter = BookingCenter::create([
            'user_id'             => $this->centerManagerUser->id,
            'name'                => 'وكالة الشفاء للحجز الطبي',
            'commercial_register' => 'RC-16/00-1122334',
            'phone'               => '+213550000099',
            'email'               => 'agency@aafiya.dz',
            'address'             => 'شارع الشهداء، الجزائر',
            'wilaya'              => 'الجزائر العاصمة',
            'quota_balance'       => 10,
            'verification_status' => BookingCenter::STATUS_PENDING,
            'is_active'           => false,
        ]);
    }

    public function test_public_registration_provisions_user_and_booking_center_in_pending_state(): void
    {
        $payload = [
            'name'                  => 'وكالة النور الحديثة',
            'manager_name'          => 'كريم أحمد',
            'commercial_register'   => 'RC-16/00-9988776',
            'email'                 => 'alnoor.agency@aafiya.dz',
            'phone'                 => '+213551234567',
            'password'              => 'StrongP@ss123',
            'password_confirmation' => 'StrongP@ss123',
            'role'                  => 'booking_center',
            'wilaya'                => 'وهران',
            'address'               => 'حي السلام، وهران',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('data.user.roles.0', 'booking_center');

        $this->assertDatabaseHas('users', [
            'email' => 'alnoor.agency@aafiya.dz',
            'name'  => 'كريم أحمد',
        ]);

        $this->assertDatabaseHas('booking_centers', [
            'name'                => 'وكالة النور الحديثة',
            'commercial_register' => 'RC-16/00-9988776',
            'wilaya'              => 'وهران',
            'verification_status' => 'pending',
            'is_active'           => false,
        ]);
    }

    public function test_unique_user_id_prevents_duplicate_centers_per_user(): void
    {
        $this->expectException(\Illuminate\Database\UniqueConstraintViolationException::class);

        BookingCenter::create([
            'user_id'             => $this->centerManagerUser->id,
            'name'                => 'مركز مكرر',
            'phone'               => '+213550000000',
            'address'             => 'عنوان',
            'wilaya'              => 'الجزائر العاصمة',
            'verification_status' => BookingCenter::STATUS_PENDING,
            'is_active'           => false,
        ]);
    }

    public function test_unverified_pending_center_cannot_create_appointments(): void
    {
        $bookingService = app(BookingService::class);

        $clinic = Clinic::create([
            'name' => 'عيادة الشفاء',
            'address' => 'الجزائر',
            'wilaya' => 'الجزائر العاصمة',
            'phone' => '+213550000011',
            'is_active' => true,
        ]);

        $docUser = User::factory()->create();
        $doctorRole = Role::firstOrCreate(['name' => 'doctor'], ['display_name' => 'Doctor']);
        $docUser->roles()->attach($doctorRole->id);
        $doctor = Doctor::create([
            'user_id' => $docUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DZ-DOC-12345',
            'is_verified' => true,
        ]);
        $doctor->clinics()->attach($clinic->id, [
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now(),
        ]);

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('حساب مركز الحجز غير معتمد أو غير مفعل.');

        $bookingService->createAppointment([
            'clinic_id'         => $clinic->id,
            'doctor_id'         => $doctor->id,
            'booking_center_id' => $this->pendingCenter->id,
            'appointment_date'  => now()->addDays(2)->format('Y-m-d'),
            'time_slot'         => '10:00:00',
            'patient_type'      => 'unregistered',
            'patient_name'      => 'علي محمد',
            'patient_phone'     => '+213551112233',
        ], $this->centerManagerUser);
    }

    public function test_unverified_pending_center_cannot_purchase_packages(): void
    {
        $package = BookingPackage::create([
            'name'         => 'باقة 100 حجز',
            'package_code' => 'PKG-100',
            'quota_units'  => 100,
            'price_dzd'    => 5000,
            'is_active'    => true,
        ]);

        $response = $this->actingAs($this->centerManagerUser)
            ->postJson('/api/v1/booking-centers/purchase-package', [
                'package_id'            => $package->id,
                'payment_method'        => 'bank_transfer',
                'transaction_reference' => 'TX-REF-12345',
            ]);

        $response->assertStatus(403);
    }

    public function test_platform_director_sees_pending_center_in_list(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->getJson('/api/v1/booking-centers?status=pending');

        $response->assertStatus(200);
        $response->assertJsonFragment(['id' => $this->pendingCenter->id]);
        $response->assertJsonFragment(['verification_status' => 'pending']);
    }

    public function test_platform_director_can_approve_pending_center(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->putJson("/api/v1/admin/booking-centers/{$this->pendingCenter->id}/verify");

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'success');
        $response->assertJsonPath('data.verification_status', 'verified');
        $response->assertJsonPath('data.is_active', true);

        $fresh = $this->pendingCenter->fresh();
        $this->assertEquals('verified', $fresh->verification_status);
        $this->assertTrue($fresh->is_active);
        $this->assertNotNull($fresh->verified_at);
        $this->assertEquals($this->adminUser->id, $fresh->reviewed_by_id);
    }

    public function test_platform_director_can_reject_pending_center_with_reason(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->postJson("/api/v1/admin/booking-centers/{$this->pendingCenter->id}/reject", [
                'rejection_reason' => 'السجل التجاري المقدم منتهي الصلاحية.',
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'success');
        $response->assertJsonPath('data.verification_status', 'rejected');
        $response->assertJsonPath('data.is_active', false);
        $response->assertJsonPath('data.rejection_reason', 'السجل التجاري المقدم منتهي الصلاحية.');

        $fresh = $this->pendingCenter->fresh();
        $this->assertEquals('rejected', $fresh->verification_status);
        $this->assertFalse($fresh->is_active);
        $this->assertEquals('السجل التجاري المقدم منتهي الصلاحية.', $fresh->rejection_reason);
        $this->assertEquals($this->adminUser->id, $fresh->reviewed_by_id);
    }

    public function test_rejection_requires_valid_reason(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->postJson("/api/v1/admin/booking-centers/{$this->pendingCenter->id}/reject", [
                'rejection_reason' => '   ',
            ]);

        $response->assertStatus(422);
    }

    public function test_unauthorized_user_cannot_approve_or_reject(): void
    {
        $responseApprove = $this->actingAs($this->centerManagerUser)
            ->putJson("/api/v1/admin/booking-centers/{$this->pendingCenter->id}/verify");
        $responseApprove->assertStatus(403);

        $responseReject = $this->actingAs($this->centerManagerUser)
            ->postJson("/api/v1/admin/booking-centers/{$this->pendingCenter->id}/reject", [
                'rejection_reason' => 'سبب رفض غير مصرح به',
            ]);
        $responseReject->assertStatus(403);
    }

    public function test_assistant_without_delegated_permission_cannot_approve_or_reject(): void
    {
        $responseApprove = $this->actingAs($this->unauthorizedAssistantUser)
            ->putJson("/api/v1/admin/booking-centers/{$this->pendingCenter->id}/verify");
        $responseApprove->assertStatus(403);

        $responseReject = $this->actingAs($this->unauthorizedAssistantUser)
            ->postJson("/api/v1/admin/booking-centers/{$this->pendingCenter->id}/reject", [
                'rejection_reason' => 'سبب رفض',
            ]);
        $responseReject->assertStatus(403);
    }

    public function test_assistant_with_delegated_permission_can_approve_and_reject(): void
    {
        $responseApprove = $this->actingAs($this->authorizedAssistantUser)
            ->putJson("/api/v1/admin/booking-centers/{$this->pendingCenter->id}/verify");

        $responseApprove->assertStatus(200);
        $responseApprove->assertJsonPath('data.verification_status', 'verified');
        $this->assertEquals($this->authorizedAssistantUser->id, $this->pendingCenter->fresh()->reviewed_by_id);
    }

    public function test_rejected_center_can_resubmit_back_to_pending(): void
    {
        $this->pendingCenter->update([
            'verification_status' => BookingCenter::STATUS_REJECTED,
            'rejection_reason'    => 'ملف غير مكتمل',
            'reviewed_by_id'      => $this->adminUser->id,
            'is_active'           => false,
        ]);

        $response = $this->actingAs($this->centerManagerUser)
            ->postJson('/api/v1/booking-centers/resubmit', [
                'commercial_register' => 'RC-16/00-MODIFIED-999',
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.verification_status', 'pending');
        $response->assertJsonPath('data.rejection_reason', null);

        $fresh = $this->pendingCenter->fresh();
        $this->assertEquals('pending', $fresh->verification_status);
        $this->assertNull($fresh->rejection_reason);
        $this->assertNull($fresh->reviewed_by_id);
        $this->assertEquals('RC-16/00-MODIFIED-999', $fresh->commercial_register);
    }

    public function test_operational_access_allowed_only_when_verified_and_active(): void
    {
        $this->pendingCenter->update([
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'is_active'           => true,
            'quota_balance'       => 50,
        ]);

        $this->assertTrue($this->pendingCenter->fresh()->isOperational());

        // Now test suspending the center (verified + is_active = false)
        $this->pendingCenter->update(['is_active' => false]);
        $this->assertFalse($this->pendingCenter->fresh()->isOperational());
    }

    public function test_verified_booking_center_with_zero_balance_cannot_create_appointments(): void
    {
        $bookingService = app(BookingService::class);

        $clinic = Clinic::create([
            'name' => 'عيادة الأمل',
            'address' => 'وهران',
            'wilaya' => 'وهران',
            'phone' => '+213550000022',
            'is_active' => true,
        ]);

        $docUser = User::factory()->create();
        $doctorRole = Role::firstOrCreate(['name' => 'doctor'], ['display_name' => 'Doctor']);
        $docUser->roles()->attach($doctorRole->id);
        $doctor = Doctor::create([
            'user_id' => $docUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DZ-DOC-54321',
            'is_verified' => true,
        ]);
        $doctor->clinics()->attach($clinic->id, [
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now(),
        ]);

        // Center is verified & active, but quota_balance = 0
        $this->pendingCenter->update([
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'is_active' => true,
            'quota_balance' => 0,
        ]);

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('لا يمكن تنفيذ الحجز: لا توجد وحدات حجز متاحة.');

        $bookingService->createAppointment([
            'clinic_id'         => $clinic->id,
            'doctor_id'         => $doctor->id,
            'booking_center_id' => $this->pendingCenter->id,
            'appointment_date'  => now()->addDays(2)->format('Y-m-d'),
            'time_slot'         => '11:00:00',
            'patient_type'      => 'unregistered',
            'patient_name'      => 'سمير بن عيسى',
            'patient_phone'     => '+213559998877',
        ], $this->centerManagerUser);
    }

    public function test_verified_booking_center_with_positive_balance_can_create_appointments(): void
    {
        $bookingService = app(BookingService::class);

        $clinic = Clinic::create([
            'name' => 'عيادة النور',
            'address' => 'الجزائر',
            'wilaya' => 'الجزائر العاصمة',
            'phone' => '+213550000033',
            'is_active' => true,
        ]);

        $docUser = User::factory()->create();
        $doctorRole = Role::firstOrCreate(['name' => 'doctor'], ['display_name' => 'Doctor']);
        $docUser->roles()->attach($doctorRole->id);
        $doctor = Doctor::create([
            'user_id' => $docUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DZ-DOC-98765',
            'is_verified' => true,
        ]);
        $doctor->clinics()->attach($clinic->id, [
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now(),
        ]);

        // Center is verified & active with positive quota_balance = 5
        $this->pendingCenter->update([
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'is_active' => true,
            'quota_balance' => 5,
        ]);

        $appointment = $bookingService->createAppointment([
            'clinic_id'         => $clinic->id,
            'doctor_id'         => $doctor->id,
            'booking_center_id' => $this->pendingCenter->id,
            'appointment_date'  => now()->addDays(2)->format('Y-m-d'),
            'time_slot'         => '12:00:00',
            'patient_type'      => 'unregistered',
            'patient_name'      => 'سليم قدور',
            'patient_phone'     => '+213554443322',
        ], $this->centerManagerUser);

        $this->assertNotNull($appointment);
        $this->assertEquals($this->pendingCenter->id, $appointment->booking_center_id);
    }

    public function test_booking_centers_pagination_contract_and_page_isolation(): void
    {
        for ($i = 0; $i < 25; $i++) {
            $u = User::factory()->create();
            BookingCenter::create([
                'user_id' => $u->id,
                'name' => "Center {$i}",
                'license_number' => "LIC-{$i}",
                'wilaya' => 'Algiers',
                'address' => '123 Street',
                'phone' => "+213550000" . str_pad((string)$i, 2, '0', STR_PAD_LEFT),
                'verification_status' => BookingCenter::STATUS_VERIFIED,
                'is_active' => true,
            ]);
        }

        $adminToken = $this->adminUser->createToken('admin_token')->plainTextToken;

        $resPage1 = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/v1/booking-centers?page=1&per_page=10');

        $resPage1->assertStatus(200)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 10);

        $data1 = $resPage1->json('data');
        $this->assertCount(10, $data1);
        $page1Ids = array_column($data1, 'id');

        $resPage2 = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/v1/booking-centers?page=2&per_page=10');

        $resPage2->assertStatus(200)
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 10);

        $data2 = $resPage2->json('data');
        $this->assertCount(10, $data2);
        $page2Ids = array_column($data2, 'id');

        $overlap = array_intersect($page1Ids, $page2Ids);
        $this->assertEmpty($overlap, 'Page 1 and Page 2 IDs must not overlap.');
    }
}
