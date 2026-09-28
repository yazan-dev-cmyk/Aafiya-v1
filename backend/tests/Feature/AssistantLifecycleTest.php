<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\DiagnosticCenter;
use App\Models\DiagnosticStaff;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AssistantLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
    }

    /**
     * Scenario 1: Clinic Director creates a Doctor Assistant with initial password.
     */
    public function test_clinic_director_creates_doctor_assistant_with_initial_password(): void
    {
        // 1. Create Director & Clinic
        $directorUser = User::factory()->create([
            'email' => 'director@clinic.dz',
            'is_active' => true,
        ]);
        $directorUser->assignRole('doctor');

        $doctor = Doctor::create([
            'user_id' => $directorUser->id,
            'license_number' => 'DOC-DIR-001',
            'specialty' => 'Cardiology',
            'is_verified' => true,
        ]);

        $clinic = Clinic::create([
            'name' => 'Al-Amal Clinic',
            'address' => 'Didouche Mourad, Algiers',
            'wilaya' => 'Algiers',
            'phone' => '+213550112233',
            'director_doctor_id' => $doctor->id,
            'is_active' => true,
        ]);

        DoctorClinic::create([
            'doctor_id' => $doctor->id,
            'clinic_id' => $clinic->id,
            'position' => 'director',
            'is_primary' => true,
        ]);

        $directorToken = $directorUser->createToken('auth')->plainTextToken;

        // 2. Director creates Assistant with initial password
        $response = $this->withHeader('Authorization', 'Bearer ' . $directorToken)
            ->postJson("/api/v1/clinics/{$clinic->id}/assistants", [
                'name' => 'Maryam Kaddour',
                'email' => 'assistant.maryam@clinic.dz',
                'phone' => '+213550123450',
                'password' => 'InitialSecret2026!',
                'permissions_json' => ['record_vitals', 'manage_queue'],
            ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.email', 'assistant.maryam@clinic.dz');

        // Verify in Database
        $assistantUser = User::where('email', 'assistant.maryam@clinic.dz')->first();
        $this->assertNotNull($assistantUser);
        $this->assertTrue($assistantUser->is_active);
        $this->assertTrue(Hash::check('InitialSecret2026!', $assistantUser->password));
        $this->assertNotEquals('InitialSecret2026!', $assistantUser->password); // Hashed, not plain text
        $this->assertTrue($assistantUser->hasRole('doctor_assistant'));

        $clinicAssistant = ClinicAssistant::where('user_id', $assistantUser->id)->first();
        $this->assertNotNull($clinicAssistant);
        $this->assertEquals($clinic->id, $clinicAssistant->clinic_id);
        $this->assertEquals($directorUser->id, $clinicAssistant->created_by_id);
    }

    /**
     * Scenario 2: Doctor Assistant logs in with the initial password.
     */
    public function test_doctor_assistant_can_login_with_initial_password(): void
    {
        $assistantUser = User::factory()->create([
            'email' => 'assistant.login@clinic.dz',
            'password' => Hash::make('LoginSecret2026!'),
            'is_active' => true,
        ]);
        $assistantUser->assignRole('doctor_assistant');

        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'assistant.login@clinic.dz',
            'password' => 'LoginSecret2026!',
        ]);

        $loginResponse->assertStatus(200);
        $loginResponse->assertJsonStructure([
            'status',
            'data' => [
                'user' => ['id', 'name', 'email', 'roles'],
                'token',
                'token_type',
            ],
        ]);
        $this->assertNotEmpty($loginResponse->json('data.token'));
        $roles = $loginResponse->json('data.user.roles');
        $this->assertContains('doctor_assistant', $roles);
    }

    /**
     * Scenario 3: No forced password change upon first login.
     */
    public function test_no_forced_password_change_for_assistant(): void
    {
        $assistantUser = User::factory()->create([
            'email' => 'assistant.noforce@clinic.dz',
            'password' => Hash::make('NoForceSecret2026!'),
            'is_active' => true,
        ]);
        $assistantUser->assignRole('doctor_assistant');

        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'assistant.noforce@clinic.dz',
            'password' => 'NoForceSecret2026!',
        ]);

        $loginResponse->assertStatus(200);
        $token = $loginResponse->json('data.token');

        // Assistant can immediately access /api/v1/auth/me without redirect or block
        $meResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/auth/me');

        $meResponse->assertStatus(200);
        $meResponse->assertJsonPath('data.email', 'assistant.noforce@clinic.dz');
    }

    /**
     * Scenario 4: Authorization protection — Assistant cannot execute unauthorized clinical/administrative actions.
     */
    public function test_assistant_cannot_execute_unauthorized_actions(): void
    {
        $clinic = Clinic::create([
            'name' => 'General Clinic',
            'address' => 'Didouche Mourad, Algiers',
            'wilaya' => 'Algiers',
            'phone' => '+213550112233',
            'is_active' => true,
        ]);

        $patUser = User::factory()->create();
        $patient = Patient::create([
            'user_id' => $patUser->id,
            'mrn' => 'MRN-2026-999999',
            'first_name' => 'Ahmed',
            'last_name' => 'Ali',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
            'phone' => '+213550000000',
        ]);

        $assistantUser = User::factory()->create([
            'email' => 'assistant.restricted@clinic.dz',
            'password' => Hash::make('RestrictedSecret2026!'),
            'is_active' => true,
        ]);
        $assistantUser->assignRole('doctor_assistant');

        ClinicAssistant::create([
            'user_id' => $assistantUser->id,
            'clinic_id' => $clinic->id,
            'permissions_json' => ['record_vitals', 'manage_queue'],
            'is_active' => true,
        ]);

        $token = $assistantUser->createToken('auth')->plainTextToken;

        // 1. Assistant cannot write prescription (403/422 Forbidden)
        $rxResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/prescriptions', [
                'patient_id' => $patient->id,
                'clinic_id' => $clinic->id,
                'items' => [
                    [
                        'medication_name' => 'Paracetamol 500mg',
                        'dosage' => '1 tab',
                        'frequency' => '3x daily',
                        'duration' => '5 days',
                    ],
                ],
            ]);
        $this->assertContains($rxResponse->status(), [403, 422]);
        $rxResponse->assertJsonValidationErrors('doctor');

        // 2. Assistant cannot update clinic settings (403 Forbidden)
        $clinicUpdateResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/v1/clinics/{$clinic->id}", [
                'name' => 'Hacked Name',
            ]);
        $this->assertEquals(403, $clinicUpdateResponse->status());
    }

    /**
     * Scenario 5A: Diagnostic Staff (Lab / Rad) creation and login.
     */
    public function test_diagnostic_manager_creates_diagnostic_staff_with_initial_password(): void
    {
        $diagManager = User::factory()->create([
            'email' => 'lab.mgr@diag.dz',
            'is_active' => true,
        ]);
        $diagManager->assignRole('lab');

        $labCenter = DiagnosticCenter::create([
            'user_id' => $diagManager->id,
            'name' => 'Central Lab',
            'address' => 'Didouche Mourad, Algiers',
            'wilaya' => 'Algiers',
            'phone' => '+213550334455',
            'type' => 'laboratory',
            'license_number' => 'LAB-001',
            'is_active' => true,
        ]);

        $diagToken = $diagManager->createToken('auth')->plainTextToken;

        // Lab Manager adds Lab Assistant with initial password
        $labStaffResponse = $this->withHeader('Authorization', 'Bearer ' . $diagToken)
            ->postJson("/api/v1/diagnostic-centers/{$labCenter->id}/staff", [
                'name' => 'Samir Othmani',
                'email' => 'samir.lab@diag.dz',
                'phone' => '+213550999888',
                'password' => 'LabTechSecret2026!',
                'role_type' => 'technician',
            ]);

        $labStaffResponse->assertStatus(201);
        $labUser = User::where('email', 'samir.lab@diag.dz')->first();
        $this->assertNotNull($labUser);
        $this->assertTrue(Hash::check('LabTechSecret2026!', $labUser->password));
        $this->assertTrue($labUser->hasRole('lab_assistant'));

        // Lab Assistant logs in
        $labLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'samir.lab@diag.dz',
            'password' => 'LabTechSecret2026!',
        ]);
        $labLogin->assertStatus(200);
    }

    /**
     * Scenario 5B: Non-admin is blocked from creating admin assistants.
     */
    public function test_non_admin_cannot_create_admin_assistant(): void
    {
        $userNonAdmin = User::factory()->create([
            'email' => 'regular@user.dz',
            'is_active' => true,
        ]);
        $userNonAdmin->assignRole('patient_registered');
        $nonAdminToken = $userNonAdmin->createToken('auth')->plainTextToken;

        $unauthResponse = $this->withHeader('Authorization', 'Bearer ' . $nonAdminToken)
            ->postJson('/api/v1/admin/assistants', [
                'name' => 'Hacker Assistant',
                'email' => 'hacker@test.dz',
                'phone' => '+213550000099',
                'password' => 'Password123!',
            ]);
        $unauthResponse->assertStatus(403);
    }

    /**
     * Scenario 5C: Platform Admin creates Admin Assistant with initial password.
     */
    public function test_admin_creates_admin_assistant_with_initial_password(): void
    {
        $adminUser = User::factory()->create([
            'email' => 'superadmin@aafiya.dz',
            'is_active' => true,
        ]);
        $adminUser->assignRole('admin');
        $adminToken = $adminUser->createToken('auth')->plainTextToken;

        // Super Admin creates Admin Assistant with initial password
        $adminResponse = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->postJson('/api/v1/admin/assistants', [
                'name' => 'Sara Belhadj',
                'email' => 'sara.adminast@aafiya.dz',
                'phone' => '+213550111222',
                'password' => 'AdminAstSecret2026!',
            ]);

        $adminResponse->assertStatus(201);
        $adminAstUser = User::where('email', 'sara.adminast@aafiya.dz')->first();
        $this->assertNotNull($adminAstUser);
        $this->assertTrue(Hash::check('AdminAstSecret2026!', $adminAstUser->password));
        $this->assertTrue($adminAstUser->hasRole('admin_assistant'));

        // Admin Assistant logs in
        $adminAstLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'sara.adminast@aafiya.dz',
            'password' => 'AdminAstSecret2026!',
        ]);
        $adminAstLogin->assertStatus(200);
    }

    /**
     * Scenario 5D: Admin can fetch persisted admin assistants list (Refresh Simulation).
     */
    public function test_admin_can_fetch_persisted_admin_assistants_list(): void
    {
        $adminUser = User::factory()->create([
            'email' => 'superadmin2@aafiya.dz',
            'is_active' => true,
        ]);
        $adminUser->assignRole('admin');
        $adminToken = $adminUser->createToken('auth')->plainTextToken;

        // Create 2 assistants
        $ast1 = User::factory()->create(['email' => 'ast1@aafiya.dz', 'is_active' => true]);
        $ast1->assignRole('admin_assistant');

        $ast2 = User::factory()->create(['email' => 'ast2@aafiya.dz', 'is_active' => true]);
        $ast2->assignRole('admin_assistant');

        // Fetch via GET /api/v1/admin/assistants
        $listResponse = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->getJson('/api/v1/admin/assistants');

        $listResponse->assertStatus(200);
        $listResponse->assertJsonStructure([
            'status',
            'data' => [
                '*' => ['id', 'name', 'email', 'phone', 'is_active', 'roles', 'created_at'],
            ],
        ]);

        $emails = collect($listResponse->json('data'))->pluck('email')->toArray();
        $this->assertContains('ast1@aafiya.dz', $emails);
        $this->assertContains('ast2@aafiya.dz', $emails);
    }

    /**
     * Scenario 5E: Admin can toggle status and delete admin assistant.
     */
    public function test_admin_can_toggle_status_and_delete_admin_assistant(): void
    {
        $adminUser = User::factory()->create([
            'email' => 'superadmin3@aafiya.dz',
            'is_active' => true,
        ]);
        $adminUser->assignRole('admin');
        $adminToken = $adminUser->createToken('auth')->plainTextToken;

        $ast = User::factory()->create(['email' => 'ast.toggle@aafiya.dz', 'is_active' => true]);
        $ast->assignRole('admin_assistant');

        // Toggle Status -> suspended (false)
        $toggleResponse = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->putJson("/api/v1/admin/assistants/{$ast->id}/status");

        $toggleResponse->assertStatus(200);
        $this->assertFalse($ast->fresh()->is_active);

        // Delete Assistant
        $deleteResponse = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->deleteJson("/api/v1/admin/assistants/{$ast->id}");

        $deleteResponse->assertStatus(200);
        $this->assertNull(User::find($ast->id));
    }
}
