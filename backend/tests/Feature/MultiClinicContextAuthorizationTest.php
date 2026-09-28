<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicalVisit;
use App\Models\DiagnosticCenter;
use App\Models\DiagnosticOrder;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MultiClinicContextAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected string $doctorToken;

    protected Clinic $clinicA;
    protected Clinic $clinicB;
    protected Clinic $clinicC;
    protected Clinic $unrelatedClinic;

    protected Patient $patientA;
    protected Patient $patientB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        // 1. Create Multi-Clinic Doctor D
        $this->doctorUser = User::factory()->create([
            'email' => 'multi.doctor@aafiya.dz',
            'is_active' => true,
        ]);
        $this->doctorUser->assignRole('doctor');

        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'license_number' => 'LIC-MULTI-DOC-007',
            'specialty' => 'Internal Medicine',
            'is_verified' => true,
        ]);

        $this->doctorToken = $this->doctorUser->createToken('test-token')->plainTextToken;

        // 2. Clinic A (Doctor is Director and Active)
        $this->clinicA = Clinic::create([
            'name' => 'عيادة الشفاء المركزية (Clinic A)',
            'address' => 'شارع ديدوش مراد، الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'phone' => '+21321000001',
            'director_doctor_id' => $this->doctor->id,
            'is_active' => true,
        ]);
        DoctorClinic::create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now()->subMonths(6),
        ]);

        // 3. Clinic B (Doctor is Employed Doctor and Active)
        $dirBUser = User::factory()->create(['email' => 'dir_b@aafiya.dz', 'is_active' => true]);
        $dirBUser->assignRole('doctor');
        $dirBDoctor = Doctor::create([
            'user_id' => $dirBUser->id,
            'license_number' => 'LIC-DIR-B-001',
            'specialty' => 'Cardiology',
            'is_verified' => true,
        ]);
        $this->clinicB = Clinic::create([
            'name' => 'عيادة النور الخاصة (Clinic B)',
            'address' => 'حي الياسمين، وهران',
            'wilaya' => 'وهران',
            'phone' => '+21341000002',
            'director_doctor_id' => $dirBDoctor->id,
            'is_active' => true,
        ]);
        DoctorClinic::create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicB->id,
            'position' => 'doctor',
            'is_primary' => false,
            'is_active' => true,
            'joined_at' => now()->subMonths(3),
        ]);

        // 4. Clinic C (Doctor is Employed Doctor and Suspended)
        $dirCUser = User::factory()->create(['email' => 'dir_c@aafiya.dz', 'is_active' => true]);
        $dirCUser->assignRole('doctor');
        $dirCDoctor = Doctor::create([
            'user_id' => $dirCUser->id,
            'license_number' => 'LIC-DIR-C-001',
            'specialty' => 'Pediatrics',
            'is_verified' => true,
        ]);
        $this->clinicC = Clinic::create([
            'name' => 'عيادة الأمل (Clinic C)',
            'address' => 'نهج الاستقلال، قسنطينة',
            'wilaya' => 'قسنطينة',
            'phone' => '+21331000003',
            'director_doctor_id' => $dirCDoctor->id,
            'is_active' => true,
        ]);
        DoctorClinic::create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicC->id,
            'position' => 'doctor',
            'is_primary' => false,
            'is_active' => false, // Suspended!
            'joined_at' => now()->subMonths(1),
        ]);

        // 5. Unrelated Clinic (Doctor has zero affiliation)
        $dirUnrelatedUser = User::factory()->create(['email' => 'dir_unrelated@aafiya.dz', 'is_active' => true]);
        $dirUnrelatedUser->assignRole('doctor');
        $dirUnrelatedDoc = Doctor::create([
            'user_id' => $dirUnrelatedUser->id,
            'license_number' => 'LIC-DIR-UNRELATED',
            'specialty' => 'Dermatology',
            'is_verified' => true,
        ]);
        $this->unrelatedClinic = Clinic::create([
            'name' => 'عيادة غريبة (Unrelated Clinic)',
            'address' => 'عنابة',
            'wilaya' => 'عنابة',
            'phone' => '+21338000004',
            'director_doctor_id' => $dirUnrelatedDoc->id,
            'is_active' => true,
        ]);

        // 6. Patients
        $this->patientA = Patient::create([
            'mrn' => 'MRN-2026-A001',
            'first_name' => 'أحمد',
            'last_name' => 'بن علي',
            'gender' => 'male',
            'date_of_birth' => '1990-05-20',
            'phone' => '0555111111',
        ]);

        $this->patientB = Patient::create([
            'mrn' => 'MRN-2026-B002',
            'first_name' => 'فاطمة',
            'last_name' => 'الزهراء',
            'gender' => 'female',
            'date_of_birth' => '1995-11-10',
            'phone' => '0555222222',
        ]);
    }

    /**
     * TEST 1 — Multiple Active Clinics
     * Doctor has Clinic A (active) and Clinic B (active). GET /doctor/clinics returns both.
     */
    public function test_01_multiple_active_clinics_are_retrieved(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->doctorToken}")
            ->getJson('/api/v1/doctor/clinics');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(3, 'data'); // Clinics A, B, and C

        $clinicIds = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($this->clinicA->id, $clinicIds);
        $this->assertContains($this->clinicB->id, $clinicIds);
        $this->assertContains($this->clinicC->id, $clinicIds);
        $this->assertNotContains($this->unrelatedClinic->id, $clinicIds);
    }

    /**
     * TEST 2 — Suspended Clinic Listed with is_active = false
     * Doctor has Clinic C suspended. It is listed as is_active = false, but cannot be used as active context.
     */
    public function test_02_suspended_clinic_is_listed_as_inactive_and_denied_as_active_context(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->doctorToken}")
            ->getJson('/api/v1/doctor/clinics');

        $response->assertStatus(200);
        $clinicCData = collect($response->json('data'))->firstWhere('id', $this->clinicC->id);
        $this->assertNotNull($clinicCData);
        $this->assertFalse($clinicCData['is_active']);

        // Attempt to access operational endpoint with suspended clinic context
        $operationalRes = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicC->id,
        ])->getJson('/api/v1/appointments');

        $operationalRes->assertStatus(403);
    }

    /**
     * TEST 3 — Unauthorized Clinic (No Affiliation)
     * Doctor sends X-Clinic-ID for an unrelated clinic. Expected: 403 Forbidden.
     */
    public function test_03_unauthorized_unrelated_clinic_context_returns_403(): void
    {
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->unrelatedClinic->id,
        ])->getJson('/api/v1/appointments');

        $response->assertStatus(403)
            ->assertJsonPath('status', 'error');
    }

    /**
     * TEST 4 — Suspended Clinic Context Returns 403
     */
    public function test_04_suspended_clinic_context_returns_403(): void
    {
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicC->id,
        ])->getJson('/api/v1/clinical-visits');

        $response->assertStatus(403);
    }

    /**
     * TEST 5 — Appointment Isolation
     * Create appointments in Clinic A and Clinic B. With X-Clinic-ID: A, only A is returned.
     */
    public function test_05_appointment_isolation_between_clinics(): void
    {
        $aptA = Appointment::create([
            'booking_reference' => 'BK-2026-0001',
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'Patient in A',
            'patient_phone' => '0770000001',
            'appointment_date' => now()->addDay()->format('Y-m-d'),
            'time_slot' => '09:00',
            'status' => 'confirmed',
            'booking_type' => 'individual_online',
            'created_by_id' => $this->doctorUser->id,
            'creator_type' => 'doctor',
        ]);

        $aptB = Appointment::create([
            'booking_reference' => 'BK-2026-0002',
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'Patient in B',
            'patient_phone' => '0770000002',
            'appointment_date' => now()->addDay()->format('Y-m-d'),
            'time_slot' => '10:00',
            'status' => 'confirmed',
            'booking_type' => 'individual_online',
            'created_by_id' => $this->doctorUser->id,
            'creator_type' => 'doctor',
        ]);

        // Query Clinic A appointments
        $resA = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicA->id,
        ])->getJson('/api/v1/appointments');

        $resA->assertStatus(200);
        $idsA = collect($resA->json('data'))->pluck('id')->all();
        $this->assertContains($aptA->id, $idsA);
        $this->assertNotContains($aptB->id, $idsA);

        // Query Clinic B appointments
        $resB = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson('/api/v1/appointments');

        $resB->assertStatus(200);
        $idsB = collect($resB->json('data'))->pluck('id')->all();
        $this->assertContains($aptB->id, $idsB);
        $this->assertNotContains($aptA->id, $idsB);
    }

    /**
     * TEST 6 — Clinical Visit Isolation
     * Clinic A visits must not appear in Clinic B context and vice versa.
     */
    public function test_06_clinical_visit_isolation_between_clinics(): void
    {
        $visitA = ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-A001',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'visit_date' => now()->format('Y-m-d'),
            'chief_complaint' => 'Visit A Complaint',
            'status' => 'draft',
        ]);

        $visitB = ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-B002',
            'patient_id' => $this->patientB->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicB->id,
            'visit_date' => now()->format('Y-m-d'),
            'chief_complaint' => 'Visit B Complaint',
            'status' => 'draft',
        ]);

        // In Clinic A context
        $resA = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicA->id,
        ])->getJson('/api/v1/clinical-visits');

        $resA->assertStatus(200);
        $idsA = collect($resA->json('data'))->pluck('id')->all();
        $this->assertContains($visitA->id, $idsA);
        $this->assertNotContains($visitB->id, $idsA);

        // In Clinic B context
        $resB = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson('/api/v1/clinical-visits');

        $resB->assertStatus(200);
        $idsB = collect($resB->json('data'))->pluck('id')->all();
        $this->assertContains($visitB->id, $idsB);
        $this->assertNotContains($visitA->id, $idsB);
    }

    /**
     * TEST 7 — Prescription Isolation
     */
    public function test_07_prescription_isolation_between_clinics(): void
    {
        $rxA = Prescription::create([
            'prescription_reference' => 'RX-2026-A001',
            'secure_token' => \Illuminate\Support\Str::random(64),
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'issue_date' => now()->format('Y-m-d'),
            'expiry_date' => now()->addDays(30)->format('Y-m-d'),
            'status' => 'active',
        ]);

        $rxB = Prescription::create([
            'prescription_reference' => 'RX-2026-B002',
            'secure_token' => \Illuminate\Support\Str::random(64),
            'patient_id' => $this->patientB->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicB->id,
            'issue_date' => now()->format('Y-m-d'),
            'expiry_date' => now()->addDays(30)->format('Y-m-d'),
            'status' => 'active',
        ]);

        // Clinic A
        $resA = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicA->id,
        ])->getJson('/api/v1/prescriptions');

        $resA->assertStatus(200);
        $idsA = collect($resA->json('data'))->pluck('id')->all();
        $this->assertContains($rxA->id, $idsA);
        $this->assertNotContains($rxB->id, $idsA);

        // Clinic B
        $resB = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson('/api/v1/prescriptions');

        $resB->assertStatus(200);
        $idsB = collect($resB->json('data'))->pluck('id')->all();
        $this->assertContains($rxB->id, $idsB);
        $this->assertNotContains($rxA->id, $idsB);
    }

    /**
     * TEST 8 — Diagnostic Order Isolation
     */
    public function test_08_diagnostic_order_isolation_between_clinics(): void
    {
        $centerUser = User::factory()->create(['email' => 'lab_center@aafiya.dz']);
        $centerUser->assignRole('lab');

        $center = DiagnosticCenter::create([
            'user_id' => $centerUser->id,
            'name' => 'مختبر الجزائر المركزي',
            'type' => 'lab',
            'address' => 'الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '021000000',
            'is_active' => true,
        ]);

        $orderA = DiagnosticOrder::create([
            'order_reference' => 'ORD-2026-A001',
            'secure_token' => \Illuminate\Support\Str::random(64),
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'diagnostic_center_id' => $center->id,
            'order_type' => 'lab',
            'status' => 'draft',
            'ordered_at' => now(),
        ]);

        $orderB = DiagnosticOrder::create([
            'order_reference' => 'ORD-2026-B002',
            'secure_token' => \Illuminate\Support\Str::random(64),
            'patient_id' => $this->patientB->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicB->id,
            'diagnostic_center_id' => $center->id,
            'order_type' => 'lab',
            'status' => 'draft',
            'ordered_at' => now(),
        ]);

        // Clinic A
        $resA = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicA->id,
        ])->getJson('/api/v1/diagnostic-orders');

        $resA->assertStatus(200);
        $idsA = collect($resA->json('data'))->pluck('id')->all();
        $this->assertContains($orderA->id, $idsA);
        $this->assertNotContains($orderB->id, $idsA);

        // Clinic B
        $resB = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson('/api/v1/diagnostic-orders');

        $resB->assertStatus(200);
        $idsB = collect($resB->json('data'))->pluck('id')->all();
        $this->assertContains($orderB->id, $idsB);
        $this->assertNotContains($orderA->id, $idsB);
    }

    /**
     * TEST 9 — Patient Isolation
     * Patient B (who only has records in Clinic B) must not be accessible in Clinic A.
     */
    public function test_09_patient_isolation_between_clinics(): void
    {
        // Bind Patient B to Clinic B via visit
        ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-PATB',
            'patient_id' => $this->patientB->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicB->id,
            'visit_date' => now()->format('Y-m-d'),
            'chief_complaint' => 'Patient B clinic B record',
            'status' => 'draft',
        ]);

        // In Clinic A context, querying Patient B detail returns 403
        $resA = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicA->id,
        ])->getJson("/api/v1/patients/{$this->patientB->id}");

        $resA->assertStatus(403);

        // In Clinic B context, querying Patient B detail succeeds
        $resB = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson("/api/v1/patients/{$this->patientB->id}");

        $resB->assertStatus(200);
    }

    /**
     * TEST 10 — Suspended Write
     * Creating clinical visit or prescription in suspended Clinic C must return 403.
     */
    public function test_10_suspended_doctor_cannot_write_clinical_data(): void
    {
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicC->id,
        ])->postJson('/api/v1/clinical-visits', [
            'clinic_id' => $this->clinicC->id,
            'patient_id' => $this->patientA->id,
            'chief_complaint' => 'Attempted visit in suspended clinic',
        ]);

        $response->assertStatus(403);
    }

    /**
     * TEST 11 — Director / Employed Context Switching
     */
    public function test_11_director_and_employed_context_switching(): void
    {
        // Clinic A context: Doctor is Director
        $resA = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicA->id,
        ])->getJson('/api/v1/auth/me');

        $resA->assertStatus(200)
            ->assertJsonPath('data.clinic.position', 'director')
            ->assertJsonPath('data.clinic.is_director', true);

        $this->assertContains('clinic.manage_settings', $resA->json('data.permissions'));
        $this->assertContains('clinic.create_staff', $resA->json('data.permissions'));

        // Clinic B context: Doctor is Employed Doctor
        $resB = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson('/api/v1/auth/me');

        $resB->assertStatus(200)
            ->assertJsonPath('data.clinic.position', 'doctor')
            ->assertJsonPath('data.clinic.is_director', false);

        $this->assertNotContains('clinic.manage_settings', $resB->json('data.permissions'));
        $this->assertNotContains('clinic.create_staff', $resB->json('data.permissions'));
    }

    /**
     * TEST 12 — Director Privilege Non-Leakage
     * In Clinic B context, director actions are strictly denied even though Clinic A is primary.
     */
    public function test_12_director_privileges_do_not_leak_into_employed_clinic_context(): void
    {
        $assistantUser = User::factory()->create();

        // Attempt staff operation on Clinic B
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->postJson("/api/v1/clinics/{$this->clinicB->id}/assistants", [
            'name' => 'Assistant in B',
            'email' => 'assistant_b@clinic.dz',
            'phone' => '0555999888',
            'password' => 'Password123!',
        ]);

        $response->assertStatus(403);
    }

    /**
     * TEST 13 — Reverse Switching (B -> A) Restores Director Permissions
     */
    public function test_13_reverse_switching_restores_director_permissions(): void
    {
        // 1. Switch to B
        $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson('/api/v1/auth/me')->assertJsonPath('data.clinic.is_director', false);

        // 2. Switch back to A
        $resA = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicA->id,
        ])->getJson('/api/v1/auth/me');

        $resA->assertStatus(200)
            ->assertJsonPath('data.clinic.is_director', true)
            ->assertJsonPath('data.clinic.position', 'director');

        $this->assertContains('clinic.create_staff', $resA->json('data.permissions'));
    }

    /**
     * TEST 14 — Missing Context Fails Closed for Multi-Clinic Doctor
     */
    public function test_14_missing_clinic_context_fails_closed_for_multi_clinic_doctor(): void
    {
        // Calling appointments without X-Clinic-ID header for multi-clinic doctor
        $response = $this->withHeader('Authorization', "Bearer {$this->doctorToken}")
            ->getJson('/api/v1/appointments');

        $response->assertStatus(403)
            ->assertJsonPath('status', 'error');
    }

    /**
     * TEST 15 — Invalid UUID Handled Gracefully with 422
     */
    public function test_15_invalid_uuid_returns_controlled_422(): void
    {
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => 'invalid-not-a-uuid',
        ])->getJson('/api/v1/appointments');

        $response->assertStatus(422)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('code', 422);
    }

    /**
     * TEST 16 — Direct Resource Cross-Clinic Access Denied for Appointments (Test A)
     * Doctor X owns appointment in Clinic A. Active Clinic = Clinic B.
     * GET /appointments/{clinic_A_appointment} -> 403 Forbidden.
     */
    public function test_16_direct_resource_cross_clinic_access_denied_for_appointment(): void
    {
        $aptA = Appointment::create([
            'booking_reference' => 'BK-2026-XCL-01',
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'Patient in Clinic A',
            'patient_phone' => '0770999001',
            'appointment_date' => now()->addDay()->format('Y-m-d'),
            'time_slot' => '09:00',
            'status' => 'confirmed',
            'booking_type' => 'individual_online',
            'created_by_id' => $this->doctorUser->id,
            'creator_type' => 'doctor',
        ]);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson("/api/v1/appointments/{$aptA->id}");

        $response->assertStatus(403);
    }

    /**
     * TEST 17 — Direct Resource Cross-Clinic Access Denied for Prescriptions (Test B)
     * Doctor X owns prescription in Clinic A. Active Clinic = Clinic B.
     * GET /prescriptions/{clinic_A_prescription} -> 403 Forbidden.
     */
    public function test_17_direct_resource_cross_clinic_access_denied_for_prescription(): void
    {
        $rxA = Prescription::create([
            'prescription_reference' => 'RX-2026-XCL-01',
            'secure_token' => \Illuminate\Support\Str::random(64),
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'issue_date' => now()->format('Y-m-d'),
            'expiry_date' => now()->addDays(30)->format('Y-m-d'),
            'status' => 'active',
        ]);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson("/api/v1/prescriptions/{$rxA->id}");

        $response->assertStatus(403);
    }

    /**
     * TEST 18 — Direct Resource Cross-Clinic Access Denied for Clinical Visits (Test C)
     * Doctor X has clinical visit in Clinic A. Active Clinic = Clinic B.
     * GET /clinical-visits/{clinic_A_visit} -> 403 Forbidden.
     */
    public function test_18_direct_resource_cross_clinic_access_denied_for_clinical_visit(): void
    {
        $visitA = ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-XCL-01',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'visit_date' => now()->format('Y-m-d'),
            'chief_complaint' => 'Visit A Cross Clinic Complaint',
            'status' => 'draft',
        ]);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson("/api/v1/clinical-visits/{$visitA->id}");

        $response->assertStatus(403);
    }

    /**
     * TEST 19 — Direct Resource Access Restored When Switching Back to Owning Clinic (Test D)
     * Active Clinic = Clinic A. Resources become fully accessible according to their rules.
     */
    public function test_19_direct_resource_access_restored_when_switching_back_to_owning_clinic(): void
    {
        $aptA = Appointment::create([
            'booking_reference' => 'BK-2026-XCL-02',
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'Patient in Clinic A Restored',
            'patient_phone' => '0770999002',
            'appointment_date' => now()->addDay()->format('Y-m-d'),
            'time_slot' => '11:00',
            'status' => 'confirmed',
            'booking_type' => 'individual_online',
            'created_by_id' => $this->doctorUser->id,
            'creator_type' => 'doctor',
        ]);

        $rxA = Prescription::create([
            'prescription_reference' => 'RX-2026-XCL-02',
            'secure_token' => \Illuminate\Support\Str::random(64),
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'issue_date' => now()->format('Y-m-d'),
            'expiry_date' => now()->addDays(30)->format('Y-m-d'),
            'status' => 'active',
        ]);

        $visitA = ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-XCL-02',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'visit_date' => now()->format('Y-m-d'),
            'chief_complaint' => 'Restored Visit A Complaint',
            'diagnosis' => 'Normal Examination',
            'status' => 'draft',
        ]);

        // 1. In Clinic B context -> all 3 return 403
        $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson("/api/v1/appointments/{$aptA->id}")->assertStatus(403);

        $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson("/api/v1/prescriptions/{$rxA->id}")->assertStatus(403);

        $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson("/api/v1/clinical-visits/{$visitA->id}")->assertStatus(403);

        // 2. Switch back to Clinic A context -> all 3 succeed with 200 OK
        $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicA->id,
        ])->getJson("/api/v1/appointments/{$aptA->id}")->assertStatus(200);

        $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicA->id,
        ])->getJson("/api/v1/prescriptions/{$rxA->id}")->assertStatus(200);

        $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicA->id,
        ])->getJson("/api/v1/clinical-visits/{$visitA->id}")->assertStatus(200);
    }

    /**
     * TEST 20 — Director Can Create Employed Doctor and Assistant in Directed Clinic
     */
    public function test_20_director_can_create_employed_doctor_and_assistant_in_directed_clinic(): void
    {
        // 1. Director creates employed doctor in Clinic A
        $docRes = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicA->id,
        ])->postJson("/api/v1/clinics/{$this->clinicA->id}/doctors", [
            'name' => 'د. حسام الدين الجديد',
            'email' => 'dr.houssam.new@aafiya.dz',
            'phone' => '0555778899',
            'password' => 'Password123!',
            'specialty' => 'Dermatology',
            'license_number' => 'LIC-ALG-2026-EMP01',
        ]);

        $docRes->assertStatus(201);
        $newDoctorId = $docRes->json('data.clinic.doctors.0.id');
        $this->assertDatabaseHas('doctor_clinic', [
            'clinic_id' => $this->clinicA->id,
            'position' => 'doctor',
            'is_primary' => false,
        ]);

        // 2. Director creates assistant in Clinic A
        $astRes = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicA->id,
        ])->postJson("/api/v1/clinics/{$this->clinicA->id}/assistants", [
            'name' => 'مساعد العيادة الجديد',
            'email' => 'assistant.new@aafiya.dz',
            'phone' => '0555112233',
            'password' => 'Password123!',
            'permissions_json' => ['booking.manage_queue', 'booking.confirm_attendance'],
        ]);

        $astRes->assertStatus(201);
        $this->assertDatabaseHas('clinic_assistants', [
            'clinic_id' => $this->clinicA->id,
            'is_active' => true,
        ]);
    }

    /**
     * TEST 21 — Employed Doctor Denied Staff and Assistant Creation in Employed Clinic
     */
    public function test_21_employed_doctor_denied_staff_and_assistant_creation_in_employed_clinic(): void
    {
        // 1. Employed doctor in Clinic B attempts to create employed doctor -> 403 Forbidden
        $docRes = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->postJson("/api/v1/clinics/{$this->clinicB->id}/doctors", [
            'name' => 'د. محاولة غير مصرحة',
            'email' => 'dr.unauth.attempt@aafiya.dz',
            'phone' => '0555000999',
            'password' => 'Password123!',
            'specialty' => 'Cardiology',
            'license_number' => 'LIC-UNAUTH-EMP',
        ]);

        $docRes->assertStatus(403);

        // 2. Employed doctor in Clinic B attempts to create assistant -> 403 Forbidden
        $astRes = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->postJson("/api/v1/clinics/{$this->clinicB->id}/assistants", [
            'name' => 'مساعد محاولة غير مصرحة',
            'email' => 'assistant.unauth@aafiya.dz',
            'phone' => '0555000888',
            'password' => 'Password123!',
        ]);

        $astRes->assertStatus(403);

        // 3. Employed doctor in Clinic B attempts to update clinic settings -> 403 Forbidden
        $setRes = $this->withHeaders([
            'Authorization' => "Bearer {$this->doctorToken}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->putJson("/api/v1/clinics/{$this->clinicB->id}", [
            'name' => 'اسم عيادة معدل بدون تصريح',
        ]);

        $setRes->assertStatus(403);
    }
}
