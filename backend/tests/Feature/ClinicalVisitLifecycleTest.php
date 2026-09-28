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

class ClinicalVisitLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected Patient $patient;
    protected User $assistantUser;
    protected ClinicAssistant $assistant;

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

        $this->doctorUser = User::factory()->create();
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-8899',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'العيادة المركزية',
            'address' => 'الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '021112233',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        $this->patient = Patient::create([
            'mrn' => 'MRN-2026-0001',
            'first_name' => 'سامي',
            'last_name' => 'علوان',
            'gender' => 'male',
            'date_of_birth' => '1995-03-12',
            'blood_group' => 'B+',
            'phone' => '0555123456',
        ]);

        $this->assistantUser = User::factory()->create();
        $this->assistantUser->roles()->attach($assistantRole->id);
        $this->assistant = ClinicAssistant::create([
            'user_id' => $this->assistantUser->id,
            'clinic_id' => $this->clinic->id,
            'permissions_json' => ['booking.manage_queue', 'booking.confirm_attendance'],
            'created_by_id' => $this->doctorUser->id,
        ]);
    }

    public function test_can_create_draft_clinical_visit_with_vis_reference(): void
    {
        $response = $this->actingAs($this->doctorUser, 'sanctum')->postJson('/api/v1/clinical-visits', [
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->id,
            'chief_complaint' => 'صداع حاد وارتفاع في درجات الحرارة منذ 3 أيام',
            'physical_examination' => 'الحلق محتقن مع تضخم طفيف في الغدد اللمفاوية',
            'diagnosis' => 'التهاب حاد في البلعوم',
            'clinical_notes' => 'ينصح بالراحة وتناول السوائل الدافئة',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.chief_complaint', 'صداع حاد وارتفاع في درجات الحرارة منذ 3 أيام');

        $visit = ClinicalVisit::first();
        $this->assertNotNull($visit);
        $this->assertMatchesRegularExpression('/^VIS-\d{4}-\d{4}$/', $visit->visit_reference);
    }

    public function test_assistant_can_update_vital_signs(): void
    {
        $visit = ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-0001',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'visit_date' => now()->format('Y-m-d'),
            'chief_complaint' => 'فحص روتيني',
            'status' => 'draft',
        ]);

        $vitalsData = [
            'blood_pressure' => '120/80',
            'heart_rate' => 72,
            'temperature' => 37.1,
            'spo2' => 98,
            'weight' => 75.5,
            'height' => 178,
        ];

        $response = $this->actingAs($this->assistantUser, 'sanctum')->postJson("/api/v1/clinical-visits/{$visit->id}/vital-signs", [
            'vital_signs' => $vitalsData,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.vital_signs.blood_pressure', '120/80')
            ->assertJsonPath('data.vital_signs.heart_rate', 72);

        $visit->refresh();
        $this->assertEquals('120/80', $visit->vital_signs_json['blood_pressure']);
    }

    public function test_finalizing_visit_locks_the_record_immutability(): void
    {
        $visit = ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-0002',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'visit_date' => now()->format('Y-m-d'),
            'chief_complaint' => 'ألم في الصدر',
            'diagnosis' => 'إجهاد عضلي حاد',
            'status' => 'draft',
        ]);

        // Doctor finalizes visit
        $finalizeRes = $this->actingAs($this->doctorUser, 'sanctum')->postJson("/api/v1/clinical-visits/{$visit->id}/finalize");

        $finalizeRes->assertStatus(200)
            ->assertJsonPath('data.status', 'finalized')
            ->assertJsonPath('data.is_finalized', true);

        $visit->refresh();
        $this->assertEquals('finalized', $visit->status);
        $this->assertNotNull($visit->finalized_at);

        // Attempt to update locked visit must FAIL with HTTP 422 (Record Immutability)
        $updateRes = $this->actingAs($this->doctorUser, 'sanctum')->putJson("/api/v1/clinical-visits/{$visit->id}", [
            'chief_complaint' => 'تعديل غير مسموح بعد الإقفال',
        ]);

        $updateRes->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        // Attempt to update vital signs on finalized visit must also FAIL
        $vitalsRes = $this->actingAs($this->assistantUser, 'sanctum')->postJson("/api/v1/clinical-visits/{$visit->id}/vital-signs", [
            'vital_signs' => ['temperature' => 38.0],
        ]);

        $vitalsRes->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_clinical_visits_list_pagination_and_meta(): void
    {
        for ($i = 1; $i <= 25; $i++) {
            ClinicalVisit::create([
                'visit_reference' => sprintf('VIS-2026-PAG-%04d', $i),
                'patient_id' => $this->patient->id,
                'doctor_id' => $this->doctor->id,
                'clinic_id' => $this->clinic->id,
                'visit_date' => '2026-09-07',
                'chief_complaint' => "شكوى مرضية رقم {$i}",
                'diagnosis' => "تشخيص سريري رقم {$i}",
                'status' => 'draft',
            ]);
        }

        $res1 = $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeaders(['X-Clinic-ID' => $this->clinic->id])
            ->getJson('/api/v1/clinical-visits?page=1&per_page=10');

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

        $res2 = $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeaders(['X-Clinic-ID' => $this->clinic->id])
            ->getJson('/api/v1/clinical-visits?page=2&per_page=10');

        $res2->assertStatus(200)
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.current_page', 2);

        $page1Ids = collect($res1->json('data'))->pluck('id');
        $page2Ids = collect($res2->json('data'))->pluck('id');

        $this->assertEmpty($page1Ids->intersect($page2Ids));
    }
}

