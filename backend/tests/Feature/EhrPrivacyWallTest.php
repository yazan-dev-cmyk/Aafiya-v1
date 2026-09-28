<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\ClinicAssistant;
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
use Tests\TestCase;

class EhrPrivacyWallTest extends TestCase
{
    use RefreshDatabase;

    protected User $directorUser;
    protected Doctor $directorDoctor;
    protected User $treatingUser;
    protected Doctor $treatingDoctor;
    protected User $unrelatedDoctorUser;
    protected Doctor $unrelatedDoctor;
    protected Clinic $clinic;
    protected User $patientUser;
    protected Patient $patient;
    protected User $assistantUser;
    protected ClinicAssistant $assistant;
    protected ClinicalVisit $visit;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            BookingPackageSeeder::class,
        ]);

        $doctorRole = Role::where('name', 'doctor')->firstOrFail();
        $assistantRole = Role::where('name', 'doctor_assistant')->firstOrFail();
        $patientRole = Role::where('name', 'patient_registered')->firstOrFail();

        // 1. Clinic Director
        $this->directorUser = User::factory()->create();
        $this->directorUser->roles()->attach($doctorRole->id);
        $this->directorDoctor = Doctor::create([
            'user_id' => $this->directorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DIR-1001',
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة ابن سينا',
            'address' => 'عنابة',
            'wilaya' => 'عنابة',
            'phone' => '038000000',
            'director_doctor_id' => $this->directorDoctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->directorDoctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        // 2. Treating Doctor (Employed Doctor)
        $this->treatingUser = User::factory()->create();
        $this->treatingUser->roles()->attach($doctorRole->id);
        $this->treatingDoctor = Doctor::create([
            'user_id' => $this->treatingUser->id,
            'specialty' => 'طب الأعصاب',
            'license_number' => 'DOC-2002',
        ]);

        $this->treatingDoctor->clinics()->attach($this->clinic->id, [
            'position' => 'doctor',
            'is_primary' => true,
        ]);

        // 3. Unrelated Doctor
        $this->unrelatedDoctorUser = User::factory()->create();
        $this->unrelatedDoctorUser->roles()->attach($doctorRole->id);
        $this->unrelatedDoctor = Doctor::create([
            'user_id' => $this->unrelatedDoctorUser->id,
            'specialty' => 'طب العيون',
            'license_number' => 'DOC-3003',
        ]);

        // 4. Patient User
        $this->patientUser = User::factory()->create();
        $this->patientUser->roles()->attach($patientRole->id);
        $this->patient = Patient::create([
            'user_id' => $this->patientUser->id,
            'mrn' => 'MRN-2026-0005',
            'first_name' => 'مراد',
            'last_name' => 'طاهري',
            'gender' => 'male',
            'date_of_birth' => '1988-07-22',
            'blood_group' => 'AB+',
            'phone' => '0770554433',
        ]);

        // 5. Assistant
        $this->assistantUser = User::factory()->create();
        $this->assistantUser->roles()->attach($assistantRole->id);
        $this->assistant = ClinicAssistant::create([
            'user_id' => $this->assistantUser->id,
            'clinic_id' => $this->clinic->id,
            'permissions_json' => ['booking.manage_queue', 'booking.confirm_attendance'],
            'created_by_id' => $this->directorUser->id,
        ]);

        // 6. Clinical Visit
        $this->visit = ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-0055',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->treatingDoctor->id,
            'clinic_id' => $this->clinic->id,
            'visit_date' => now()->format('Y-m-d'),
            'chief_complaint' => 'نوبات صرع واضطراب في التركيز',
            'vital_signs_json' => ['blood_pressure' => '130/85', 'heart_rate' => 80],
            'physical_examination' => 'فحص ردود الفعل العصبية أظهر بطئاً في الاستجابة',
            'diagnosis' => 'صرع الفص الصدغي المعقد (Temporal Lobe Epilepsy)',
            'clinical_notes' => 'تعديل جرعة مضاد الصرع وإجراء تخطيط دماغ EEG عاجل',
            'status' => 'draft',
        ]);
    }

    public function test_treating_doctor_sees_full_confidential_clinical_content(): void
    {
        $response = $this->actingAs($this->treatingUser, 'sanctum')->getJson("/api/v1/clinical-visits/{$this->visit->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.privacy_level', 'full')
            ->assertJsonPath('data.diagnosis', 'صرع الفص الصدغي المعقد (Temporal Lobe Epilepsy)')
            ->assertJsonPath('data.clinical_notes', 'تعديل جرعة مضاد الصرع وإجراء تخطيط دماغ EEG عاجل')
            ->assertJsonPath('data.chief_complaint', 'نوبات صرع واضطراب في التركيز');
    }

    public function test_patient_sees_their_own_full_clinical_record(): void
    {
        $response = $this->actingAs($this->patientUser, 'sanctum')->getJson("/api/v1/clinical-visits/{$this->visit->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.privacy_level', 'full')
            ->assertJsonPath('data.diagnosis', 'صرع الفص الصدغي المعقد (Temporal Lobe Epilepsy)');
    }

    public function test_clinic_director_privacy_wall_blocks_confidential_diagnosis_and_notes(): void
    {
        // P4 Section 1.1 Invariant: Director is NOT granted access to confidential clinical content of employed doctors' patients!
        $response = $this->actingAs($this->directorUser, 'sanctum')->getJson("/api/v1/clinical-visits/{$this->visit->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.privacy_level', 'meta_only')
            ->assertJsonPath('data.visit_reference', 'VIS-2026-0055')
            ->assertJsonPath('data.patient.name', 'مراد طاهري')
            ->assertJsonPath('data.diagnosis', null) // Masked!
            ->assertJsonPath('data.clinical_notes', null) // Masked!
            ->assertJsonPath('data.physical_examination', null) // Masked!
            ->assertJsonPath('data.chief_complaint', null); // Masked!
    }

    public function test_assistant_privacy_wall_allows_vitals_but_masks_clinical_diagnosis_and_notes(): void
    {
        $response = $this->actingAs($this->assistantUser, 'sanctum')->getJson("/api/v1/clinical-visits/{$this->visit->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.privacy_level', 'intake_only')
            ->assertJsonPath('data.vital_signs.blood_pressure', '130/85') // Allowed!
            ->assertJsonPath('data.diagnosis', null) // Masked!
            ->assertJsonPath('data.clinical_notes', null) // Masked!
            ->assertJsonPath('data.physical_examination', null) // Masked!
            ->assertJsonPath('data.chief_complaint', null); // Masked!
    }

    public function test_unrelated_doctor_is_forbidden_access(): void
    {
        $response = $this->actingAs($this->unrelatedDoctorUser, 'sanctum')->getJson("/api/v1/clinical-visits/{$this->visit->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.privacy_level', 'forbidden')
            ->assertJsonPath('data.diagnosis', null)
            ->assertJsonPath('data.vital_signs', null);
    }
}
