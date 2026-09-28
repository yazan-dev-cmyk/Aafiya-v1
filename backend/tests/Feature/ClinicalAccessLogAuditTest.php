<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\ClinicalAccessLog;
use App\Models\ClinicalVisit;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class ClinicalAccessLogAuditTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected User $patientUser;
    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            BookingPackageSeeder::class,
        ]);

        $adminRole = Role::where('name', 'admin')->firstOrFail();
        $doctorRole = Role::where('name', 'doctor')->firstOrFail();
        $patientRole = Role::where('name', 'patient_registered')->firstOrFail();

        // 1. Admin
        $this->adminUser = User::factory()->create();
        $this->adminUser->roles()->attach($adminRole->id);

        // 2. Doctor & Clinic
        $this->doctorUser = User::factory()->create();
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-1122',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة السلام',
            'address' => 'قسنطينة',
            'wilaya' => 'قسنطينة',
            'phone' => '031554433',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        // 3. Patient
        $this->patientUser = User::factory()->create();
        $this->patientUser->roles()->attach($patientRole->id);
        $this->patient = Patient::create([
            'user_id' => $this->patientUser->id,
            'mrn' => 'MRN-2026-0099',
            'first_name' => 'ياسين',
            'last_name' => 'براهيمي',
            'gender' => 'male',
            'date_of_birth' => '1985-05-15',
            'phone' => '0555443322',
        ]);
    }

    public function test_viewing_patient_ehr_and_clinical_visit_automatically_creates_audit_logs(): void
    {
        // 1. Create a clinical visit establishing doctor-patient affiliation in clinic
        $visit = ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-0099',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'visit_date' => now(),
            'chief_complaint' => 'صداع مستمر',
            'status' => 'draft',
        ]);

        // 2. Doctor views patient profile
        $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeaders(['X-Clinic-ID' => $this->clinic->id])
            ->getJson("/api/v1/patients/{$this->patient->id}")
            ->assertStatus(200);

        // Verify audit log created for patient EHR view
        $this->assertDatabaseHas('clinical_access_logs', [
            'actor_id' => $this->doctorUser->id,
            'patient_id' => $this->patient->id,
            'resource_type' => 'patient_ehr',
            'action' => 'view_summary',
        ]);

        // 3. View clinical visit
        $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeaders(['X-Clinic-ID' => $this->clinic->id])
            ->getJson("/api/v1/clinical-visits/{$visit->id}")
            ->assertStatus(200);

        $this->assertDatabaseHas('clinical_access_logs', [
            'actor_id' => $this->doctorUser->id,
            'patient_id' => $this->patient->id,
            'resource_type' => 'clinical_visit',
            'resource_id' => $visit->id,
            'action' => 'view_confidential_ehr',
        ]);
    }

    public function test_clinical_access_logs_are_append_only_and_immutable(): void
    {
        $log = ClinicalAccessLog::create([
            'actor_id' => $this->doctorUser->id,
            'actor_role' => 'doctor',
            'actor_position' => 'director',
            'patient_id' => $this->patient->id,
            'resource_type' => 'patient_ehr',
            'resource_id' => $this->patient->id,
            'action' => 'view_summary',
            'access_reason' => 'direct_care',
            'created_at' => now(),
        ]);

        // Assert update attempt throws RuntimeException (Immutable Log Rule - P7 Section 2)
        $this->expectException(RuntimeException::class);
        $log->update(['action' => 'tampered_action']);
    }

    public function test_clinical_access_logs_cannot_be_deleted(): void
    {
        $log = ClinicalAccessLog::create([
            'actor_id' => $this->doctorUser->id,
            'actor_role' => 'doctor',
            'actor_position' => 'director',
            'patient_id' => $this->patient->id,
            'resource_type' => 'patient_ehr',
            'resource_id' => $this->patient->id,
            'action' => 'view_summary',
            'access_reason' => 'direct_care',
            'created_at' => now(),
        ]);

        // Assert delete attempt throws RuntimeException
        $this->expectException(RuntimeException::class);
        $log->delete();
    }

    public function test_admin_and_authorized_actors_can_query_audit_stream(): void
    {
        ClinicalAccessLog::create([
            'actor_id' => $this->doctorUser->id,
            'actor_role' => 'doctor',
            'actor_position' => 'director',
            'patient_id' => $this->patient->id,
            'resource_type' => 'patient_ehr',
            'resource_id' => $this->patient->id,
            'action' => 'view_summary',
            'access_reason' => 'direct_care',
            'created_at' => now(),
        ]);

        // Admin queries audit logs
        $response = $this->actingAs($this->adminUser, 'sanctum')->getJson('/api/v1/audit/clinical-access-logs');
        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.resource_type', 'patient_ehr');

        // Patient queries audit trail to see who accessed their own records
        $patientRes = $this->actingAs($this->patientUser, 'sanctum')->getJson('/api/v1/audit/clinical-access-logs');
        $patientRes->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_clinical_access_logs_list_pagination_and_meta(): void
    {
        for ($i = 1; $i <= 25; $i++) {
            ClinicalAccessLog::create([
                'actor_id' => $this->doctorUser->id,
                'actor_role' => 'doctor',
                'actor_position' => 'director',
                'patient_id' => $this->patient->id,
                'resource_type' => 'patient_ehr',
                'resource_id' => $this->patient->id,
                'action' => "view_summary_{$i}",
                'access_reason' => 'direct_care',
                'request_id' => (string) \Illuminate\Support\Str::uuid(),
                'created_at' => now()->subMinutes(30 - $i),
            ]);
        }

        $res1 = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/audit/clinical-access-logs?page=1&per_page=10');

        $res1->assertStatus(200)
            ->assertJsonCount(10, 'data')
            ->assertJsonStructure([
                'data',
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ])
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.total', 25)
            ->assertJsonPath('meta.last_page', 3);

        $res2 = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/audit/clinical-access-logs?page=2&per_page=10');

        $res2->assertStatus(200)
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.current_page', 2);

        $page1Ids = collect($res1->json('data'))->pluck('id');
        $page2Ids = collect($res2->json('data'))->pluck('id');

        $this->assertEmpty($page1Ids->intersect($page2Ids));
    }
}

