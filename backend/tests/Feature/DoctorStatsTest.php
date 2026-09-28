<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicalVisit;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\Patient;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class DoctorStatsTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected string $doctorToken;

    protected Clinic $clinicA;
    protected Clinic $clinicB;

    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        // Primary Doctor
        $this->doctorUser = User::factory()->create([
            'email' => 'doctor.stats@aafiya.dz',
            'is_active' => true,
        ]);
        $this->doctorUser->assignRole('doctor');

        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'license_number' => 'LIC-STATS-DOC-001',
            'specialty' => 'Internal Medicine',
            'is_verified' => true,
        ]);

        $this->doctorToken = $this->doctorUser->createToken('test-token')->plainTextToken;

        // Clinic A
        $this->clinicA = Clinic::create([
            'name' => 'عيادة النور التخصصية (Clinic A)',
            'address' => 'شارع ديدوش مراد، الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '+21321000001',
            'is_active' => true,
            'max_patients_per_slot' => 10,
        ]);

        // Clinic B
        $this->clinicB = Clinic::create([
            'name' => 'عيادة الأمل (Clinic B)',
            'address' => 'نهج العربي بن مهيدي، وهران',
            'wilaya' => 'وهران',
            'phone' => '+21341000002',
            'is_active' => true,
            'max_patients_per_slot' => 10,
        ]);

        // Patient
        $this->patient = Patient::create([
            'user_id' => null,
            'name' => 'محمد بلقاسم',
            'phone' => '+213555999888',
            'gender' => 'male',
            'date_of_birth' => '1985-05-15',
            'blood_type' => 'O+',
        ]);
    }

    /**
     * 1. Unauthenticated users cannot access doctor stats (401).
     */
    public function test_unauthenticated_user_cannot_access_doctor_stats(): void
    {
        $response = $this->getJson('/api/v1/doctor/stats');

        $response->assertStatus(401);
    }

    /**
     * 2. Non-doctor roles are forbidden (403).
     */
    public function test_non_doctor_user_is_forbidden(): void
    {
        $patientUser = User::factory()->create(['is_active' => true]);
        $patientUser->assignRole('patient_registered');
        $token = $patientUser->createToken('patient-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/doctor/stats');

        $response->assertStatus(403);
    }

    /**
     * 3. Unverified doctor accounts are forbidden (403).
     */
    public function test_unverified_doctor_is_forbidden(): void
    {
        $this->doctor->update(['is_verified' => false]);

        $response = $this->withHeader('Authorization', "Bearer {$this->doctorToken}")
            ->getJson('/api/v1/doctor/stats');

        $response->assertStatus(403);
    }

    /**
     * 4. Multi-clinic doctor without X-Clinic-ID header fails closed (403).
     */
    public function test_multi_clinic_doctor_without_clinic_header_fails_closed(): void
    {
        // Associate with Clinic A
        DoctorClinic::create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'position' => 'doctor',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now(),
        ]);

        // Associate with Clinic B
        DoctorClinic::create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicB->id,
            'position' => 'doctor',
            'is_primary' => false,
            'is_active' => true,
            'joined_at' => now(),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->doctorToken}")
            ->getJson('/api/v1/doctor/stats');

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'code' => 403,
                'message' => 'يجب تحديد سياق العيادة النشطة عبر الترويسة (X-Clinic-ID).',
            ]);
    }

    /**
     * 5. Single-clinic doctor automatically resolves context without header.
     */
    public function test_single_clinic_doctor_resolves_stats_automatically(): void
    {
        DoctorClinic::create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'position' => 'doctor',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now(),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->doctorToken}")
            ->getJson('/api/v1/doctor/stats');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'active_clinic_id' => $this->clinicA->id,
                    'active_clinic_name' => $this->clinicA->name,
                    'today_total' => 0,
                    'pending_check_in' => 0,
                    'in_waiting_room' => 0,
                    'completed_today' => 0,
                    'no_show_today' => 0,
                ],
            ]);
    }

    /**
     * 6. Cross-doctor data isolation: Doctor A cannot see Doctor B's appointments (Zero IDOR).
     */
    public function test_doctor_cannot_see_another_doctors_appointments(): void
    {
        DoctorClinic::create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'position' => 'doctor',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now(),
        ]);

        // Create Doctor B in the same clinic
        $doctorBUser = User::factory()->create(['is_active' => true]);
        $doctorBUser->assignRole('doctor');
        $doctorB = Doctor::create([
            'user_id' => $doctorBUser->id,
            'license_number' => 'LIC-STATS-DOC-002',
            'specialty' => 'Cardiology',
            'is_verified' => true,
        ]);
        DoctorClinic::create([
            'doctor_id' => $doctorB->id,
            'clinic_id' => $this->clinicA->id,
            'position' => 'doctor',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now(),
        ]);

        $today = now()->format('Y-m-d');

        // Create 3 appointments for Doctor B
        for ($i = 0; $i < 3; $i++) {
            Appointment::create([
                'id' => (string) Str::uuid(),
                'booking_reference' => "REF-DOCB-{$i}",
                'clinic_id' => $this->clinicA->id,
                'doctor_id' => $doctorB->id,
                'patient_id' => $this->patient->id,
                'patient_name' => $this->patient->name,
                'patient_phone' => $this->patient->phone,
                'created_by_id' => $this->doctorUser->id,
                'appointment_date' => $today,
                'time_slot' => '09:00',
                'status' => 'pending',
            ]);
        }

        // Query Doctor A's stats
        $response = $this->withHeader('Authorization', "Bearer {$this->doctorToken}")
            ->getJson("/api/v1/doctor/stats?date={$today}");

        $response->assertStatus(200)
            ->assertJsonPath('data.today_total', 0)
            ->assertJsonPath('data.pending_check_in', 0);
    }

    /**
     * 7. Cross-clinic data isolation: Appointments in Clinic B are not counted when querying Clinic A.
     */
    public function test_doctor_cannot_see_appointments_from_other_clinics(): void
    {
        DoctorClinic::create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'position' => 'doctor',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now(),
        ]);
        DoctorClinic::create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicB->id,
            'position' => 'doctor',
            'is_primary' => false,
            'is_active' => true,
            'joined_at' => now(),
        ]);

        $today = now()->format('Y-m-d');

        // Create 2 appointments for Doctor A in Clinic B
        for ($i = 0; $i < 2; $i++) {
            Appointment::create([
                'id' => (string) Str::uuid(),
                'booking_reference' => "REF-CLINICB-{$i}",
                'clinic_id' => $this->clinicB->id,
                'doctor_id' => $this->doctor->id,
                'patient_id' => $this->patient->id,
                'patient_name' => $this->patient->name,
                'patient_phone' => $this->patient->phone,
                'created_by_id' => $this->doctorUser->id,
                'appointment_date' => $today,
                'time_slot' => '10:00',
                'status' => 'pending',
            ]);
        }

        // Query stats for Clinic A
        $response = $this->withHeader('Authorization', "Bearer {$this->doctorToken}")
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson("/api/v1/doctor/stats?date={$today}");

        $response->assertStatus(200)
            ->assertJsonPath('data.active_clinic_id', $this->clinicA->id)
            ->assertJsonPath('data.today_total', 0);
    }

    /**
     * 8. Accurate aggregation: Distinguishes between in_waiting_room and completed_today.
     */
    public function test_accurate_aggregation_of_waiting_room_vs_completed_visits(): void
    {
        DoctorClinic::create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'position' => 'doctor',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now(),
        ]);

        $today = now()->format('Y-m-d');

        // 1. Pending check-in appointment
        Appointment::create([
            'id' => (string) Str::uuid(),
            'booking_reference' => 'REF-PENDING-1',
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->name,
            'patient_phone' => $this->patient->phone,
            'created_by_id' => $this->doctorUser->id,
            'appointment_date' => $today,
            'time_slot' => '08:00',
            'status' => 'pending',
            'checked_in_at' => null,
        ]);

        // 2. Confirmed check-in appointment (still pending arrival)
        Appointment::create([
            'id' => (string) Str::uuid(),
            'booking_reference' => 'REF-CONFIRMED-1',
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->name,
            'patient_phone' => $this->patient->phone,
            'created_by_id' => $this->doctorUser->id,
            'appointment_date' => $today,
            'time_slot' => '09:00',
            'status' => 'confirmed',
            'checked_in_at' => null,
        ]);

        // 3. Checked-in patient in Waiting Room (status = attended, checked_in_at NOT NULL, no finalized visit)
        Appointment::create([
            'id' => (string) Str::uuid(),
            'booking_reference' => 'REF-WAITING-1',
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->name,
            'patient_phone' => $this->patient->phone,
            'created_by_id' => $this->doctorUser->id,
            'appointment_date' => $today,
            'time_slot' => '10:00',
            'status' => 'attended',
            'checked_in_at' => now()->subMinutes(20),
        ]);

        // 4. Completed visit with Appointment: Checked-in AND ClinicalVisit finalized
        $completedAppt = Appointment::create([
            'id' => (string) Str::uuid(),
            'booking_reference' => 'REF-COMPLETED-1',
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->name,
            'patient_phone' => $this->patient->phone,
            'created_by_id' => $this->doctorUser->id,
            'appointment_date' => $today,
            'time_slot' => '11:00',
            'status' => 'attended',
            'checked_in_at' => now()->subMinutes(50),
        ]);
        ClinicalVisit::create([
            'id' => (string) Str::uuid(),
            'visit_reference' => 'VIS-COMPLETED-1',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'appointment_id' => $completedAppt->id,
            'visit_date' => $today,
            'chief_complaint' => 'صداع مستمر',
            'diagnosis' => 'صداع توتري',
            'status' => 'finalized',
            'finalized_at' => now()->subMinutes(10),
            'finalized_by_id' => $this->doctorUser->id,
        ]);

        // 5. Direct Walk-in Finalized Visit (No appointment)
        ClinicalVisit::create([
            'id' => (string) Str::uuid(),
            'visit_reference' => 'VIS-WALKIN-1',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'appointment_id' => null,
            'visit_date' => $today,
            'chief_complaint' => 'حالة مستعجلة',
            'diagnosis' => 'نزلة معوية حادة',
            'status' => 'finalized',
            'finalized_at' => now()->subMinutes(5),
            'finalized_by_id' => $this->doctorUser->id,
        ]);

        // 6. No-show appointment
        Appointment::create([
            'id' => (string) Str::uuid(),
            'booking_reference' => 'REF-NOSHOW-1',
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->name,
            'patient_phone' => $this->patient->phone,
            'created_by_id' => $this->doctorUser->id,
            'appointment_date' => $today,
            'time_slot' => '12:00',
            'status' => 'no_show',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->doctorToken}")
            ->getJson("/api/v1/doctor/stats?date={$today}");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'today_total' => 5, // 5 scheduled appointments (pending + confirmed + waiting + completed_appt + no_show)
                    'pending_check_in' => 2, // pending (1) + confirmed (1)
                    'in_waiting_room' => 1, // attended without finalized visit
                    'completed_today' => 2, // 1 with appointment + 1 walk-in
                    'no_show_today' => 1,
                    'active_clinic_id' => $this->clinicA->id,
                    'active_clinic_name' => $this->clinicA->name,
                    'date' => $today,
                ],
            ]);
    }

    /**
     * 9. Custom date query parameter correctly filters statistics by target calendar day.
     */
    public function test_custom_date_query_parameter(): void
    {
        DoctorClinic::create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'position' => 'doctor',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now(),
        ]);

        $futureDate = '2026-11-20';

        Appointment::create([
            'id' => (string) Str::uuid(),
            'booking_reference' => 'REF-FUTURE-1',
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->name,
            'patient_phone' => $this->patient->phone,
            'created_by_id' => $this->doctorUser->id,
            'appointment_date' => $futureDate,
            'time_slot' => '09:00',
            'status' => 'pending',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->doctorToken}")
            ->getJson("/api/v1/doctor/stats?date={$futureDate}");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'today_total' => 1,
                    'pending_check_in' => 1,
                    'in_waiting_room' => 0,
                    'completed_today' => 0,
                    'no_show_today' => 0,
                    'date' => $futureDate,
                ],
            ]);
    }
}
