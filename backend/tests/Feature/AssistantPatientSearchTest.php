<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssistantPatientSearchTest extends TestCase
{
    use RefreshDatabase;

    protected User $assistantUser;
    protected ClinicAssistant $assistant;
    protected string $assistantToken;

    protected Clinic $clinicA;
    protected Clinic $clinicB;

    protected User $doctorUserA;
    protected Doctor $doctorA;

    protected User $doctorUserB;
    protected Doctor $doctorB;

    protected Patient $patientSameClinic;
    protected Patient $patientPlatformWide;

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

        // 1. Setup Clinic A
        $this->clinicA = Clinic::create([
            'name' => 'عيادة الشفاء - الجزائر',
            'address' => 'نهج العربي بن مهيدي، الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '+213550111222',
            'is_active' => true,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        // 2. Setup Clinic B (Foreign Clinic)
        $this->clinicB = Clinic::create([
            'name' => 'عيادة النور - وهران',
            'address' => 'شارع الأمير عبد القادر، وهران',
            'wilaya' => 'وهران',
            'phone' => '+213550333444',
            'is_active' => true,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        // 3. Setup Doctor A affiliated with Clinic A
        $this->doctorUserA = User::factory()->create([
            'email' => 'dr.ahmed@aafiya.test',
            'name' => 'Dr. Ahmed',
        ]);
        $this->doctorUserA->roles()->attach($doctorRole->id);
        $this->doctorA = Doctor::create([
            'user_id' => $this->doctorUserA->id,
            'specialty' => 'General Medicine',
            'license_number' => 'DOC-ALG-001',
            'is_verified' => true,
        ]);
        DoctorClinic::create([
            'doctor_id' => $this->doctorA->id,
            'clinic_id' => $this->clinicA->id,
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
        ]);
        $this->clinicA->update(['director_doctor_id' => $this->doctorA->id]);

        // 4. Setup Doctor B affiliated ONLY with Clinic B (Foreign Doctor)
        $this->doctorUserB = User::factory()->create([
            'email' => 'dr.karim@aafiya.test',
            'name' => 'Dr. Karim',
        ]);
        $this->doctorUserB->roles()->attach($doctorRole->id);
        $this->doctorB = Doctor::create([
            'user_id' => $this->doctorUserB->id,
            'specialty' => 'Cardiology',
            'license_number' => 'DOC-ORN-002',
            'is_verified' => true,
        ]);
        DoctorClinic::create([
            'doctor_id' => $this->doctorB->id,
            'clinic_id' => $this->clinicB->id,
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
        ]);
        $this->clinicB->update(['director_doctor_id' => $this->doctorB->id]);

        // 5. Setup Doctor Assistant affiliated strictly with Clinic A
        $this->assistantUser = User::factory()->create([
            'email' => 'assistant.clinic_a@aafiya.test',
            'name' => 'Assistant Clinic A',
        ]);
        $this->assistantUser->roles()->attach($assistantRole->id);
        $this->assistant = ClinicAssistant::create([
            'user_id' => $this->assistantUser->id,
            'clinic_id' => $this->clinicA->id,
            'permissions_json' => ['appointments.view', 'appointments.create', 'patients.view'],
            'created_by_id' => $this->doctorUserA->id,
            'is_active' => true,
        ]);
        $this->assistantToken = $this->assistantUser->createToken('assistant-test-token')->plainTextToken;

        // 6. Setup Patient 1: Same-clinic patient (has previous appointment in Clinic A)
        $this->patientSameClinic = Patient::create([
            'mrn' => 'MRN-2026-CLINIC-A01',
            'first_name' => 'SameClinic',
            'last_name' => 'PatientA',
            'gender' => 'male',
            'date_of_birth' => '1990-01-15',
            'phone' => '0550111001',
            'email' => 'sameclinic@aafiya.test',
            'national_id' => '199000111222',
            'blood_group' => 'O+',
            'wilaya' => 'الجزائر',
        ]);
        Appointment::create([
            'booking_reference' => 'MS-2026-CLA-001',
            'patient_id' => $this->patientSameClinic->id,
            'doctor_id' => $this->doctorA->id,
            'clinic_id' => $this->clinicA->id,
            'patient_name' => 'SameClinic PatientA',
            'patient_phone' => '0550111001',
            'appointment_date' => now()->subDays(5)->format('Y-m-d'),
            'time_slot' => '09:00',
            'status' => 'completed',
            'type' => 'consultation',
            'created_by_id' => $this->assistantUser->id,
        ]);

        // 7. Setup Patient 2: Platform-wide patient with ZERO clinic history in Clinic A
        $this->patientPlatformWide = Patient::create([
            'mrn' => 'MRN-2026-PLATFORM-99',
            'first_name' => 'PlatformZero',
            'last_name' => 'HistoryPatient',
            'gender' => 'female',
            'date_of_birth' => '1996-07-22',
            'phone' => '0550999888',
            'email' => 'platformzero@aafiya.test',
            'national_id' => '199699988877',
            'blood_group' => 'A+',
            'wilaya' => 'وهران',
        ]);
    }

    /**
     * Test 1: Same-clinic patient search succeeds and returns PatientLookupResource.
     */
    public function test_same_clinic_registered_patient_search_succeeds_with_lookup_resource(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/patients?search=SameClinic');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.mrn', 'MRN-2026-CLINIC-A01')
            ->assertJsonPath('data.0.first_name', 'SameClinic')
            ->assertJsonPath('data.0.phone', '0550111001');
    }

    /**
     * Test 2: Platform-wide registered patient with zero clinic history is found by name search.
     */
    public function test_platform_wide_patient_with_zero_clinic_history_found_by_name(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/patients?search=PlatformZero');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.id', $this->patientPlatformWide->id)
            ->assertJsonPath('data.0.mrn', 'MRN-2026-PLATFORM-99')
            ->assertJsonPath('data.0.first_name', 'PlatformZero');
    }

    /**
     * Test 3: Platform-wide registered patient is found by explicit MRN search.
     */
    public function test_platform_wide_patient_found_by_mrn(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/patients?mrn=MRN-2026-PLATFORM-99');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.id', $this->patientPlatformWide->id)
            ->assertJsonPath('data.0.mrn', 'MRN-2026-PLATFORM-99');
    }

    /**
     * Test 4: Platform-wide registered patient is found by explicit phone search.
     */
    public function test_platform_wide_patient_found_by_phone(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/patients?phone=0550999888');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.id', $this->patientPlatformWide->id)
            ->assertJsonPath('data.0.phone', '0550999888');
    }

    /**
     * Test 5: Patient lookup response strictly minimizes data and omits clinical/sensitive data.
     */
    public function test_patient_lookup_response_strictly_minimizes_data(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/patients?search=PlatformZero');

        $response->assertStatus(200);
        $patientData = $response->json('data.0');

        // Verified identification fields
        $this->assertEquals($this->patientPlatformWide->id, $patientData['id']);
        $this->assertEquals('MRN-2026-PLATFORM-99', $patientData['mrn']);
        $this->assertEquals('PlatformZero', $patientData['first_name']);
        $this->assertEquals('HistoryPatient', $patientData['last_name']);
        $this->assertEquals('0550999888', $patientData['phone']);
        $this->assertEquals('platformzero@aafiya.test', $patientData['email']);
        $this->assertEquals('وهران', $patientData['wilaya']);

        // Strict omission of clinical and highly sensitive fields
        $this->assertArrayNotHasKey('allergies', $patientData);
        $this->assertArrayNotHasKey('chronic_conditions', $patientData);
        $this->assertArrayNotHasKey('current_medications', $patientData);
        $this->assertArrayNotHasKey('emergency_contacts', $patientData);
        $this->assertArrayNotHasKey('blood_group', $patientData);
        $this->assertArrayNotHasKey('national_id', $patientData);
        $this->assertArrayNotHasKey('clinical_notes', $patientData);
        $this->assertArrayNotHasKey('diagnosis', $patientData);
        $this->assertArrayNotHasKey('prescriptions', $patientData);
        $this->assertArrayNotHasKey('diagnostic_orders', $patientData);
    }

    /**
     * Test 6: Empty search request returns empty collection preventing platform-wide enumeration.
     */
    public function test_empty_search_request_returns_empty_collection_preventing_enumeration(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/patients');

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    /**
     * Test 7: Assistant creates appointment for discovered platform-wide patient in own clinic.
     */
    public function test_assistant_can_create_appointment_for_discovered_platform_wide_patient(): void
    {
        $payload = [
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctorA->id,
            'patient_id' => $this->patientPlatformWide->id,
            'patient_name' => $this->patientPlatformWide->full_name,
            'patient_phone' => $this->patientPlatformWide->phone,
            'patient_mrn' => $this->patientPlatformWide->mrn,
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '10:00',
            'notes' => 'حجز لمريض مسجل من خارج العيادة',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson('/api/v1/appointments', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('data.clinic.id', $this->clinicA->id);
        $response->assertJsonPath('data.doctor.id', $this->doctorA->id);
        $response->assertJsonPath('data.patient.id', $this->patientPlatformWide->id);
        $response->assertJsonPath('data.creator_type', 'clinic_assistant');

        $this->assertDatabaseHas('appointments', [
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctorA->id,
            'patient_id' => $this->patientPlatformWide->id,
            'patient_phone' => $this->patientPlatformWide->phone,
            'creator_type' => 'clinic_assistant',
        ]);
    }

    /**
     * Test 8: Assistant cannot create appointment with doctor from another clinic (403).
     */
    public function test_assistant_cannot_create_appointment_with_foreign_doctor(): void
    {
        $payload = [
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctorB->id, // Doctor B belongs to Clinic B
            'patient_id' => $this->patientPlatformWide->id,
            'patient_name' => $this->patientPlatformWide->full_name,
            'patient_phone' => $this->patientPlatformWide->phone,
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '10:00',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson('/api/v1/appointments', $payload);

        $response->assertStatus(403);
    }

    /**
     * Test 9: Assistant cannot create appointment for foreign clinic (403).
     */
    public function test_assistant_cannot_create_appointment_for_foreign_clinic(): void
    {
        $payload = [
            'clinic_id' => $this->clinicB->id, // Foreign clinic
            'doctor_id' => $this->doctorB->id,
            'patient_id' => $this->patientPlatformWide->id,
            'patient_name' => $this->patientPlatformWide->full_name,
            'patient_phone' => $this->patientPlatformWide->phone,
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '10:00',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson('/api/v1/appointments', $payload);

        $response->assertStatus(403);
    }

    /**
     * Test 10: Patient discovery does NOT grant direct EHR access (403).
     */
    public function test_patient_discovery_does_not_grant_direct_ehr_access(): void
    {
        // 1. Assistant discovers patient via search
        $searchResponse = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/patients?search=PlatformZero');
        $searchResponse->assertStatus(200);

        // 2. Assistant attempts to view full patient EHR profile (show endpoint)
        $ehrResponse = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/patients/' . $this->patientPlatformWide->id);

        $ehrResponse->assertStatus(403);
    }

    /**
     * Test 11: Booking center patient search behavior remains intact.
     */
    public function test_booking_center_search_contract_remains_intact(): void
    {
        $bcRole = Role::where('name', 'booking_center')->firstOrFail();
        $bcUser = User::factory()->create(['email' => 'bc.assistant.test@aafiya.test']);
        $bcUser->roles()->attach($bcRole->id);
        $bc = BookingCenter::create([
            'user_id' => $bcUser->id,
            'name' => 'BC Regression Test',
            'phone' => '021000999',
            'address' => 'Alg',
            'wilaya' => 'Algiers',
            'quota_balance' => 500,
        ]);

        $response = $this->actingAs($bcUser, 'sanctum')
            ->getJson('/api/v1/patients?search=PlatformZero');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.id', $this->patientPlatformWide->id);
    }
}
