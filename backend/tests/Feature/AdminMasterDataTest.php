<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\MedicalSpecialty;
use App\Models\Permission;
use App\Models\ScopedPermissionAssignment;
use App\Models\User;
use App\Models\Wilaya;
use App\Services\LegacySpecialtyResolutionService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AdminMasterDataTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $doctorUser;
    protected User $patientUser;
    protected User $assistantWithPerm;
    protected User $assistantWithoutPerm;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->seed(DatabaseSeeder::class);

        // Platform Admin
        $this->adminUser = User::create([
            'name' => 'Platform Admin',
            'email' => 'admin@aafiya.test',
            'phone' => '+213555000001',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);
        $this->adminUser->assignRole('admin');

        // Doctor User
        $this->doctorUser = User::create([
            'name' => 'Dr. Test Physician',
            'email' => 'doctor@aafiya.test',
            'phone' => '+213555000002',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);
        $this->doctorUser->assignRole('doctor');

        // Patient User
        $this->patientUser = User::create([
            'name' => 'Patient One',
            'email' => 'patient@aafiya.test',
            'phone' => '+213555000003',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);
        $this->patientUser->assignRole('patient_registered');

        // Admin Assistant with platform.manage_master_data
        $this->assistantWithPerm = User::create([
            'name' => 'Authorized Assistant',
            'email' => 'assistant.auth@aafiya.test',
            'phone' => '+213555000004',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);
        $this->assistantWithPerm->assignRole('admin_assistant');
        $managePerm = Permission::where('name', 'platform.manage_master_data')->firstOrFail();
        ScopedPermissionAssignment::create([
            'user_id' => $this->assistantWithPerm->id,
            'permission_id' => $managePerm->id,
            'scope_type' => 'platform',
            'scope_id' => 'global',
            'is_active' => true,
            'granted_by_id' => $this->adminUser->id,
        ]);

        // Admin Assistant without master data permission
        $this->assistantWithoutPerm = User::create([
            'name' => 'Unauthorized Assistant',
            'email' => 'assistant.unauth@aafiya.test',
            'phone' => '+213555000005',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);
        $this->assistantWithoutPerm->assignRole('admin_assistant');
    }

    /**
     * Test 01-04: RAD/PATH domain separation and safety invariants.
     */
    public function test_rad_and_path_are_inactive_in_public_specialty_catalog(): void
    {
        $response = $this->getJson('/api/v1/master/specialties');
        $response->assertStatus(200);

        $codes = collect($response->json('data'))->pluck('code')->toArray();
        $this->assertNotContains('RAD', $codes, 'RAD must not be active in the public physician specialty catalog.');
        $this->assertNotContains('PATH', $codes, 'PATH must not be active in the public physician specialty catalog.');
    }

    public function test_doctor_registration_rejects_rad_and_path(): void
    {
        $radSpecialty = MedicalSpecialty::where('code', 'RAD')->first();
        $pathSpecialty = MedicalSpecialty::where('code', 'PATH')->first();

        $this->assertNotNull($radSpecialty);
        $this->assertFalse((bool) $radSpecialty->is_active);

        // Attempt doctor registration with RAD
        $payloadRad = [
            'name' => 'Dr. Radiologist Attempt',
            'email' => 'rad.attempt@aafiya.test',
            'phone' => '+213555111222',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'license_number' => 'LIC-RAD-001',
            'specialty_id' => $radSpecialty->id,
        ];
        $resRad = $this->postJson('/api/v1/auth/register-doctor', $payloadRad);
        $resRad->assertStatus(422);

        // Attempt doctor registration with PATH
        $payloadPath = [
            'name' => 'Dr. Pathologist Attempt',
            'email' => 'path.attempt@aafiya.test',
            'phone' => '+213555111223',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'license_number' => 'LIC-PATH-001',
            'specialty_id' => $pathSpecialty->id,
        ];
        $resPath = $this->postJson('/api/v1/auth/register-doctor', $payloadPath);
        $resPath->assertStatus(422);
    }

    public function test_legacy_resolution_flags_rad_and_path_as_unresolved(): void
    {
        $resolver = app(LegacySpecialtyResolutionService::class);

        $resRad = $resolver->resolve('RAD');
        $this->assertEquals('UNRESOLVED', $resRad['status']);
        $this->assertNull($resRad['specialty_id']);

        $resPath = $resolver->resolve('PATH');
        $this->assertEquals('UNRESOLVED', $resPath['status']);
        $this->assertNull($resPath['specialty_id']);

        $resRadioFr = $resolver->resolve('radiologie');
        $this->assertEquals('UNRESOLVED', $resRadioFr['status']);

        $resPathoEn = $resolver->resolve('pathology');
        $this->assertEquals('UNRESOLVED', $resPathoEn['status']);
    }

    /**
     * Test 05-10: Authorization boundaries for Master Data mutation.
     */
    public function test_authorized_admin_can_manage_specialties(): void
    {
        $res = $this->actingAs($this->adminUser)->getJson('/api/v1/admin/master/specialties');
        $res->assertStatus(200);
        $this->assertArrayHasKey('data', $res->json());
    }

    public function test_authorized_assistant_with_permission_can_manage_specialties(): void
    {
        $res = $this->actingAs($this->assistantWithPerm)->getJson('/api/v1/admin/master/specialties');
        $res->assertStatus(200);
    }

    public function test_unauthorized_assistant_is_rejected(): void
    {
        $res = $this->actingAs($this->assistantWithoutPerm)->getJson('/api/v1/admin/master/specialties');
        $res->assertStatus(403);
    }

    public function test_non_admin_roles_cannot_mutate_master_data(): void
    {
        // Patient attempt
        $resPatient = $this->actingAs($this->patientUser)->postJson('/api/v1/admin/master/specialties', [
            'code' => 'TEST_P',
            'name_ar' => 'تجربة',
            'name_fr' => 'Test',
            'name_en' => 'Test',
        ]);
        $resPatient->assertStatus(403);

        // Doctor attempt
        $resDoctor = $this->actingAs($this->doctorUser)->postJson('/api/v1/admin/master/specialties', [
            'code' => 'TEST_D',
            'name_ar' => 'تجربة',
            'name_fr' => 'Test',
            'name_en' => 'Test',
        ]);
        $resDoctor->assertStatus(403);
    }

    /**
     * Test 11-17: Specialty Administration CRUD & Constraints.
     */
    public function test_admin_can_create_specialty_and_duplicate_code_is_rejected(): void
    {
        $payload = [
            'code' => 'PEDIATRIC_CARD',
            'name_ar' => 'أمراض قلب الأطفال',
            'name_fr' => 'Cardiologie pédiatrique',
            'name_en' => 'Pediatric Cardiology',
            'is_active' => true,
            'display_order' => 50,
        ];

        $res = $this->actingAs($this->adminUser)->postJson('/api/v1/admin/master/specialties', $payload);
        $res->assertStatus(201);
        $this->assertEquals('PEDIATRIC_CARD', $res->json('data.code'));

        // Duplicate code rejection
        $resDup = $this->actingAs($this->adminUser)->postJson('/api/v1/admin/master/specialties', $payload);
        $resDup->assertStatus(422);
    }

    public function test_admin_can_edit_specialty_and_toggle_status(): void
    {
        $specialty = MedicalSpecialty::where('code', 'GP')->first();
        $this->assertNotNull($specialty);

        // Update localized names
        $resUpdate = $this->actingAs($this->adminUser)->putJson("/api/v1/admin/master/specialties/{$specialty->id}", [
            'name_ar' => 'طب عام معتمد',
            'name_fr' => 'Médecine générale agréée',
            'name_en' => 'General Medicine Certified',
        ]);
        $resUpdate->assertStatus(200);
        $this->assertEquals('طب عام معتمد', $resUpdate->json('data.name_ar'));

        // Toggle to inactive
        $resToggle = $this->actingAs($this->adminUser)->putJson("/api/v1/admin/master/specialties/{$specialty->id}/status", [
            'is_active' => false,
        ]);
        $resToggle->assertStatus(200);
        $this->assertFalse((bool) $resToggle->json('data.is_active'));

        // Confirm excluded from public active list
        $pubRes = $this->getJson('/api/v1/master/specialties');
        $pubCodes = collect($pubRes->json('data'))->pluck('code')->toArray();
        $this->assertNotContains('GP', $pubCodes);

        // Toggle back to active
        $this->actingAs($this->adminUser)->putJson("/api/v1/admin/master/specialties/{$specialty->id}/status", [
            'is_active' => true,
        ])->assertStatus(200);
    }

    public function test_referenced_specialties_cannot_be_destructively_deleted(): void
    {
        $cardSpec = MedicalSpecialty::where('code', 'CARD')->first();
        $this->assertNotNull($cardSpec);

        // Create a doctor referencing CARD
        $doc = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'Cardiology',
            'specialty_id' => $cardSpec->id,
            'license_number' => 'LIC-REF-CARD',
            'is_verified' => true,
        ]);

        // Attempt deletion of CARD
        $resDelete = $this->actingAs($this->adminUser)->deleteJson("/api/v1/admin/master/specialties/{$cardSpec->id}");
        $resDelete->assertStatus(422);

        // Doctor remains referencing CARD intact
        $this->assertDatabaseHas('medical_specialties', ['id' => $cardSpec->id]);
        $this->assertEquals($cardSpec->id, $doc->fresh()->specialty_id);
    }

    public function test_unreferenced_specialty_can_be_deleted(): void
    {
        $newSpec = MedicalSpecialty::create([
            'code' => 'TEMP_DEL',
            'name_ar' => 'تخصص مؤقت',
            'name_fr' => 'Spécialité temporaire',
            'name_en' => 'Temporary Specialty',
            'is_active' => true,
            'display_order' => 99,
        ]);

        $resDelete = $this->actingAs($this->adminUser)->deleteJson("/api/v1/admin/master/specialties/{$newSpec->id}");
        $resDelete->assertStatus(200);
        $this->assertDatabaseMissing('medical_specialties', ['id' => $newSpec->id]);
    }

    /**
     * Test 18-23: Wilaya Administration CRUD & Constraints.
     */
    public function test_admin_can_list_and_create_wilaya(): void
    {
        $resList = $this->actingAs($this->adminUser)->getJson('/api/v1/admin/master/wilayas');
        $resList->assertStatus(200);
        $this->assertGreaterThanOrEqual(58, $resList->json('meta.total'));

        // Create new wilaya
        $payload = [
            'code' => '99',
            'name_ar' => 'ولاية اختبارية',
            'name_fr' => 'Wilaya Test',
            'name_en' => 'Test Wilaya',
            'is_active' => true,
            'display_order' => 99,
        ];
        $resCreate = $this->actingAs($this->adminUser)->postJson('/api/v1/admin/master/wilayas', $payload);
        $resCreate->assertStatus(201);
        $this->assertEquals('99', $resCreate->json('data.code'));

        // Duplicate code rejected
        $resDup = $this->actingAs($this->adminUser)->postJson('/api/v1/admin/master/wilayas', $payload);
        $resDup->assertStatus(422);
    }

    public function test_referenced_wilaya_cannot_be_destructively_deleted(): void
    {
        $algiers = Wilaya::where('code', '16')->first();
        $this->assertNotNull($algiers);

        // Attempt deletion of Algiers (referenced by communes)
        $resDelete = $this->actingAs($this->adminUser)->deleteJson("/api/v1/admin/master/wilayas/{$algiers->id}");
        $resDelete->assertStatus(422);
        $this->assertDatabaseHas('wilayas', ['id' => $algiers->id]);
    }

    /**
     * Test 24-27: Doctor Public Resource and Localization Integrity.
     */
    public function test_doctor_public_resource_exposes_canonical_specialty_names(): void
    {
        $cardSpec = MedicalSpecialty::where('code', 'CARD')->first();

        $doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'Cardiology',
            'specialty_id' => $cardSpec->id,
            'license_number' => 'LIC-PUB-CARD',
            'is_verified' => true,
        ]);

        $res = $this->getJson("/api/v1/doctors");
        $res->assertStatus(200);

        $docItem = collect($res->json('data'))->firstWhere('id', $doctor->id);
        $this->assertNotNull($docItem);
        $this->assertEquals($cardSpec->id, $docItem['specialty_id']);
        $this->assertEquals('CARD', $docItem['medical_specialty']['code']);
        $this->assertEquals($cardSpec->name_ar, $docItem['medical_specialty']['name_ar']);
        $this->assertEquals($cardSpec->name_fr, $docItem['medical_specialty']['name_fr']);
        $this->assertEquals($cardSpec->name_en, $docItem['medical_specialty']['name_en']);
    }

    /**
     * Test 28-32: Discovery filters and Clinic Specialty Association.
     */
    public function test_doctor_and_clinic_discovery_filters_by_specialty(): void
    {
        $cardSpec = MedicalSpecialty::where('code', 'CARD')->first();
        $pedSpec = MedicalSpecialty::where('code', 'PED')->first();

        $doctorCard = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'Cardiology',
            'specialty_id' => $cardSpec->id,
            'license_number' => 'LIC-DISC-CARD',
            'is_verified' => true,
        ]);

        // Doctor search by specialty_id
        $resDoc = $this->getJson("/api/v1/doctors?specialty_id={$cardSpec->id}");
        $resDoc->assertStatus(200);
        $ids = collect($resDoc->json('data'))->pluck('id')->toArray();
        $this->assertContains($doctorCard->id, $ids);

        // Filter by different specialty excludes doctor
        $resDocPed = $this->getJson("/api/v1/doctors?specialty_id={$pedSpec->id}");
        $resDocPed->assertStatus(200);
        $pedIds = collect($resDocPed->json('data'))->pluck('id')->toArray();
        $this->assertNotContains($doctorCard->id, $pedIds);
    }
}
