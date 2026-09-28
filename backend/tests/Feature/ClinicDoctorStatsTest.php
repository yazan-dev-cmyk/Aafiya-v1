<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\ClinicalVisit;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\Patient;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ClinicDoctorStatsTest extends TestCase
{
    use RefreshDatabase;

    protected User $directorUser;
    protected Doctor $directorDoctor;
    protected string $directorToken;

    protected User $employedUser;
    protected Doctor $employedDoctor;
    protected string $employedToken;

    protected Clinic $clinicA;
    protected Clinic $clinicB;

    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        // 1. Director Doctor
        $this->directorUser = User::factory()->create([
            'name' => 'د. أحمد المدير',
            'email' => 'director@aafiya.dz',
            'is_active' => true,
        ]);
        $this->directorUser->assignRole('doctor');

        $this->directorDoctor = Doctor::create([
            'user_id' => $this->directorUser->id,
            'license_number' => 'LIC-DIR-001',
            'specialty' => 'Cardiology',
            'is_verified' => true,
        ]);
        $this->directorToken = $this->directorUser->createToken('director-token')->plainTextToken;

        // 2. Employed Doctor
        $this->employedUser = User::factory()->create([
            'name' => 'د. سارة الموظفة',
            'email' => 'employed@aafiya.dz',
            'is_active' => true,
        ]);
        $this->employedUser->assignRole('doctor');

        $this->employedDoctor = Doctor::create([
            'user_id' => $this->employedUser->id,
            'license_number' => 'LIC-EMP-002',
            'specialty' => 'Pediatrics',
            'is_verified' => true,
        ]);
        $this->employedToken = $this->employedUser->createToken('employed-token')->plainTextToken;

        // 3. Clinic A (Directed by Director Doctor)
        $this->clinicA = Clinic::create([
            'name' => 'عيادة النور التخصصية (Clinic A)',
            'address' => 'شارع ديدوش مراد، الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '+21321000001',
            'director_doctor_id' => $this->directorDoctor->id,
            'is_active' => true,
            'max_patients_per_slot' => 10,
        ]);

        // Affiliations in Clinic A
        DoctorClinic::create([
            'doctor_id' => $this->directorDoctor->id,
            'clinic_id' => $this->clinicA->id,
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now(),
        ]);

        DoctorClinic::create([
            'doctor_id' => $this->employedDoctor->id,
            'clinic_id' => $this->clinicA->id,
            'position' => 'doctor',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now(),
        ]);

        // 4. Clinic B (Separate clinic)
        $this->clinicB = Clinic::create([
            'name' => 'عيادة الأمل (Clinic B)',
            'address' => 'نهج العربي بن مهيدي، وهران',
            'wilaya' => 'وهران',
            'phone' => '+21341000002',
            'is_active' => true,
            'max_patients_per_slot' => 10,
        ]);

        // 5. Patient
        $this->patient = Patient::create([
            'mrn' => 'MRN-2026-0001',
            'first_name' => 'محمد',
            'last_name' => 'بلقاسم',
            'gender' => 'male',
            'date_of_birth' => '1985-05-15',
            'blood_group' => 'O+',
            'phone' => '+213555999888',
        ]);
    }

    /**
     * Helper to create appointment.
     */
    protected function createAppointment(array $overrides = []): Appointment
    {
        static $refCounter = 1;
        $ref = sprintf('APT-STAT-%04d', $refCounter++);

        return Appointment::create(array_merge([
            'booking_reference' => $ref,
            'secure_token' => Str::random(64),
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->directorDoctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => 'محمد بلقاسم',
            'patient_phone' => '+213555999888',
            'created_by_id' => $this->directorUser->id,
            'creator_type' => 'doctor',
            'appointment_date' => today()->toDateString(),
            'time_slot' => '09:00',
            'status' => 'confirmed',
        ], $overrides));
    }

    // =========================================================================
    // 1. AUTHORIZATION TESTS
    // =========================================================================

    public function test_unauthenticated_request_returns_401(): void
    {
        $response = $this->getJson('/api/v1/clinic/doctor-stats');
        $response->assertStatus(401);
    }

    public function test_non_doctor_user_is_forbidden_403(): void
    {
        $patientUser = User::factory()->create(['is_active' => true]);
        $patientUser->assignRole('patient_registered');
        $token = $patientUser->createToken('patient-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/clinic/doctor-stats');

        $response->assertStatus(403);
    }

    public function test_employed_doctor_cannot_access_clinic_stats_403(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->employedToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats');

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'code' => 403,
                'message' => 'غير مصرح: هذا الإجراء مخصص لمدير العيادة فقط.',
            ]);
    }

    public function test_doctor_assistant_cannot_access_clinic_stats_403(): void
    {
        $assistantUser = User::factory()->create(['is_active' => true]);
        $assistantUser->assignRole('doctor_assistant');

        ClinicAssistant::create([
            'user_id' => $assistantUser->id,
            'clinic_id' => $this->clinicA->id,
            'permissions_json' => ['booking.manage_queue', 'booking.confirm_attendance'],
            'is_active' => true,
        ]);

        $token = $assistantUser->createToken('assistant-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats');

        $response->assertStatus(403);
    }

    public function test_authorized_director_can_access_clinic_stats_200(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'clinic' => [
                        'id' => $this->clinicA->id,
                        'name' => $this->clinicA->name,
                    ],
                ],
            ]);
    }

    public function test_multi_clinic_director_without_active_clinic_context_fails_closed_403(): void
    {
        // Associate Director with a second clinic
        DoctorClinic::create([
            'doctor_id' => $this->directorDoctor->id,
            'clinic_id' => $this->clinicB->id,
            'position' => 'director',
            'is_primary' => false,
            'is_active' => true,
            'joined_at' => now(),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->getJson('/api/v1/clinic/doctor-stats');

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'code' => 403,
                'message' => 'يجب تحديد سياق العيادة النشطة عبر الترويسة (X-Clinic-ID).',
            ]);
    }

    public function test_foreign_clinic_access_is_forbidden_403(): void
    {
        // Director tries to pass Clinic B where they are not affiliated
        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicB->id)
            ->getJson('/api/v1/clinic/doctor-stats');

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'code' => 403,
                'message' => 'غير مصرح: الطبيب غير منتسب لهذه العيادة.',
            ]);
    }

    // =========================================================================
    // 2. DOCTOR FILTERING & IDOR TESTS
    // =========================================================================

    public function test_no_doctor_filter_returns_aggregate_and_doctor_breakdown(): void
    {
        $this->createAppointment([
            'doctor_id' => $this->directorDoctor->id,
            'status' => 'confirmed',
        ]);
        $this->createAppointment([
            'doctor_id' => $this->employedDoctor->id,
            'status' => 'confirmed',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.summary.total_appointments', 2)
            ->assertJsonPath('data.filters.doctor_id', null)
            ->assertJsonCount(2, 'data.doctors');
    }

    public function test_valid_doctor_filter_returns_selected_doctor_statistics(): void
    {
        $this->createAppointment([
            'doctor_id' => $this->directorDoctor->id,
            'status' => 'confirmed',
        ]);
        $this->createAppointment([
            'doctor_id' => $this->employedDoctor->id,
            'status' => 'confirmed',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats?doctor_id=' . $this->employedDoctor->id);

        $response->assertStatus(200)
            ->assertJsonPath('data.summary.total_appointments', 1)
            ->assertJsonPath('data.selected_doctor.id', $this->employedDoctor->id)
            ->assertJsonPath('data.selected_doctor.name', 'د. سارة الموظفة')
            ->assertJsonPath('data.selected_doctor.specialty', 'Pediatrics')
            ->assertJsonPath('data.selected_doctor.position', 'doctor');
    }

    public function test_foreign_doctor_filter_returns_422_with_exact_message(): void
    {
        // Doctor C belongs only to Clinic B
        $foreignUser = User::factory()->create(['is_active' => true]);
        $foreignUser->assignRole('doctor');
        $foreignDoctor = Doctor::create([
            'user_id' => $foreignUser->id,
            'license_number' => 'LIC-FOR-003',
            'specialty' => 'Dermatology',
            'is_verified' => true,
        ]);
        DoctorClinic::create([
            'doctor_id' => $foreignDoctor->id,
            'clinic_id' => $this->clinicB->id,
            'position' => 'doctor',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now(),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats?doctor_id=' . $foreignDoctor->id);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'code' => 422,
                'message' => 'الطبيب المحدد غير منتسب لهذه العيادة.',
                'errors' => [
                    'doctor_id' => ['الطبيب المحدد غير منتسب لهذه العيادة.'],
                ],
            ]);
    }

    public function test_suspended_doctor_membership_returns_422(): void
    {
        // Suspend employed doctor in Clinic A
        DoctorClinic::where('doctor_id', $this->employedDoctor->id)
            ->where('clinic_id', $this->clinicA->id)
            ->update(['is_active' => false]);

        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats?doctor_id=' . $this->employedDoctor->id);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'code' => 422,
                'message' => 'الطبيب المحدد غير منتسب لهذه العيادة.',
                'errors' => [
                    'doctor_id' => ['الطبيب المحدد غير منتسب لهذه العيادة.'],
                ],
            ]);
    }

    public function test_malformed_uuid_doctor_filter_returns_422(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats?doctor_id=invalid-uuid-1234');

        $response->assertStatus(422);
    }

    // =========================================================================
    // 3. DATE FILTERING TESTS
    // =========================================================================

    public function test_omitted_dates_default_to_today(): void
    {
        $today = today()->toDateString();
        $yesterday = today()->subDay()->toDateString();

        $this->createAppointment([
            'appointment_date' => $today,
            'status' => 'confirmed',
        ]);
        $this->createAppointment([
            'appointment_date' => $yesterday,
            'status' => 'confirmed',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.filters.from_date', $today)
            ->assertJsonPath('data.filters.to_date', $today)
            ->assertJsonPath('data.summary.total_appointments', 1);
    }

    public function test_multi_day_range_is_inclusive(): void
    {
        $day1 = '2026-09-10';
        $day2 = '2026-09-11';
        $day3 = '2026-09-12';
        $dayOutside = '2026-09-13';

        $this->createAppointment(['appointment_date' => $day1]);
        $this->createAppointment(['appointment_date' => $day2]);
        $this->createAppointment(['appointment_date' => $day3]);
        $this->createAppointment(['appointment_date' => $dayOutside]);

        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson("/api/v1/clinic/doctor-stats?from_date={$day1}&to_date={$day3}");

        $response->assertStatus(200)
            ->assertJsonPath('data.summary.total_appointments', 3);
    }

    public function test_invalid_date_format_returns_422(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats?from_date=10-09-2026');

        $response->assertStatus(422);
    }

    public function test_reversed_date_range_returns_422(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats?from_date=2026-09-20&to_date=2026-09-10');

        $response->assertStatus(422)
            ->assertJsonStructure(['errors' => ['to_date']]);
    }

    // =========================================================================
    // 4. KPI SEMANTICS & STATUS TESTS
    // =========================================================================

    public function test_status_mapping_does_not_double_count(): void
    {
        $today = today()->toDateString();

        // 1 pending (checked_in_at IS NULL)
        $this->createAppointment(['status' => 'pending', 'checked_in_at' => null]);

        // 1 confirmed (checked_in_at IS NULL)
        $this->createAppointment(['status' => 'confirmed', 'checked_in_at' => null]);

        // 1 attended (waiting room: checked_in_at NOT NULL, no visit)
        $this->createAppointment(['status' => 'attended', 'checked_in_at' => now()]);

        // 1 completed (attended + finalized clinical visit)
        $completedApt = $this->createAppointment(['status' => 'attended', 'checked_in_at' => now()]);
        ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-0001',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->directorDoctor->id,
            'clinic_id' => $this->clinicA->id,
            'appointment_id' => $completedApt->id,
            'visit_date' => $today,
            'chief_complaint' => 'Checkup',
            'status' => 'finalized',
            'finalized_at' => now(),
            'finalized_by_id' => $this->directorUser->id,
        ]);

        // 1 no_show
        $this->createAppointment(['status' => 'no_show']);

        // 1 cancelled
        $this->createAppointment(['status' => 'cancelled']);

        // 1 rejected
        $this->createAppointment(['status' => 'rejected']);

        // 1 expired
        $this->createAppointment(['status' => 'expired']);

        // 1 rescheduled
        $this->createAppointment(['status' => 'rescheduled']);

        // 1 walk-in finalized visit (no appointment)
        ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-0002',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->directorDoctor->id,
            'clinic_id' => $this->clinicA->id,
            'appointment_id' => null,
            'visit_date' => $today,
            'chief_complaint' => 'Walk-in consult',
            'status' => 'finalized',
            'finalized_at' => now(),
            'finalized_by_id' => $this->directorUser->id,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats');

        $response->assertStatus(200);

        $summary = $response->json('data.summary');

        // Total appointments must be 8 (excludes rescheduled, walk-in is clinical_visit not appointment)
        $this->assertEquals(8, $summary['total_appointments'], 'total_appointments must exclude rescheduled');
        $this->assertEquals(2, $summary['pending_check_in'], 'pending_check_in must include pending and confirmed without check-in');
        $this->assertEquals(1, $summary['in_waiting_room'], 'in_waiting_room must only count attended without finalized visit');
        $this->assertEquals(1, $summary['completed'], 'completed must only count appointments with finalized visit');
        $this->assertEquals(1, $summary['no_show']);
        $this->assertEquals(1, $summary['cancelled']);
        $this->assertEquals(1, $summary['rejected']);
        $this->assertEquals(1, $summary['expired']);
        $this->assertEquals(1, $summary['rescheduled']);
        $this->assertEquals(1, $summary['walk_in_visits']);
    }

    public function test_attended_with_finalized_clinical_visit_is_completed(): void
    {
        $apt = $this->createAppointment([
            'status' => 'attended',
            'checked_in_at' => now(),
        ]);

        ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-0010',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->directorDoctor->id,
            'clinic_id' => $this->clinicA->id,
            'appointment_id' => $apt->id,
            'visit_date' => today()->toDateString(),
            'chief_complaint' => 'Test consult',
            'status' => 'finalized',
            'finalized_at' => now(),
            'finalized_by_id' => $this->directorUser->id,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.summary.completed', 1)
            ->assertJsonPath('data.summary.in_waiting_room', 0);
    }

    public function test_attended_without_finalized_clinical_visit_is_waiting_room(): void
    {
        $this->createAppointment([
            'status' => 'attended',
            'checked_in_at' => now(),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.summary.in_waiting_room', 1)
            ->assertJsonPath('data.summary.completed', 0);
    }

    public function test_finalized_walk_in_clinical_visit_is_walk_in_visits(): void
    {
        ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-0020',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->directorDoctor->id,
            'clinic_id' => $this->clinicA->id,
            'appointment_id' => null,
            'visit_date' => today()->toDateString(),
            'chief_complaint' => 'Walk-in emergency',
            'status' => 'finalized',
            'finalized_at' => now(),
            'finalized_by_id' => $this->directorUser->id,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.summary.walk_in_visits', 1)
            ->assertJsonPath('data.summary.total_appointments', 0);
    }

    // =========================================================================
    // 5. SECURITY, ISOLATION & EDGE CASE TESTS
    // =========================================================================

    public function test_cross_clinic_security_isolation_director_a_never_sees_clinic_b_data(): void
    {
        // Clinic A appointment
        $this->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->directorDoctor->id,
            'status' => 'confirmed',
        ]);

        // Clinic B appointment
        $this->createAppointment([
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->directorDoctor->id,
            'status' => 'confirmed',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.summary.total_appointments', 1);
    }

    public function test_rescheduled_appointments_are_counted_in_rescheduled_and_excluded_from_total(): void
    {
        $originalApt = $this->createAppointment([
            'status' => 'rescheduled',
        ]);

        $newApt = $this->createAppointment([
            'status' => 'confirmed',
            'rescheduled_from_id' => $originalApt->id,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.summary.rescheduled', 1)
            ->assertJsonPath('data.summary.total_appointments', 1);
    }

    public function test_soft_deleted_appointments_and_clinical_visits_are_excluded(): void
    {
        $apt = $this->createAppointment(['status' => 'confirmed']);
        $apt->delete(); // Soft delete

        $completedApt = $this->createAppointment([
            'status' => 'attended',
            'checked_in_at' => now(),
        ]);
        $visit = ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-0030',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->directorDoctor->id,
            'clinic_id' => $this->clinicA->id,
            'appointment_id' => $completedApt->id,
            'visit_date' => today()->toDateString(),
            'chief_complaint' => 'Deleted visit test',
            'status' => 'finalized',
            'finalized_at' => now(),
            'finalized_by_id' => $this->directorUser->id,
        ]);
        $visit->delete(); // Soft delete visit

        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/doctor-stats');

        $response->assertStatus(200);

        // $apt was soft deleted -> not counted
        // $completedApt's visit was soft deleted -> counts as waiting room, NOT completed!
        $this->assertEquals(1, $response->json('data.summary.total_appointments'));
        $this->assertEquals(0, $response->json('data.summary.completed'));
        $this->assertEquals(1, $response->json('data.summary.in_waiting_room'));
    }

    public function test_empty_date_range_returns_200_with_zero_counters(): void
    {
        $futureDate = today()->addYear()->toDateString();

        $response = $this->withHeader('Authorization', "Bearer {$this->directorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson("/api/v1/clinic/doctor-stats?from_date={$futureDate}&to_date={$futureDate}");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'summary' => [
                        'total_appointments' => 0,
                        'pending_check_in' => 0,
                        'in_waiting_room' => 0,
                        'completed' => 0,
                        'no_show' => 0,
                        'cancelled' => 0,
                        'rejected' => 0,
                        'expired' => 0,
                        'rescheduled' => 0,
                        'walk_in_visits' => 0,
                    ],
                ],
            ]);
    }
}
