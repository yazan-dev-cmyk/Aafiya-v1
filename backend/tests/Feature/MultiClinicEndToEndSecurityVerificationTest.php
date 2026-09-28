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
use App\Models\ClinicDoctorInvitation;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * EV-D00-007-D: Multi-Clinic End-to-End Security, Authorization & UX Verification Gate
 *
 * Validates the core scenario:
 * ONE USER -> ONE DOCTOR -> Clinic A (Director), Clinic B (Employed), Clinic C (Suspended)
 * Plus cross-clinic isolation, permission switching, and invitation lifecycle.
 */
class MultiClinicEndToEndSecurityVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected string $doctorToken;

    protected Clinic $clinicA;
    protected Clinic $clinicB;
    protected Clinic $clinicC;
    protected Clinic $unrelatedClinic;

    protected Doctor $dirBDoctor;
    protected User $dirBUser;
    protected Doctor $dirCDoctor;
    protected User $dirCUser;

    protected Patient $patientA;
    protected Patient $patientB;

    protected DiagnosticCenter $diagnosticCenter;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        // 1. Doctor D (Single Platform Identity)
        $this->doctorUser = User::factory()->create([
            'name' => 'د. خالد بن عيسى',
            'email' => 'dr.khaled@aafiya.dz',
            'is_active' => true,
        ]);
        $this->doctorUser->assignRole('doctor');

        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'license_number' => 'LIC-DZ-2026-007',
            'specialty' => 'Internal Medicine',
            'is_verified' => true,
        ]);

        $this->doctorToken = $this->doctorUser->createToken('test-token')->plainTextToken;

        // 2. Clinic A (Doctor D is Director and Active)
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

        // 3. Clinic B (Doctor D is Employed Doctor and Active)
        $this->dirBUser = User::factory()->create(['name' => 'د. مصطفى حسان', 'email' => 'dir_b@aafiya.dz', 'is_active' => true]);
        $this->dirBUser->assignRole('doctor');
        $this->dirBDoctor = Doctor::create([
            'user_id' => $this->dirBUser->id,
            'license_number' => 'LIC-DIR-B-001',
            'specialty' => 'Cardiology',
            'is_verified' => true,
        ]);
        $this->clinicB = Clinic::create([
            'name' => 'عيادة النور الخاصة (Clinic B)',
            'address' => 'حي الياسمين، وهران',
            'wilaya' => 'وهران',
            'phone' => '+21341000002',
            'director_doctor_id' => $this->dirBDoctor->id,
            'is_active' => true,
        ]);
        DoctorClinic::create([
            'doctor_id' => $this->dirBDoctor->id,
            'clinic_id' => $this->clinicB->id,
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now()->subMonths(6),
        ]);
        DoctorClinic::create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicB->id,
            'position' => 'doctor',
            'is_primary' => false,
            'is_active' => true,
            'joined_at' => now()->subMonths(3),
        ]);

        // 4. Clinic C (Doctor D is Employed Doctor and Suspended)
        $this->dirCUser = User::factory()->create(['name' => 'د. كريم تلمساني', 'email' => 'dir_c@aafiya.dz', 'is_active' => true]);
        $this->dirCUser->assignRole('doctor');
        $this->dirCDoctor = Doctor::create([
            'user_id' => $this->dirCUser->id,
            'license_number' => 'LIC-DIR-C-001',
            'specialty' => 'Pediatrics',
            'is_verified' => true,
        ]);
        $this->clinicC = Clinic::create([
            'name' => 'عيادة الأمل (Clinic C)',
            'address' => 'نهج الاستقلال، قسنطينة',
            'wilaya' => 'قسنطينة',
            'phone' => '+21331000003',
            'director_doctor_id' => $this->dirCDoctor->id,
            'is_active' => true,
        ]);
        DoctorClinic::create([
            'doctor_id' => $this->dirCDoctor->id,
            'clinic_id' => $this->clinicC->id,
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now()->subMonths(6),
        ]);
        DoctorClinic::create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicC->id,
            'position' => 'doctor',
            'is_primary' => false,
            'is_active' => false, // Suspended!
            'joined_at' => now()->subMonths(1),
        ]);

        // 5. Unrelated Clinic
        $dirUnrelatedUser = User::factory()->create(['name' => 'د. علي بوزيد', 'email' => 'dir_unrelated@aafiya.dz', 'is_active' => true]);
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

        // 7. Diagnostic Center
        $centerUser = User::factory()->create(['email' => 'diagnostic_center@aafiya.dz']);
        $centerUser->assignRole('lab');
        $this->diagnosticCenter = DiagnosticCenter::create([
            'user_id' => $centerUser->id,
            'name' => 'مركز الفحص المخبري والأشعة المرجعي',
            'address' => 'الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'phone' => '+21321999888',
            'type' => 'both',
            'is_active' => true,
        ]);
    }

    /**
     * AC-01: One User = One Doctor Invariant Preserved across Multiple Clinics.
     */
    public function test_ac01_one_user_one_doctor_many_clinics_invariant(): void
    {
        $this->assertEquals(1, User::where('email', 'dr.khaled@aafiya.dz')->count());
        $this->assertEquals(1, Doctor::where('user_id', $this->doctorUser->id)->count());

        $affiliations = DoctorClinic::where('doctor_id', $this->doctor->id)->get();
        $this->assertCount(3, $affiliations);

        $this->assertTrue($affiliations->where('clinic_id', $this->clinicA->id)->first()->is_active);
        $this->assertEquals('director', $affiliations->where('clinic_id', $this->clinicA->id)->first()->position);

        $this->assertTrue($affiliations->where('clinic_id', $this->clinicB->id)->first()->is_active);
        $this->assertEquals('doctor', $affiliations->where('clinic_id', $this->clinicB->id)->first()->position);

        $this->assertFalse($affiliations->where('clinic_id', $this->clinicC->id)->first()->is_active);
        $this->assertEquals('doctor', $affiliations->where('clinic_id', $this->clinicC->id)->first()->position);
    }

    /**
     * AC-02: Doctor can retrieve all affiliated clinics via GET /api/v1/doctor/clinics.
     */
    public function test_ac02_multiple_clinic_memberships_retrieval(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->doctorToken)
            ->getJson('/api/v1/doctor/clinics');

        $response->assertStatus(200);
        $response->assertJsonCount(3, 'data');

        $data = collect($response->json('data'));

        $itemA = $data->firstWhere('id', $this->clinicA->id);
        $this->assertNotNull($itemA);
        $this->assertEquals('director', $itemA['position']);
        $this->assertTrue($itemA['is_active']);

        $itemB = $data->firstWhere('id', $this->clinicB->id);
        $this->assertNotNull($itemB);
        $this->assertEquals('doctor', $itemB['position']);
        $this->assertTrue($itemB['is_active']);

        $itemC = $data->firstWhere('id', $this->clinicC->id);
        $this->assertNotNull($itemC);
        $this->assertEquals('doctor', $itemC['position']);
        $this->assertFalse($itemC['is_active']);
    }

    /**
     * AC-03: Active Clinic Context is strictly enforced via X-Clinic-ID.
     */
    public function test_ac03_active_clinic_context_enforcement(): void
    {
        // Clinic A Context -> Director
        $resA = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicA->id,
        ])->getJson('/api/v1/auth/me');

        $resA->assertStatus(200);
        $resA->assertJsonPath('data.clinic.id', $this->clinicA->id);
        $resA->assertJsonPath('data.clinic.is_director', true);

        // Clinic B Context -> Employed Doctor
        $resB = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson('/api/v1/auth/me');

        $resB->assertStatus(200);
        $resB->assertJsonPath('data.clinic.id', $this->clinicB->id);
        $resB->assertJsonPath('data.clinic.is_director', false);
    }

    /**
     * AC-04 & AC-05: Suspended clinic and unrelated clinic return 403 Forbidden on operational endpoints.
     */
    public function test_ac04_ac05_suspended_and_unrelated_clinics_return_403(): void
    {
        // Suspended Clinic C Context -> 403 on operational endpoint
        $resSuspended = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicC->id,
        ])->getJson('/api/v1/appointments');

        $resSuspended->assertStatus(403);
        $this->assertStringContainsString('تعليق', $resSuspended->json('message'));

        // Unrelated Clinic Context -> 403 on operational endpoint
        $resUnrelated = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->unrelatedClinic->id,
        ])->getJson('/api/v1/appointments');

        $resUnrelated->assertStatus(403);
        $this->assertStringContainsString('غير منتسب', $resUnrelated->json('message'));
    }

    /**
     * AC-06: Missing clinic context fails closed for multi-clinic doctor.
     */
    public function test_ac06_missing_context_fails_closed_for_multi_clinic_doctor(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->doctorToken)
            ->getJson('/api/v1/appointments');

        $response->assertStatus(403);
        $this->assertStringContainsString('X-Clinic-ID', $response->json('message'));
    }

    /**
     * AC-07: Appointments are strictly isolated between clinics.
     */
    public function test_ac07_appointment_isolation(): void
    {
        // Create appointment in Clinic A
        $appA = Appointment::create([
            'booking_reference' => 'BK-2026-A001',
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patientA->id,
            'patient_name' => 'Patient in A',
            'patient_phone' => '0770000001',
            'appointment_date' => now()->addDay()->format('Y-m-d'),
            'time_slot' => '09:00',
            'status' => 'confirmed',
            'booking_type' => 'individual_online',
            'created_by_id' => $this->doctorUser->id,
            'creator_type' => 'doctor',
            'notes' => 'Appointment for Clinic A',
        ]);

        // Create appointment in Clinic B
        $appB = Appointment::create([
            'booking_reference' => 'BK-2026-B002',
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patientB->id,
            'patient_name' => 'Patient in B',
            'patient_phone' => '0770000002',
            'appointment_date' => now()->addDay()->format('Y-m-d'),
            'time_slot' => '11:00',
            'status' => 'confirmed',
            'booking_type' => 'individual_online',
            'created_by_id' => $this->doctorUser->id,
            'creator_type' => 'doctor',
            'notes' => 'Appointment for Clinic B',
        ]);

        // Query with Clinic A Context -> ONLY Appointment A
        $resA = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicA->id,
        ])->getJson('/api/v1/appointments');

        $resA->assertStatus(200);
        $idsA = collect($resA->json('data'))->pluck('id')->all();
        $this->assertContains($appA->id, $idsA);
        $this->assertNotContains($appB->id, $idsA);

        // Query with Clinic B Context -> ONLY Appointment B
        $resB = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson('/api/v1/appointments');

        $resB->assertStatus(200);
        $idsB = collect($resB->json('data'))->pluck('id')->all();
        $this->assertContains($appB->id, $idsB);
        $this->assertNotContains($appA->id, $idsB);
    }

    /**
     * AC-08: Clinical visits are strictly isolated between clinics.
     */
    public function test_ac08_clinical_visit_isolation(): void
    {
        $visitA = ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-A001',
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patientA->id,
            'visit_date' => now()->format('Y-m-d'),
            'chief_complaint' => 'Chest pain in Clinic A',
            'status' => 'in_progress',
        ]);

        $visitB = ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-B002',
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patientB->id,
            'visit_date' => now()->format('Y-m-d'),
            'chief_complaint' => 'Headache in Clinic B',
            'status' => 'in_progress',
        ]);

        // Query Clinic A -> ONLY Visit A
        $resA = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicA->id,
        ])->getJson('/api/v1/clinical-visits');

        $resA->assertStatus(200);
        $idsA = collect($resA->json('data'))->pluck('id')->all();
        $this->assertContains($visitA->id, $idsA);
        $this->assertNotContains($visitB->id, $idsA);

        // Query Clinic B -> ONLY Visit B
        $resB = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson('/api/v1/clinical-visits');

        $resB->assertStatus(200);
        $idsB = collect($resB->json('data'))->pluck('id')->all();
        $this->assertContains($visitB->id, $idsB);
        $this->assertNotContains($visitA->id, $idsB);
    }

    /**
     * AC-09: Prescriptions are strictly isolated between clinics.
     */
    public function test_ac09_prescription_isolation(): void
    {
        $rxA = Prescription::create([
            'prescription_reference' => 'RX-2026-A001',
            'secure_token' => Str::random(64),
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patientA->id,
            'issue_date' => now()->format('Y-m-d'),
            'expiry_date' => now()->addDays(30)->format('Y-m-d'),
            'status' => 'active',
            'notes' => 'Prescription Clinic A',
        ]);

        $rxB = Prescription::create([
            'prescription_reference' => 'RX-2026-B002',
            'secure_token' => Str::random(64),
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patientB->id,
            'issue_date' => now()->format('Y-m-d'),
            'expiry_date' => now()->addDays(30)->format('Y-m-d'),
            'status' => 'active',
            'notes' => 'Prescription Clinic B',
        ]);

        // Query Clinic A -> ONLY Rx A
        $resA = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicA->id,
        ])->getJson('/api/v1/prescriptions');

        $resA->assertStatus(200);
        $idsA = collect($resA->json('data'))->pluck('id')->all();
        $this->assertContains($rxA->id, $idsA);
        $this->assertNotContains($rxB->id, $idsA);

        // Query Clinic B -> ONLY Rx B
        $resB = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson('/api/v1/prescriptions');

        $resB->assertStatus(200);
        $idsB = collect($resB->json('data'))->pluck('id')->all();
        $this->assertContains($rxB->id, $idsB);
        $this->assertNotContains($rxA->id, $idsB);
    }

    /**
     * AC-10: Diagnostic orders are strictly isolated between clinics.
     */
    public function test_ac10_diagnostic_order_isolation(): void
    {
        $orderA = DiagnosticOrder::create([
            'order_reference' => 'ORD-2026-A001',
            'secure_token' => Str::random(64),
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patientA->id,
            'diagnostic_center_id' => $this->diagnosticCenter->id,
            'order_type' => 'lab',
            'status' => 'draft',
            'ordered_at' => now(),
            'clinical_indication' => 'Lab for Clinic A',
        ]);

        $orderB = DiagnosticOrder::create([
            'order_reference' => 'ORD-2026-B002',
            'secure_token' => Str::random(64),
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patientB->id,
            'diagnostic_center_id' => $this->diagnosticCenter->id,
            'order_type' => 'lab',
            'status' => 'draft',
            'ordered_at' => now(),
            'clinical_indication' => 'Lab for Clinic B',
        ]);

        // Clinic A -> ONLY Order A
        $resA = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicA->id,
        ])->getJson('/api/v1/diagnostic-orders');

        $resA->assertStatus(200);
        $idsA = collect($resA->json('data'))->pluck('id')->all();
        $this->assertContains($orderA->id, $idsA);
        $this->assertNotContains($orderB->id, $idsA);

        // Clinic B -> ONLY Order B
        $resB = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson('/api/v1/diagnostic-orders');

        $resB->assertStatus(200);
        $idsB = collect($resB->json('data'))->pluck('id')->all();
        $this->assertContains($orderB->id, $idsB);
        $this->assertNotContains($orderA->id, $idsB);
    }

    /**
     * AC-11: Patient record isolation and cross-clinic tampering blocked.
     */
    public function test_ac11_patient_isolation_and_cross_clinic_tampering_blocked(): void
    {
        // Link Patient A to Clinic A via visit
        ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-PA01',
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patientA->id,
            'visit_date' => now()->format('Y-m-d'),
            'chief_complaint' => 'Clinic A Patient Visit',
            'status' => 'completed',
        ]);

        // Link Patient B to Clinic B via visit
        ClinicalVisit::create([
            'visit_reference' => 'VIS-2026-PB02',
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patientB->id,
            'visit_date' => now()->format('Y-m-d'),
            'chief_complaint' => 'Clinic B Patient Visit',
            'status' => 'completed',
        ]);

        // Access Patient B from Clinic A context -> 403 Forbidden
        $tamperRes = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicA->id,
        ])->getJson('/api/v1/patients/' . $this->patientB->id);

        $tamperRes->assertStatus(403);

        // Access Patient B from Clinic B context -> 200 OK
        $validRes = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson('/api/v1/patients/' . $this->patientB->id);

        $validRes->assertStatus(200);
        $this->assertEquals($this->patientB->id, $validRes->json('data.id'));
    }

    /**
     * AC-12: Clinical writes require active membership (Active=ALLOW, Suspended=403, Unrelated=403).
     */
    public function test_ac12_clinical_writes_require_active_membership(): void
    {
        // Write in Clinic A (Active) -> 201 Created
        $resA = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicA->id,
        ])->postJson('/api/v1/clinical-visits', [
            'clinic_id' => $this->clinicA->id,
            'patient_id' => $this->patientA->id,
            'chief_complaint' => 'Valid visit in active Clinic A',
        ]);
        $resA->assertStatus(201);

        // Write in Clinic B (Active) -> 201 Created
        $resB = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicB->id,
        ])->postJson('/api/v1/clinical-visits', [
            'clinic_id' => $this->clinicB->id,
            'patient_id' => $this->patientB->id,
            'chief_complaint' => 'Valid visit in active Clinic B',
        ]);
        $resB->assertStatus(201);

        // Write in Clinic C (Suspended) -> 403 Forbidden
        $resC = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicC->id,
        ])->postJson('/api/v1/clinical-visits', [
            'clinic_id' => $this->clinicC->id,
            'patient_id' => $this->patientA->id,
            'chief_complaint' => 'Tampering attempt in suspended Clinic C',
        ]);
        $resC->assertStatus(403);

        // Write in Unrelated Clinic -> 403 Forbidden
        $resUnrelated = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->unrelatedClinic->id,
        ])->postJson('/api/v1/clinical-visits', [
            'clinic_id' => $this->unrelatedClinic->id,
            'patient_id' => $this->patientA->id,
            'chief_complaint' => 'Tampering attempt in unrelated clinic',
        ]);
        $resUnrelated->assertStatus(403);
    }

    /**
     * AC-13 to AC-16: Director permission transition and reverse switch without logout.
     */
    public function test_ac13_to_ac16_director_permission_switching_and_reverse_switch(): void
    {
        // 1. In Clinic A (Director): Can update clinic settings
        $resA = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicA->id,
        ])->putJson('/api/v1/clinics/' . $this->clinicA->id, [
            'name' => 'عيادة الشفاء المحدثة',
            'phone' => '+21321000999',
            'wilaya' => 'الجزائر',
            'address' => 'شارع ديدوش مراد',
        ]);
        $resA->assertStatus(200);

        // 2. Switch to Clinic B (Employed Doctor): Updating clinic settings MUST BE 403
        $resB = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicB->id,
        ])->putJson('/api/v1/clinics/' . $this->clinicB->id, [
            'name' => 'عيادة النور المحدثة بطريقة غير مصرحة',
            'phone' => '+21341000888',
            'wilaya' => 'وهران',
            'address' => 'حي الياسمين',
        ]);
        $resB->assertStatus(403);

        // 3. Switch back to Clinic A: Director privileges restored immediately
        $resReverse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $this->clinicA->id,
        ])->putJson('/api/v1/clinics/' . $this->clinicA->id, [
            'name' => 'عيادة الشفاء - تأكيد استعادة الصلاحية',
            'phone' => '+21321000999',
            'wilaya' => 'الجزائر',
            'address' => 'شارع ديدوش مراد',
        ]);
        $resReverse->assertStatus(200);
    }

    /**
     * AC-19 to AC-21: Invitation acceptance end-to-end creates membership without duplicate User or Doctor.
     */
    public function test_ac19_to_ac21_invitation_acceptance_end_to_end(): void
    {
        // Setup new Clinic E with its own Director
        $dirEUser = User::factory()->create(['name' => 'د. سليم بلعباس', 'email' => 'dir_e@aafiya.dz', 'is_active' => true]);
        $dirEUser->assignRole('doctor');
        $dirEDoctor = Doctor::create([
            'user_id' => $dirEUser->id,
            'license_number' => 'LIC-DIR-E-001',
            'specialty' => 'Orthopedics',
            'is_verified' => true,
        ]);
        $clinicE = Clinic::create([
            'name' => 'عيادة الأطلس (Clinic E)',
            'address' => 'البليدة',
            'wilaya' => 'البليدة',
            'phone' => '+21325000005',
            'director_doctor_id' => $dirEDoctor->id,
            'is_active' => true,
        ]);
        DoctorClinic::create([
            'doctor_id' => $dirEDoctor->id,
            'clinic_id' => $clinicE->id,
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now(),
        ]);
        $dirEToken = $dirEUser->createToken('dir-e-token')->plainTextToken;

        $initialUserCount = User::count();
        $initialDoctorCount = Doctor::count();
        $initialAffiliationCount = DoctorClinic::count();

        // 1. Director E looks up Doctor D
        $lookupRes = $this->withHeader('Authorization', 'Bearer ' . $dirEToken)
            ->getJson("/api/v1/clinics/{$clinicE->id}/doctors/lookup?email=dr.khaled@aafiya.dz");

        $lookupRes->assertStatus(200);
        $this->assertEquals($this->doctor->id, $lookupRes->json('data.id'));
        $this->assertEquals('د. خالد بن عيسى', $lookupRes->json('data.full_name'));

        // Verify Privacy: NO other clinics or financial data leaked
        $this->assertArrayNotHasKey('clinics', $lookupRes->json('data'));
        $this->assertArrayNotHasKey('appointments', $lookupRes->json('data'));
        $this->assertArrayNotHasKey('patients', $lookupRes->json('data'));

        // 2. Director E sends invitation
        $inviteRes = $this->withHeader('Authorization', 'Bearer ' . $dirEToken)
            ->postJson("/api/v1/clinics/{$clinicE->id}/doctor-invitations", [
                'doctor_id' => $this->doctor->id,
                'notes' => 'مرحباً بك في طاقم عيادة الأطلس',
            ]);
        $inviteRes->assertStatus(201);
        $invitationId = $inviteRes->json('data.id');

        // 3. Doctor D lists invitations
        $this->app['auth']->forgetGuards();
        $inboxRes = $this->withHeader('Authorization', 'Bearer ' . $this->doctorToken)
            ->getJson('/api/v1/doctor/invitations');
        $inboxRes->assertStatus(200);
        $inboxData = $inboxRes->json('data');
        $this->assertNotEmpty($inboxData, 'Doctor D (' . $this->doctor->id . ') inbox empty. InviteRes: ' . json_encode($inviteRes->json()));
        $ids = collect($inboxData)->pluck('id')->all();
        $this->assertContains($invitationId, $ids);

        // 4. Doctor D accepts invitation
        $acceptRes = $this->withHeader('Authorization', 'Bearer ' . $this->doctorToken)
            ->postJson("/api/v1/doctor/invitations/{$invitationId}/accept");
        $acceptRes->assertStatus(200);

        // 5. Invariant Checks: Exactly 1 new doctor_clinic, ZERO new users, ZERO new doctors
        $this->assertEquals($initialUserCount, User::count(), 'Zero new User rows must be created upon invitation acceptance.');
        $this->assertEquals($initialDoctorCount, Doctor::count(), 'Zero new Doctor rows must be created upon invitation acceptance.');
        $this->assertEquals($initialAffiliationCount + 1, DoctorClinic::count(), 'Exactly 1 doctor_clinic row created.');

        // 6. Doctor D can now select Clinic E as active context
        $resE = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->doctorToken,
            'X-Clinic-ID' => $clinicE->id,
        ])->getJson('/api/v1/auth/me');

        $resE->assertStatus(200);
        $this->assertEquals($clinicE->id, $resE->json('data.clinic.id'));
        $this->assertFalse($resE->json('data.clinic.is_director'));
    }

    /**
     * AC-23 & AC-24: Duplicate pending invitations and suspended bypass attempts are blocked.
     */
    public function test_ac23_ac24_invitation_security_guards(): void
    {
        // Try inviting an already active member (Doctor D in Clinic B)
        $this->app['auth']->forgetGuards();
        $dirBToken = $this->dirBUser->createToken('dir_b_test')->plainTextToken;

        $dupActiveRes = $this->withHeader('Authorization', 'Bearer ' . $dirBToken)
            ->postJson("/api/v1/clinics/{$this->clinicB->id}/doctor-invitations", [
                'doctor_id' => $this->doctor->id,
            ]);
        $dupActiveRes->assertStatus(409);
        $this->assertTrue(
            str_contains($dupActiveRes->json('message'), 'active member') ||
            str_contains($dupActiveRes->json('message'), 'عضو نشط')
        );

        // Try inviting a suspended member (Doctor D in Clinic C)
        $this->app['auth']->forgetGuards();
        $dirCToken = $this->dirCUser->createToken('dir_c_test')->plainTextToken;

        $suspendedBypassRes = $this->withHeader('Authorization', 'Bearer ' . $dirCToken)
            ->postJson("/api/v1/clinics/{$this->clinicC->id}/doctor-invitations", [
                'doctor_id' => $this->doctor->id,
            ]);
        $suspendedBypassRes->assertStatus(409);
        $this->assertTrue(
            str_contains($suspendedBypassRes->json('message'), 'suspended') ||
            str_contains($suspendedBypassRes->json('message'), 'معلقة')
        );
    }

    /**
     * AC-25: Expired invitation cannot be accepted and wrong doctor cannot accept.
     */
    public function test_ac25_expired_and_wrong_doctor_invitation_protection(): void
    {
        // 1. Wrong doctor attempts to accept invitation
        // Create invitation for Doctor B in Clinic A
        $wrongInv = ClinicDoctorInvitation::create([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->dirBDoctor->id,
            'invited_by_id' => $this->doctorUser->id,
            'position' => 'doctor',
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
        ]);

        // Doctor D attempts to accept Doctor B's invitation -> 403 Forbidden
        $wrongDocRes = $this->withHeader('Authorization', 'Bearer ' . $this->doctorToken)
            ->postJson("/api/v1/doctor/invitations/{$wrongInv->id}/accept");
        $wrongDocRes->assertStatus(403);

        // 2. Expired invitation for Doctor D from Clinic B
        $expiredInv = ClinicDoctorInvitation::create([
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->doctor->id,
            'invited_by_id' => $this->dirBUser->id,
            'position' => 'doctor',
            'status' => 'pending',
            'expires_at' => now()->subDay(), // Expired yesterday
        ]);

        $expiredRes = $this->withHeader('Authorization', 'Bearer ' . $this->doctorToken)
            ->postJson("/api/v1/doctor/invitations/{$expiredInv->id}/accept");
        $expiredRes->assertStatus(422);
        $this->assertTrue(
            str_contains($expiredRes->json('message'), 'expired') ||
            str_contains($expiredRes->json('message'), 'منتهية')
        );
    }
}
