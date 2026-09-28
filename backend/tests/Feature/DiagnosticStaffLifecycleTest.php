<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\DiagnosticCenter;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticStaff;
use App\Models\Doctor;
use App\Models\LaboratorySample;
use App\Models\Patient;
use App\Models\ScopedPermissionAssignment;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DiagnosticStaffLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    /**
     * Helper to create a diagnostic center with its director.
     */
    protected function createDiagnosticCenterWithDirector(string $type = 'laboratory', string $emailPrefix = 'center_dir'): array
    {
        $role = ($type === 'radiology') ? 'radiology' : 'lab';

        $directorUser = User::factory()->create([
            'email' => "{$emailPrefix}@center.dz",
            'is_active' => true,
        ]);
        $directorUser->assignRole($role);

        $center = DiagnosticCenter::create([
            'user_id' => $directorUser->id,
            'name' => "Center {$emailPrefix}",
            'type' => $type,
            'license_number' => "LIC-{$emailPrefix}-" . uniqid(),
            'phone' => '+213550112233',
            'wilaya' => 'Algiers',
            'address' => 'Diagnostic Street 123',
            'is_active' => true,
        ]);

        return [$center, $directorUser];
    }

    /**
     * Helper to create a patient.
     */
    protected function createPatient(string $prefix = 'p'): Patient
    {
        $patientUser = User::factory()->create(['email' => "{$prefix}_" . uniqid() . "@patient.dz"]);
        $patientUser->assignRole('patient_registered');

        return Patient::create([
            'user_id' => $patientUser->id,
            'mrn' => 'MRN-' . strtoupper($prefix) . '-' . uniqid(),
            'first_name' => 'Patient',
            'last_name' => $prefix,
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
            'phone' => '+213555998877',
        ]);
    }

    /**
     * Helper to create a doctor.
     */
    protected function createDoctor(string $prefix = 'doc'): Doctor
    {
        $docUser = User::factory()->create(['email' => "{$prefix}_" . uniqid() . "@doctor.dz"]);
        $docUser->assignRole('doctor');

        return Doctor::create([
            'user_id' => $docUser->id,
            'license_number' => 'LIC-' . strtoupper($prefix) . '-' . uniqid(),
            'specialty' => 'General Medicine',
            'is_verified' => true,
        ]);
    }

    /**
     * Helper to create a clinic and doctor.
     */
    protected function createClinicAndDoctor(string $prefix = 'c'): array
    {
        $docUser = User::factory()->create(['email' => "{$prefix}_doc_" . uniqid() . "@doctor.dz"]);
        $docUser->assignRole('doctor');

        $doctor = Doctor::create([
            'user_id' => $docUser->id,
            'license_number' => 'LIC-' . strtoupper($prefix) . '-' . uniqid(),
            'specialty' => 'General Medicine',
            'is_verified' => true,
        ]);

        $clinic = Clinic::create([
            'name' => "Clinic {$prefix}",
            'address' => 'Street 123',
            'wilaya' => 'Algiers',
            'phone' => '+213550112233',
            'director_doctor_id' => $doctor->id,
            'is_active' => true,
        ]);

        return [$clinic, $doctor];
    }

    /**
     * Helper to create a diagnostic order.
     */
    protected function createDiagnosticOrder(DiagnosticCenter $center, string $prefix = 'ord'): array
    {
        $patient = $this->createPatient($prefix);
        [$clinic, $doctor] = $this->createClinicAndDoctor($prefix);

        $order = DiagnosticOrder::create([
            'order_reference' => 'ORD-' . strtoupper($prefix) . '-' . uniqid(),
            'patient_id' => $patient->id,
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'diagnostic_center_id' => $center->id,
            'order_type' => $center->type,
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        return [$order, $patient, $clinic, $doctor];
    }

    /**
     * 01. Manager can create laboratory employee with delegated permissions.
     */
    public function test_01_manager_can_create_lab_staff_with_delegated_permissions(): void
    {
        [$center, $director] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_mgr');

        $response = $this->actingAs($director, 'sanctum')->postJson("/api/v1/diagnostic-centers/{$center->id}/staff", [
            'name' => 'Amine Tech',
            'email' => 'amine.tech@lab.dz',
            'phone' => '+213550000001',
            'password' => 'Password123!',
            'role_type' => 'technician',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.role_type', 'technician');
        $response->assertJsonPath('data.is_active', true);

        $staffUser = User::where('email', 'amine.tech@lab.dz')->first();
        $this->assertNotNull($staffUser);
        $this->assertTrue($staffUser->hasRole('lab_assistant'));

        $staff = DiagnosticStaff::where('user_id', $staffUser->id)->first();
        $this->assertNotNull($staff);
        $this->assertEquals($center->id, $staff->diagnostic_center_id);
        $this->assertContains('lab.manage_orders', $staff->getDelegatedPermissions());
        $this->assertContains('lab.enter_results', $staff->getDelegatedPermissions());
    }

    /**
     * 02. Manager can create radiology employee with delegated permissions.
     */
    public function test_02_manager_can_create_radiology_staff_with_delegated_permissions(): void
    {
        [$center, $director] = $this->createDiagnosticCenterWithDirector('radiology', 'rad_mgr');

        $response = $this->actingAs($director, 'sanctum')->postJson("/api/v1/diagnostic-centers/{$center->id}/staff", [
            'name' => 'Karim RadTech',
            'email' => 'karim.rad@center.dz',
            'phone' => '+213550000002',
            'password' => 'Password123!',
            'role_type' => 'technician',
        ]);

        $response->assertStatus(201);

        $staffUser = User::where('email', 'karim.rad@center.dz')->first();
        $this->assertNotNull($staffUser);
        $this->assertTrue($staffUser->hasRole('rad_assistant'));

        $staff = DiagnosticStaff::where('user_id', $staffUser->id)->first();
        $this->assertNotNull($staff);
        $this->assertEquals($center->id, $staff->diagnostic_center_id);
        $this->assertContains('radiology.manage_orders', $staff->getDelegatedPermissions());
        $this->assertContains('radiology.upload_images', $staff->getDelegatedPermissions());
    }

    /**
     * 03. Database enforces one diagnostic institution per user via unique(user_id).
     */
    public function test_03_database_enforces_one_diagnostic_institution_per_user(): void
    {
        [$centerA, $directorA] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_a');
        [$centerB, $directorB] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_b');

        $user = User::factory()->create([
            'email' => 'shared.tech@lab.dz',
            'is_active' => true,
        ]);
        $user->assignRole('lab_assistant');

        // First affiliation succeeds
        DiagnosticStaff::create([
            'diagnostic_center_id' => $centerA->id,
            'user_id' => $user->id,
            'role_type' => 'technician',
            'created_by_id' => $directorA->id,
            'is_active' => true,
        ]);

        // Second affiliation MUST fail at the database level due to unique('user_id')
        $this->expectException(\Illuminate\Database\QueryException::class);
        DiagnosticStaff::create([
            'diagnostic_center_id' => $centerB->id,
            'user_id' => $user->id,
            'role_type' => 'technician',
            'created_by_id' => $directorB->id,
            'is_active' => true,
        ]);
    }

    /**
     * 04. Application rejects second diagnostic affiliation.
     */
    public function test_04_application_rejects_second_diagnostic_affiliation(): void
    {
        [$centerA, $directorA] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_a4');
        [$centerB, $directorB] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_b4');

        // Create staff in Center A
        $createRes = $this->actingAs($directorA, 'sanctum')->postJson("/api/v1/diagnostic-centers/{$centerA->id}/staff", [
            'name' => 'Single Affiliation Tech',
            'email' => 'single.tech@lab.dz',
            'phone' => '+213550000004',
            'password' => 'Password123!',
            'role_type' => 'technician',
        ]);
        $createRes->assertStatus(201);

        // Director B attempts to create staff with the same email
        $secondRes = $this->actingAs($directorB, 'sanctum')->postJson("/api/v1/diagnostic-centers/{$centerB->id}/staff", [
            'name' => 'Single Affiliation Tech',
            'email' => 'single.tech@lab.dz',
            'phone' => '+213550000004',
            'password' => 'Password123!',
            'role_type' => 'technician',
        ]);

        $secondRes->assertStatus(422);
        $secondRes->assertJsonValidationErrors('email');
    }

    /**
     * 05. Manager can view unified staff detail.
     */
    public function test_05_manager_can_view_staff_detail(): void
    {
        [$center, $director] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_detail');

        $staffUser = User::factory()->create(['email' => 'detail.tech@lab.dz']);
        $staffUser->assignRole('lab_assistant');

        $staff = DiagnosticStaff::create([
            'diagnostic_center_id' => $center->id,
            'user_id' => $staffUser->id,
            'role_type' => 'technician',
            'created_by_id' => $director->id,
            'permissions_json' => ['lab.manage_orders'],
            'is_active' => true,
        ]);

        $response = $this->actingAs($director, 'sanctum')
            ->getJson("/api/v1/diagnostic-centers/{$center->id}/staff/{$staff->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('data.id', $staff->id);
        $response->assertJsonPath('data.email', 'detail.tech@lab.dz');
        $response->assertJsonPath('data.delegated_permissions', ['lab.manage_orders']);
    }

    /**
     * 06. Manager can update delegated permissions.
     */
    public function test_06_manager_can_update_delegated_permissions(): void
    {
        [$center, $director] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_perm');

        $staffUser = User::factory()->create(['email' => 'perm.tech@lab.dz']);
        $staffUser->assignRole('lab_assistant');

        $staff = DiagnosticStaff::create([
            'diagnostic_center_id' => $center->id,
            'user_id' => $staffUser->id,
            'role_type' => 'technician',
            'created_by_id' => $director->id,
            'permissions_json' => ['lab.manage_orders'],
            'is_active' => true,
        ]);

        $response = $this->actingAs($director, 'sanctum')
            ->putJson("/api/v1/diagnostic-centers/{$center->id}/staff/{$staff->id}/permissions", [
                'permissions' => ['lab.manage_orders', 'lab.enter_results'],
            ]);

        $response->assertStatus(200);
        $staff->refresh();
        $this->assertEquals(['lab.manage_orders', 'lab.enter_results'], $staff->permissions_json);
    }

    /**
     * 07. Permission revocation works immediately.
     */
    public function test_07_permission_revocation_works(): void
    {
        [$center, $director] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_revoke');

        $staffUser = User::factory()->create(['email' => 'revoke.tech@lab.dz']);
        $staffUser->assignRole('lab_assistant');

        $staff = DiagnosticStaff::create([
            'diagnostic_center_id' => $center->id,
            'user_id' => $staffUser->id,
            'role_type' => 'technician',
            'created_by_id' => $director->id,
            'permissions_json' => ['lab.manage_orders', 'lab.enter_results'],
            'is_active' => true,
        ]);

        // Revoke lab.enter_results
        $response = $this->actingAs($director, 'sanctum')
            ->putJson("/api/v1/diagnostic-centers/{$center->id}/staff/{$staff->id}/permissions", [
                'permissions' => ['lab.manage_orders'],
            ]);

        $response->assertStatus(200);
        $staff->refresh();
        $this->assertEquals(['lab.manage_orders'], $staff->permissions_json);
        $this->assertFalse(in_array('lab.enter_results', $staff->permissions_json, true));
    }

    /**
     * 08. Lab finalize permission cannot be delegated (Hard Ceiling).
     */
    public function test_08_lab_finalize_permission_cannot_be_delegated(): void
    {
        [$center, $director] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_ceil');

        $staffUser = User::factory()->create(['email' => 'ceil.tech@lab.dz']);
        $staffUser->assignRole('lab_assistant');

        $staff = DiagnosticStaff::create([
            'diagnostic_center_id' => $center->id,
            'user_id' => $staffUser->id,
            'role_type' => 'technician',
            'created_by_id' => $director->id,
            'is_active' => true,
        ]);

        // Director tries to delegate lab.finalize_results
        $response = $this->actingAs($director, 'sanctum')
            ->putJson("/api/v1/diagnostic-centers/{$center->id}/staff/{$staff->id}/permissions", [
                'permissions' => ['lab.manage_orders', 'lab.finalize_results'],
            ]);

        $response->assertStatus(200);
        $staff->refresh();
        // lab.finalize_results must be stripped by sanitizeDelegatedPermissions
        $this->assertNotContains('lab.finalize_results', $staff->permissions_json);
        $this->assertContains('lab.manage_orders', $staff->permissions_json);
    }

    /**
     * 09. Radiology finalize permission cannot be delegated (Hard Ceiling).
     */
    public function test_09_radiology_finalize_permission_cannot_be_delegated(): void
    {
        [$center, $director] = $this->createDiagnosticCenterWithDirector('radiology', 'rad_ceil');

        $staffUser = User::factory()->create(['email' => 'rad.ceil@center.dz']);
        $staffUser->assignRole('rad_assistant');

        $staff = DiagnosticStaff::create([
            'diagnostic_center_id' => $center->id,
            'user_id' => $staffUser->id,
            'role_type' => 'technician',
            'created_by_id' => $director->id,
            'is_active' => true,
        ]);

        // Director tries to delegate radiology.finalize_report
        $response = $this->actingAs($director, 'sanctum')
            ->putJson("/api/v1/diagnostic-centers/{$center->id}/staff/{$staff->id}/permissions", [
                'permissions' => ['radiology.upload_images', 'radiology.finalize_report'],
            ]);

        $response->assertStatus(200);
        $staff->refresh();
        // radiology.finalize_report must be stripped by sanitizeDelegatedPermissions
        $this->assertNotContains('radiology.finalize_report', $staff->permissions_json);
        $this->assertContains('radiology.upload_images', $staff->permissions_json);
    }

    /**
     * 10. Manager can suspend employee.
     */
    public function test_10_manager_can_suspend_employee(): void
    {
        [$center, $director] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_susp');

        $staffUser = User::factory()->create(['email' => 'susp.tech@lab.dz', 'is_active' => true]);
        $staffUser->assignRole('lab_assistant');

        $staff = DiagnosticStaff::create([
            'diagnostic_center_id' => $center->id,
            'user_id' => $staffUser->id,
            'role_type' => 'technician',
            'created_by_id' => $director->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($director, 'sanctum')
            ->putJson("/api/v1/diagnostic-centers/{$center->id}/staff/{$staff->id}/status", [
                'is_active' => false,
            ]);

        $response->assertStatus(200);
        $staff->refresh();
        $this->assertFalse($staff->is_active);

        // Global User account MUST remain active
        $staffUser->refresh();
        $this->assertTrue($staffUser->is_active);
    }

    /**
     * 11. Suspended employee cannot view diagnostic orders.
     */
    public function test_11_suspended_employee_cannot_view_diagnostic_orders(): void
    {
        [$center, $director] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_ord');

        $staffUser = User::factory()->create(['email' => 'ord.tech@lab.dz', 'is_active' => true]);
        $staffUser->assignRole('lab_assistant');

        $staff = DiagnosticStaff::create([
            'diagnostic_center_id' => $center->id,
            'user_id' => $staffUser->id,
            'role_type' => 'technician',
            'created_by_id' => $director->id,
            'is_active' => false, // SUSPENDED
        ]);

        $this->createDiagnosticOrder($center, 'c11');

        $response = $this->actingAs($staffUser, 'sanctum')->getJson('/api/v1/diagnostic-orders');
        $response->assertStatus(200);
        $response->assertJsonCount(0, 'data'); // Empty result returned!
    }

    /**
     * 12. Suspended employee cannot perform protected operations (sample status update).
     */
    public function test_12_suspended_employee_cannot_perform_protected_operations(): void
    {
        [$center, $director] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_ops');

        $staffUser = User::factory()->create(['email' => 'ops.tech@lab.dz', 'is_active' => true]);
        $staffUser->assignRole('lab_assistant');

        $staff = DiagnosticStaff::create([
            'diagnostic_center_id' => $center->id,
            'user_id' => $staffUser->id,
            'role_type' => 'technician',
            'created_by_id' => $director->id,
            'is_active' => false, // SUSPENDED
        ]);

        [$order] = $this->createDiagnosticOrder($center, 'c12');

        $sample = LaboratorySample::create([
            'diagnostic_order_id' => $order->id,
            'sample_barcode' => 'BC-12345678',
            'sample_type' => 'blood',
            'status' => 'collected',
            'collected_at' => now(),
            'collected_by_id' => $director->id,
        ]);

        $response = $this->actingAs($staffUser, 'sanctum')
            ->putJson("/api/v1/laboratory-samples/{$sample->id}/status", [
                'status' => 'received',
            ]);

        $response->assertStatus(403);
    }

    /**
     * 13. Manager can reactivate suspended employee.
     */
    public function test_13_manager_can_reactivate_employee(): void
    {
        [$center, $director] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_react');

        $staffUser = User::factory()->create(['email' => 'react.tech@lab.dz']);
        $staffUser->assignRole('lab_assistant');

        $staff = DiagnosticStaff::create([
            'diagnostic_center_id' => $center->id,
            'user_id' => $staffUser->id,
            'role_type' => 'technician',
            'created_by_id' => $director->id,
            'is_active' => false,
        ]);

        $response = $this->actingAs($director, 'sanctum')
            ->putJson("/api/v1/diagnostic-centers/{$center->id}/staff/{$staff->id}/status", [
                'is_active' => true,
            ]);

        $response->assertStatus(200);
        $staff->refresh();
        $this->assertTrue($staff->is_active);
    }

    /**
     * 14. Manager can soft-delete employee.
     */
    public function test_14_manager_can_soft_delete_employee(): void
    {
        [$center, $director] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_del');

        $staffUser = User::factory()->create(['email' => 'del.tech@lab.dz']);
        $staffUser->assignRole('lab_assistant');

        $staff = DiagnosticStaff::create([
            'diagnostic_center_id' => $center->id,
            'user_id' => $staffUser->id,
            'role_type' => 'technician',
            'created_by_id' => $director->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($director, 'sanctum')
            ->deleteJson("/api/v1/diagnostic-centers/{$center->id}/staff/{$staff->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('diagnostic_staff', ['id' => $staff->id]);
    }

    /**
     * 15. User account remains after employee removal.
     */
    public function test_15_user_account_remains_after_employee_removal(): void
    {
        [$center, $director] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_deluser');

        $staffUser = User::factory()->create(['email' => 'keepuser.tech@lab.dz']);
        $staffUser->assignRole('lab_assistant');

        $staff = DiagnosticStaff::create([
            'diagnostic_center_id' => $center->id,
            'user_id' => $staffUser->id,
            'role_type' => 'technician',
            'created_by_id' => $director->id,
            'is_active' => true,
        ]);

        $this->actingAs($director, 'sanctum')
            ->deleteJson("/api/v1/diagnostic-centers/{$center->id}/staff/{$staff->id}")
            ->assertStatus(200);

        // User MUST NOT be deleted
        $this->assertDatabaseHas('users', ['id' => $staffUser->id]);
    }

    /**
     * 16. Historical attribution remains intact after employee removal.
     */
    public function test_16_historical_attribution_remains_intact(): void
    {
        [$center, $director] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_hist');

        $staffUser = User::factory()->create(['email' => 'hist.tech@lab.dz']);
        $staffUser->assignRole('lab_assistant');

        $staff = DiagnosticStaff::create([
            'diagnostic_center_id' => $center->id,
            'user_id' => $staffUser->id,
            'role_type' => 'technician',
            'created_by_id' => $director->id,
            'is_active' => true,
        ]);

        [$order] = $this->createDiagnosticOrder($center, 'c16');

        $sample = LaboratorySample::create([
            'diagnostic_order_id' => $order->id,
            'sample_barcode' => 'BC-HIST123',
            'sample_type' => 'blood',
            'status' => 'collected',
            'collected_at' => now(),
            'collected_by_id' => $staffUser->id,
        ]);

        // Delete staff affiliation
        $this->actingAs($director, 'sanctum')
            ->deleteJson("/api/v1/diagnostic-centers/{$center->id}/staff/{$staff->id}")
            ->assertStatus(200);

        $sample->refresh();
        // Attribution to staffUser MUST NOT become NULL
        $this->assertEquals($staffUser->id, $sample->collected_by_id);
        $this->assertEquals('hist.tech@lab.dz', $sample->collector->email);
    }

    /**
     * 17. Removed employee cannot access institution workspace.
     */
    public function test_17_removed_employee_cannot_access_institution(): void
    {
        [$center, $director] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_noaccess');

        $staffUser = User::factory()->create(['email' => 'noaccess.tech@lab.dz']);
        $staffUser->assignRole('lab_assistant');

        $staff = DiagnosticStaff::create([
            'diagnostic_center_id' => $center->id,
            'user_id' => $staffUser->id,
            'role_type' => 'technician',
            'created_by_id' => $director->id,
            'is_active' => true,
        ]);

        // Remove employee
        $staff->delete();

        // Removed employee cannot see orders
        $response = $this->actingAs($staffUser, 'sanctum')->getJson('/api/v1/diagnostic-orders');
        $response->assertStatus(200);
        $response->assertJsonCount(0, 'data');
    }

    /**
     * 18. Cross-center staff access returns 403.
     */
    public function test_18_cross_center_staff_access_returns_403(): void
    {
        [$centerA, $directorA] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_cross_a');
        [$centerB, $directorB] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_cross_b');

        $staffUserB = User::factory()->create(['email' => 'staffb@lab.dz']);
        $staffUserB->assignRole('lab_assistant');
        $staffB = DiagnosticStaff::create([
            'diagnostic_center_id' => $centerB->id,
            'user_id' => $staffUserB->id,
            'role_type' => 'technician',
            'created_by_id' => $directorB->id,
            'is_active' => true,
        ]);

        // Director A attempts to view staff of Center B
        $response = $this->actingAs($directorA, 'sanctum')
            ->getJson("/api/v1/diagnostic-centers/{$centerB->id}/staff/{$staffB->id}");

        $response->assertStatus(403);
    }

    /**
     * 19. Cross-domain laboratory/radiology access is denied.
     */
    public function test_19_cross_domain_laboratory_radiology_access_is_denied(): void
    {
        [$labCenter, $labDirector] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_dom');
        [$radCenter, $radDirector] = $this->createDiagnosticCenterWithDirector('radiology', 'rad_dom');

        $radStaffUser = User::factory()->create(['email' => 'radstaff@center.dz']);
        $radStaffUser->assignRole('rad_assistant');
        $radStaff = DiagnosticStaff::create([
            'diagnostic_center_id' => $radCenter->id,
            'user_id' => $radStaffUser->id,
            'role_type' => 'technician',
            'created_by_id' => $radDirector->id,
            'is_active' => true,
        ]);

        [$labOrder] = $this->createDiagnosticOrder($labCenter, 'c19');

        $sample = LaboratorySample::create([
            'diagnostic_order_id' => $labOrder->id,
            'sample_barcode' => 'BC-LABDOM1',
            'sample_type' => 'blood',
            'status' => 'collected',
            'collected_at' => now(),
            'collected_by_id' => $labDirector->id,
        ]);

        // Radiology assistant attempts to update laboratory sample status
        $response = $this->actingAs($radStaffUser, 'sanctum')
            ->putJson("/api/v1/laboratory-samples/{$sample->id}/status", [
                'status' => 'received',
            ]);

        $response->assertStatus(403);
    }

    /**
     * 20. Unauthorized user cannot list staff (Security fix).
     */
    public function test_20_unauthorized_user_cannot_list_staff(): void
    {
        [$center, $director] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_unauth');

        $randomUser = User::factory()->create(['email' => 'random@user.dz']);
        $randomUser->assignRole('patient_registered');

        $response = $this->actingAs($randomUser, 'sanctum')
            ->getJson("/api/v1/diagnostic-centers/{$center->id}/staff");

        $response->assertStatus(403);
    }

    /**
     * 21. Employee cannot manage another center's staff.
     */
    public function test_21_employee_cannot_manage_another_centers_staff(): void
    {
        [$centerA, $directorA] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_emp_a');
        [$centerB, $directorB] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_emp_b');

        $staffUserA = User::factory()->create(['email' => 'staffa@lab.dz']);
        $staffUserA->assignRole('lab_assistant');
        DiagnosticStaff::create([
            'diagnostic_center_id' => $centerA->id,
            'user_id' => $staffUserA->id,
            'role_type' => 'technician',
            'created_by_id' => $directorA->id,
            'is_active' => true,
        ]);

        // Employee A attempts to add staff to Center B
        $response = $this->actingAs($staffUserA, 'sanctum')
            ->postJson("/api/v1/diagnostic-centers/{$centerB->id}/staff", [
                'name' => 'Hacker Tech',
                'email' => 'hacker@lab.dz',
                'phone' => '+213550000099',
                'password' => 'Password123!',
                'role_type' => 'technician',
            ]);

        $response->assertStatus(403);
    }

    /**
     * 22. Employee cannot manipulate another center's laboratory sample.
     */
    public function test_22_employee_cannot_manipulate_another_centers_laboratory_sample(): void
    {
        [$centerA, $directorA] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_smp_a');
        [$centerB, $directorB] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_smp_b');

        $staffUserA = User::factory()->create(['email' => 'staff_a2@lab.dz']);
        $staffUserA->assignRole('lab_assistant');
        DiagnosticStaff::create([
            'diagnostic_center_id' => $centerA->id,
            'user_id' => $staffUserA->id,
            'role_type' => 'technician',
            'created_by_id' => $directorA->id,
            'is_active' => true,
        ]);

        [$orderB] = $this->createDiagnosticOrder($centerB, 'c22');

        $sampleB = LaboratorySample::create([
            'diagnostic_order_id' => $orderB->id,
            'sample_barcode' => 'BC-SMPB999',
            'sample_type' => 'blood',
            'status' => 'collected',
            'collected_at' => now(),
            'collected_by_id' => $directorB->id,
        ]);

        // Staff of Center A attempts to update sample belonging to Center B
        $response = $this->actingAs($staffUserA, 'sanctum')
            ->putJson("/api/v1/laboratory-samples/{$sampleB->id}/status", [
                'status' => 'received',
            ]);

        $response->assertStatus(403);
    }

    /**
     * 23. Permission scope remains diagnostic-center scoped.
     */
    public function test_23_permission_scope_remains_diagnostic_center_scoped(): void
    {
        [$centerA, $directorA] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_sc_a');
        [$centerB, $directorB] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_sc_b');

        $staffUserA = User::factory()->create(['email' => 'scoped_a@lab.dz']);
        $staffUserA->assignRole('lab_assistant');
        $staffA = DiagnosticStaff::create([
            'diagnostic_center_id' => $centerA->id,
            'user_id' => $staffUserA->id,
            'role_type' => 'technician',
            'created_by_id' => $directorA->id,
            'permissions_json' => ['lab.manage_orders'],
            'is_active' => true,
        ]);

        // Check using 4D helper hasDiagnosticCenterAccess
        $this->assertTrue($staffUserA->hasDiagnosticCenterAccess('lab.manage_orders', $centerA->id));
        $this->assertFalse($staffUserA->hasDiagnosticCenterAccess('lab.manage_orders', $centerB->id));
    }

    /**
     * 24. Duplicate creation race condition is protected by DB uniqueness.
     */
    public function test_24_duplicate_creation_race_condition_is_protected_by_db_uniqueness(): void
    {
        [$centerA, $directorA] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_rc_a');
        [$centerB, $directorB] = $this->createDiagnosticCenterWithDirector('laboratory', 'lab_rc_b');

        $user = User::factory()->create(['email' => 'race_tech@lab.dz']);
        $user->assignRole('lab_assistant');

        $results = [];

        // Simulate concurrent attempts
        try {
            DiagnosticStaff::create([
                'diagnostic_center_id' => $centerA->id,
                'user_id' => $user->id,
                'role_type' => 'technician',
                'created_by_id' => $directorA->id,
                'is_active' => true,
            ]);
            $results[] = 'SUCCESS_A';
        } catch (\Exception $e) {
            $results[] = 'FAIL_A';
        }

        try {
            DiagnosticStaff::create([
                'diagnostic_center_id' => $centerB->id,
                'user_id' => $user->id,
                'role_type' => 'technician',
                'created_by_id' => $directorB->id,
                'is_active' => true,
            ]);
            $results[] = 'SUCCESS_B';
        } catch (\Exception $e) {
            $results[] = 'FAIL_B';
        }

        $this->assertEquals(['SUCCESS_A', 'FAIL_B'], $results);
        $this->assertEquals(1, DiagnosticStaff::where('user_id', $user->id)->count());
    }
}
