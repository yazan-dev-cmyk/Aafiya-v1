<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\ClinicalVisit;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\ScopedPermissionAssignment;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClinicStaffLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    /**
     * Helper to create a complete Clinic with a Doctor Director.
     */
    protected function createClinicWithDirector(string $emailPrefix = 'dir'): array
    {
        $directorUser = User::factory()->create([
            'email' => "{$emailPrefix}@clinic.dz",
            'is_active' => true,
        ]);
        $directorUser->assignRole('doctor');

        $directorDoctor = Doctor::create([
            'user_id' => $directorUser->id,
            'license_number' => "LIC-DIR-{$emailPrefix}",
            'specialty' => 'General Medicine',
            'is_verified' => true,
        ]);

        $clinic = Clinic::create([
            'name' => "Clinic {$emailPrefix}",
            'address' => 'Street 123',
            'wilaya' => 'Algiers',
            'phone' => '+213550112233',
            'director_doctor_id' => $directorDoctor->id,
            'is_active' => true,
        ]);

        DoctorClinic::create([
            'doctor_id' => $directorDoctor->id,
            'clinic_id' => $clinic->id,
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
        ]);

        $token = $directorUser->createToken('dir_token')->plainTextToken;

        return [$directorUser, $directorDoctor, $clinic, $token];
    }

    /**
     * Helper to attach an Employed Doctor to a Clinic.
     */
    protected function attachEmployedDoctor(Clinic $clinic, string $emailPrefix = 'emp'): array
    {
        $employedUser = User::factory()->create([
            'email' => "{$emailPrefix}@clinic.dz",
            'is_active' => true,
        ]);
        $employedUser->assignRole('doctor');

        $employedDoctor = Doctor::create([
            'user_id' => $employedUser->id,
            'license_number' => "LIC-EMP-{$emailPrefix}",
            'specialty' => 'Pediatrics',
            'is_verified' => true,
        ]);

        $pivot = DoctorClinic::create([
            'doctor_id' => $employedDoctor->id,
            'clinic_id' => $clinic->id,
            'position' => 'doctor',
            'is_primary' => false,
            'is_active' => true,
        ]);

        $token = $employedUser->createToken('emp_token')->plainTextToken;

        return [$employedUser, $employedDoctor, $pivot, $token];
    }

    /**
     * Helper to create an Assistant in a Clinic.
     */
    protected function createAssistant(Clinic $clinic, User $directorUser, string $emailPrefix = 'ast'): array
    {
        $assistantUser = User::factory()->create([
            'email' => "{$emailPrefix}@clinic.dz",
            'is_active' => true,
        ]);
        $assistantUser->assignRole('doctor_assistant');

        $assistant = ClinicAssistant::create([
            'user_id' => $assistantUser->id,
            'clinic_id' => $clinic->id,
            'permissions_json' => ['booking.manage_queue', 'booking.confirm_attendance'],
            'created_by_id' => $directorUser->id,
            'is_active' => true,
        ]);

        $token = $assistantUser->createToken('ast_token')->plainTextToken;

        return [$assistantUser, $assistant, $token];
    }

    // =========================================================================
    // TEST GROUP A: Employed Doctor Status (Suspend / Reactivate)
    // =========================================================================

    public function test_a1_director_suspends_employed_doctor_in_own_clinic(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir1');
        [$employedUser, $employedDoctor, $pivot, $empToken] = $this->attachEmployedDoctor($clinic, 'emp1');

        $response = $this->withHeader('Authorization', "Bearer {$dirToken}")
            ->putJson("/api/v1/clinics/{$clinic->id}/doctors/{$employedDoctor->id}/status", [
                'is_active' => false,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('doctor_clinic', [
            'doctor_id' => $employedDoctor->id,
            'clinic_id' => $clinic->id,
            'is_active' => false,
        ]);

        // Global user must remain active
        $this->assertTrue($employedUser->fresh()->is_active);

        // Employed doctor can no longer perform clinic actions in this clinic
        $this->assertFalse($employedUser->fresh()->hasClinicAccess('booking.create', $clinic->id));
    }

    public function test_a2_director_reactivates_employed_doctor(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir2');
        [$employedUser, $employedDoctor, $pivot, $empToken] = $this->attachEmployedDoctor($clinic, 'emp2');

        // First suspend
        $pivot->update(['is_active' => false]);

        $response = $this->withHeader('Authorization', "Bearer {$dirToken}")
            ->putJson("/api/v1/clinics/{$clinic->id}/doctors/{$employedDoctor->id}/status", [
                'is_active' => true,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('doctor_clinic', [
            'doctor_id' => $employedDoctor->id,
            'clinic_id' => $clinic->id,
            'is_active' => true,
        ]);

        // Operational clinic access is restored
        $this->assertTrue($employedUser->fresh()->hasClinicAccess('booking.create', $clinic->id));
    }

    public function test_a3_employed_doctor_cannot_suspend_another_doctor(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir3');
        [$emp1User, $emp1Doctor, $pivot1, $emp1Token] = $this->attachEmployedDoctor($clinic, 'emp3a');
        [$emp2User, $emp2Doctor, $pivot2, $emp2Token] = $this->attachEmployedDoctor($clinic, 'emp3b');

        $response = $this->withHeader('Authorization', "Bearer {$emp1Token}")
            ->putJson("/api/v1/clinics/{$clinic->id}/doctors/{$emp2Doctor->id}/status", [
                'is_active' => false,
            ]);

        $response->assertStatus(403);
        $this->assertTrue($pivot2->fresh()->is_active);
    }

    public function test_a4_assistant_cannot_suspend_doctor(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir4');
        [$employedUser, $employedDoctor, $pivot, $empToken] = $this->attachEmployedDoctor($clinic, 'emp4');
        [$astUser, $assistant, $astToken] = $this->createAssistant($clinic, $directorUser, 'ast4');

        $response = $this->withHeader('Authorization', "Bearer {$astToken}")
            ->putJson("/api/v1/clinics/{$clinic->id}/doctors/{$employedDoctor->id}/status", [
                'is_active' => false,
            ]);

        $response->assertStatus(403);
        $this->assertTrue($pivot->fresh()->is_active);
    }

    public function test_a5_cross_clinic_director_cannot_suspend_doctor(): void
    {
        [$dirAUser, $dirADoctor, $clinicA, $dirAToken] = $this->createClinicWithDirector('dir5a');
        [$dirBUser, $dirBDoctor, $clinicB, $dirBToken] = $this->createClinicWithDirector('dir5b');
        [$employedUser, $employedDoctor, $pivotB, $empBToken] = $this->attachEmployedDoctor($clinicB, 'emp5b');

        // Director of Clinic A tries to suspend doctor in Clinic B
        $response = $this->withHeader('Authorization', "Bearer {$dirAToken}")
            ->putJson("/api/v1/clinics/{$clinicB->id}/doctors/{$employedDoctor->id}/status", [
                'is_active' => false,
            ]);

        $response->assertStatus(403);
        $this->assertTrue($pivotB->fresh()->is_active);
    }

    public function test_director_cannot_suspend_themselves(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir_self');

        $response = $this->withHeader('Authorization', "Bearer {$dirToken}")
            ->putJson("/api/v1/clinics/{$clinic->id}/doctors/{$directorDoctor->id}/status", [
                'is_active' => false,
            ]);

        $response->assertStatus(403);
    }

    // =========================================================================
    // TEST GROUP B: Assistant Status (Suspend / Reactivate)
    // =========================================================================

    public function test_b1_director_suspends_assistant_in_own_clinic(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir_b1');
        [$astUser, $assistant, $astToken] = $this->createAssistant($clinic, $directorUser, 'ast_b1');

        $response = $this->withHeader('Authorization', "Bearer {$dirToken}")
            ->putJson("/api/v1/clinics/{$clinic->id}/assistants/{$assistant->id}/status", [
                'is_active' => false,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.is_active', false);

        $this->assertFalse($assistant->fresh()->is_active);
        $this->assertTrue($astUser->fresh()->is_active); // Global user untouched
        $this->assertFalse($astUser->fresh()->hasClinicAccess('booking.manage_queue', $clinic->id));
    }

    public function test_b2_director_reactivates_assistant(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir_b2');
        [$astUser, $assistant, $astToken] = $this->createAssistant($clinic, $directorUser, 'ast_b2');

        $assistant->update(['is_active' => false]);

        $response = $this->withHeader('Authorization', "Bearer {$dirToken}")
            ->putJson("/api/v1/clinics/{$clinic->id}/assistants/{$assistant->id}/status", [
                'is_active' => true,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.is_active', true);

        $this->assertTrue($assistant->fresh()->is_active);
        $this->assertTrue($astUser->fresh()->hasClinicAccess('booking.manage_queue', $clinic->id));
    }

    public function test_b3_employed_doctor_cannot_suspend_assistant(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir_b3');
        [$employedUser, $employedDoctor, $pivot, $empToken] = $this->attachEmployedDoctor($clinic, 'emp_b3');
        [$astUser, $assistant, $astToken] = $this->createAssistant($clinic, $directorUser, 'ast_b3');

        $response = $this->withHeader('Authorization', "Bearer {$empToken}")
            ->putJson("/api/v1/clinics/{$clinic->id}/assistants/{$assistant->id}/status", [
                'is_active' => false,
            ]);

        $response->assertStatus(403);
        $this->assertTrue($assistant->fresh()->is_active);
    }

    public function test_b4_assistant_cannot_suspend_assistant(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir_b4');
        [$ast1User, $assistant1, $ast1Token] = $this->createAssistant($clinic, $directorUser, 'ast_b4a');
        [$ast2User, $assistant2, $ast2Token] = $this->createAssistant($clinic, $directorUser, 'ast_b4b');

        $response = $this->withHeader('Authorization', "Bearer {$ast1Token}")
            ->putJson("/api/v1/clinics/{$clinic->id}/assistants/{$assistant2->id}/status", [
                'is_active' => false,
            ]);

        $response->assertStatus(403);
        $this->assertTrue($assistant2->fresh()->is_active);
    }

    public function test_b5_cross_clinic_director_cannot_suspend_assistant(): void
    {
        [$dirAUser, $dirADoctor, $clinicA, $dirAToken] = $this->createClinicWithDirector('dir_b5a');
        [$dirBUser, $dirBDoctor, $clinicB, $dirBToken] = $this->createClinicWithDirector('dir_b5b');
        [$astUser, $assistantB, $astToken] = $this->createAssistant($clinicB, $dirBUser, 'ast_b5b');

        $response = $this->withHeader('Authorization', "Bearer {$dirAToken}")
            ->putJson("/api/v1/clinics/{$clinicB->id}/assistants/{$assistantB->id}/status", [
                'is_active' => false,
            ]);

        $response->assertStatus(403);
        $this->assertTrue($assistantB->fresh()->is_active);
    }

    // =========================================================================
    // TEST GROUP C: Employed Doctor Detachment & Medical Immutability
    // =========================================================================

    public function test_c1_to_c5_director_detaches_doctor_preserving_user_and_records(): void
    {
        [$directorUser, $directorDoctor, $clinicA, $dirToken] = $this->createClinicWithDirector('dir_c');
        [$employedUser, $employedDoctor, $pivotA, $empToken] = $this->attachEmployedDoctor($clinicA, 'emp_c');

        // Also attach employed doctor to Clinic B to verify multi-clinic preservation (C5)
        [$dirBUser, $dirBDoctor, $clinicB, $dirBToken] = $this->createClinicWithDirector('dir_cb');
        $pivotB = DoctorClinic::create([
            'doctor_id' => $employedDoctor->id,
            'clinic_id' => $clinicB->id,
            'position' => 'doctor',
            'is_primary' => false,
            'is_active' => true,
        ]);

        // Create historical clinical visit and prescription for this doctor (C4)
        $patientUser = User::factory()->create();
        $patientUser->assignRole('patient_registered');
        $patient = Patient::create([
            'user_id' => $patientUser->id,
            'mrn' => 'MRN-TEST-001',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
            'phone' => '+213555998877',
        ]);

        $visit = ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-0001',
            'patient_id' => $patient->id,
            'doctor_id' => $employedDoctor->id,
            'clinic_id' => $clinicA->id,
            'visit_date' => now()->toDateString(),
            'chief_complaint' => 'Headache and fever',
            'status' => 'finalized',
        ]);

        $rx = Prescription::create([
            'prescription_reference' => 'RX-2026-0001',
            'secure_token' => 'secure-qr-token-c1',
            'patient_id' => $patient->id,
            'doctor_id' => $employedDoctor->id,
            'clinic_id' => $clinicA->id,
            'clinical_visit_id' => $visit->id,
            'issue_date' => now()->toDateString(),
            'expiry_date' => now()->addDays(30)->toDateString(),
            'status' => 'active',
        ]);

        // C1: Director detaches employed doctor from Clinic A
        $response = $this->withHeader('Authorization', "Bearer {$dirToken}")
            ->deleteJson("/api/v1/clinics/{$clinicA->id}/doctors/{$employedDoctor->id}");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');

        // Verification of C1: Detached from Clinic A
        $this->assertDatabaseMissing('doctor_clinic', [
            'doctor_id' => $employedDoctor->id,
            'clinic_id' => $clinicA->id,
        ]);

        // Verification of C2: User account still exists
        $this->assertDatabaseHas('users', ['id' => $employedUser->id]);

        // Verification of C3: Doctor domain profile still exists
        $this->assertDatabaseHas('doctors', ['id' => $employedDoctor->id]);

        // Verification of C4: Historical medical records are completely intact
        $this->assertDatabaseHas('clinical_visits', [
            'id' => $visit->id,
            'doctor_id' => $employedDoctor->id,
            'clinic_id' => $clinicA->id,
        ]);
        $this->assertDatabaseHas('prescriptions', [
            'id' => $rx->id,
            'doctor_id' => $employedDoctor->id,
            'clinic_id' => $clinicA->id,
        ]);

        // Verification of C5: Doctor remains attached and active in Clinic B
        $this->assertDatabaseHas('doctor_clinic', [
            'doctor_id' => $employedDoctor->id,
            'clinic_id' => $clinicB->id,
            'is_active' => true,
        ]);
    }

    public function test_c6_cross_clinic_director_cannot_detach_doctor(): void
    {
        [$dirAUser, $dirADoctor, $clinicA, $dirAToken] = $this->createClinicWithDirector('dir_c6a');
        [$dirBUser, $dirBDoctor, $clinicB, $dirBToken] = $this->createClinicWithDirector('dir_c6b');
        [$employedUser, $employedDoctor, $pivotB, $empBToken] = $this->attachEmployedDoctor($clinicB, 'emp_c6b');

        $response = $this->withHeader('Authorization', "Bearer {$dirAToken}")
            ->deleteJson("/api/v1/clinics/{$clinicB->id}/doctors/{$employedDoctor->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('doctor_clinic', [
            'doctor_id' => $employedDoctor->id,
            'clinic_id' => $clinicB->id,
        ]);
    }

    public function test_c7_employed_doctor_cannot_detach_another_doctor(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir_c7');
        [$emp1User, $emp1Doctor, $pivot1, $emp1Token] = $this->attachEmployedDoctor($clinic, 'emp_c7a');
        [$emp2User, $emp2Doctor, $pivot2, $emp2Token] = $this->attachEmployedDoctor($clinic, 'emp_c7b');

        $response = $this->withHeader('Authorization', "Bearer {$emp1Token}")
            ->deleteJson("/api/v1/clinics/{$clinic->id}/doctors/{$emp2Doctor->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('doctor_clinic', [
            'doctor_id' => $emp2Doctor->id,
            'clinic_id' => $clinic->id,
        ]);
    }

    public function test_director_cannot_detach_themselves(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir_c_self');

        $response = $this->withHeader('Authorization', "Bearer {$dirToken}")
            ->deleteJson("/api/v1/clinics/{$clinic->id}/doctors/{$directorDoctor->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('doctor_clinic', [
            'doctor_id' => $directorDoctor->id,
            'clinic_id' => $clinic->id,
            'position' => 'director',
        ]);
    }

    // =========================================================================
    // TEST GROUP D: Assistant Removal & Audit Preservation
    // =========================================================================

    public function test_d1_to_d3_director_removes_assistant_preserving_user_and_audit(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir_d');
        [$astUser, $assistant, $astToken] = $this->createAssistant($clinic, $directorUser, 'ast_d');

        // Create a scoped permission assignment to verify audit preservation
        $perm = \App\Models\Permission::where('name', 'booking.manage_queue')->first();
        if ($perm) {
            ScopedPermissionAssignment::create([
                'user_id' => $astUser->id,
                'permission_id' => $perm->id,
                'scope_type' => 'clinic',
                'scope_id' => $clinic->id,
                'granted_by_id' => $directorUser->id,
                'is_active' => true,
            ]);
        }

        $response = $this->withHeader('Authorization', "Bearer {$dirToken}")
            ->deleteJson("/api/v1/clinics/{$clinic->id}/assistants/{$assistant->id}");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');

        // D1: Assistant soft-deleted
        $this->assertSoftDeleted('clinic_assistants', ['id' => $assistant->id]);

        // D2: User account preserved
        $this->assertDatabaseHas('users', ['id' => $astUser->id]);

        // D3: Scoped permission assignments preserved
        if ($perm) {
            $this->assertDatabaseHas('scoped_permission_assignments', [
                'user_id' => $astUser->id,
                'permission_id' => $perm->id,
            ]);
        }
    }

    public function test_d4_cross_clinic_director_cannot_remove_assistant(): void
    {
        [$dirAUser, $dirADoctor, $clinicA, $dirAToken] = $this->createClinicWithDirector('dir_d4a');
        [$dirBUser, $dirBDoctor, $clinicB, $dirBToken] = $this->createClinicWithDirector('dir_d4b');
        [$astUser, $assistantB, $astToken] = $this->createAssistant($clinicB, $dirBUser, 'ast_d4b');

        $response = $this->withHeader('Authorization', "Bearer {$dirAToken}")
            ->deleteJson("/api/v1/clinics/{$clinicB->id}/assistants/{$assistantB->id}");

        $response->assertStatus(403);
        $this->assertNotSoftDeleted('clinic_assistants', ['id' => $assistantB->id]);
    }

    public function test_d5_non_director_cannot_remove_assistant(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir_d5');
        [$employedUser, $employedDoctor, $pivot, $empToken] = $this->attachEmployedDoctor($clinic, 'emp_d5');
        [$astUser, $assistant, $astToken] = $this->createAssistant($clinic, $directorUser, 'ast_d5');

        $response = $this->withHeader('Authorization', "Bearer {$empToken}")
            ->deleteJson("/api/v1/clinics/{$clinic->id}/assistants/{$assistant->id}");

        $response->assertStatus(403);
        $this->assertNotSoftDeleted('clinic_assistants', ['id' => $assistant->id]);
    }

    // =========================================================================
    // TEST GROUP E: Staff Detail Endpoint
    // =========================================================================

    public function test_e1_director_can_get_doctor_staff_detail(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir_e1');
        [$employedUser, $employedDoctor, $pivot, $empToken] = $this->attachEmployedDoctor($clinic, 'emp_e1');

        $response = $this->withHeader('Authorization', "Bearer {$dirToken}")
            ->getJson("/api/v1/clinics/{$clinic->id}/staff/{$employedDoctor->id}");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.type', 'doctor')
            ->assertJsonPath('data.name', $employedUser->name)
            ->assertJsonPath('data.email', $employedUser->email)
            ->assertJsonPath('data.specialty', $employedDoctor->specialty)
            ->assertJsonPath('data.position', 'doctor')
            ->assertJsonPath('data.is_active', true);
    }

    public function test_e2_director_can_get_assistant_staff_detail(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir_e2');
        [$astUser, $assistant, $astToken] = $this->createAssistant($clinic, $directorUser, 'ast_e2');

        $response = $this->withHeader('Authorization', "Bearer {$dirToken}")
            ->getJson("/api/v1/clinics/{$clinic->id}/staff/{$assistant->id}");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.type', 'assistant')
            ->assertJsonPath('data.name', $astUser->name)
            ->assertJsonPath('data.email', $astUser->email)
            ->assertJsonPath('data.position', 'assistant')
            ->assertJsonPath('data.is_active', true);
    }

    public function test_e3_non_director_cannot_view_staff_detail(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir_e3');
        [$employedUser, $employedDoctor, $pivot, $empToken] = $this->attachEmployedDoctor($clinic, 'emp_e3');

        $response = $this->withHeader('Authorization', "Bearer {$empToken}")
            ->getJson("/api/v1/clinics/{$clinic->id}/staff/{$employedDoctor->id}");

        $response->assertStatus(403);
    }

    public function test_e4_cross_clinic_staff_detail_rejected(): void
    {
        [$dirAUser, $dirADoctor, $clinicA, $dirAToken] = $this->createClinicWithDirector('dir_e4a');
        [$dirBUser, $dirBDoctor, $clinicB, $dirBToken] = $this->createClinicWithDirector('dir_e4b');
        [$employedUser, $employedDoctor, $pivotB, $empBToken] = $this->attachEmployedDoctor($clinicB, 'emp_e4b');

        $response = $this->withHeader('Authorization', "Bearer {$dirAToken}")
            ->getJson("/api/v1/clinics/{$clinicB->id}/staff/{$employedDoctor->id}");

        $response->assertStatus(403);
    }

    public function test_e5_unknown_staff_id_returns_404(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir_e5');

        $fakeUuid = '01a056bf-ece0-7053-a7c1-000000000000';
        $response = $this->withHeader('Authorization', "Bearer {$dirToken}")
            ->getJson("/api/v1/clinics/{$clinic->id}/staff/{$fakeUuid}");

        $response->assertStatus(404);
    }

    // =========================================================================
    // TEST GROUP F: Hard Delegation Ceiling
    // =========================================================================

    public function test_f1_hard_delegation_ceiling_strips_forbidden_permissions(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir_f');
        [$astUser, $assistant, $astToken] = $this->createAssistant($clinic, $directorUser, 'ast_f');

        $response = $this->withHeader('Authorization', "Bearer {$dirToken}")
            ->putJson("/api/v1/clinics/{$clinic->id}/assistants/{$assistant->id}/permissions", [
                'permissions' => [
                    'booking.manage_queue', // Allowed
                    'clinical.write_rx',     // Forbidden!
                    'clinic.manage_settings', // Forbidden!
                    'patient.view_contacts',  // Allowed
                    'platform.view_audit_logs', // Forbidden!
                ],
            ]);

        $response->assertStatus(200);

        $freshAssistant = $assistant->fresh();
        $this->assertEquals([
            'booking.manage_queue',
            'patient.view_contacts',
        ], $freshAssistant->permissions_json);

        $this->assertFalse(in_array('clinical.write_rx', $freshAssistant->permissions_json, true));
        $this->assertFalse(in_array('clinic.manage_settings', $freshAssistant->permissions_json, true));
        $this->assertFalse(in_array('platform.view_audit_logs', $freshAssistant->permissions_json, true));
    }

    // =========================================================================
    // TEST GROUP G: EV-D00-005-R Regression
    // =========================================================================

    public function test_g1_clinic_resource_includes_enriched_staff_data(): void
    {
        [$directorUser, $directorDoctor, $clinic, $dirToken] = $this->createClinicWithDirector('dir_g');
        [$employedUser, $employedDoctor, $pivot, $empToken] = $this->attachEmployedDoctor($clinic, 'emp_g');
        [$astUser, $assistant, $astToken] = $this->createAssistant($clinic, $directorUser, 'ast_g');

        $response = $this->withHeader('Authorization', "Bearer {$dirToken}")
            ->getJson("/api/v1/clinics/{$clinic->id}");

        $response->assertStatus(200);

        $doctors = $response->json('data.doctors');
        $this->assertNotEmpty($doctors);
        $empDocJson = collect($doctors)->firstWhere('id', $employedDoctor->id);
        $this->assertNotNull($empDocJson);
        $this->assertEquals($employedUser->email, $empDocJson['email']);
        $this->assertEquals($employedUser->phone, $empDocJson['phone']);
        $this->assertEquals('doctor', $empDocJson['position']);
        $this->assertTrue($empDocJson['is_active']);

        $assistants = $response->json('data.assistants');
        $this->assertNotEmpty($assistants);
        $astJson = collect($assistants)->firstWhere('id', $assistant->id);
        $this->assertNotNull($astJson);
        $this->assertEquals('assistant', $astJson['position']);
        $this->assertTrue($astJson['is_active']);
        $this->assertArrayHasKey('delegated_permissions', $astJson);
    }
}
