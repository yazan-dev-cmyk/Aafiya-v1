<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BookingCenter;
use App\Models\Clinic;
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

class BookingCenterPatientSearchTest extends TestCase
{
    use RefreshDatabase;

    protected User $bookingCenterUser1;
    protected BookingCenter $bookingCenter1;
    protected User $bookingCenterUser2;
    protected BookingCenter $bookingCenter2;
    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected Patient $patientNew;
    protected Patient $patientWithBc1Appointment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            BookingPackageSeeder::class,
        ]);

        $bcRole = Role::where('name', 'booking_center')->firstOrFail();
        $doctorRole = Role::where('name', 'doctor')->firstOrFail();

        // Booking Center 1
        $this->bookingCenterUser1 = User::factory()->create([
            'email' => 'bc1_search@aafiya.test',
            'name' => 'Booking Center 1',
        ]);
        $this->bookingCenterUser1->roles()->attach($bcRole->id);
        $this->bookingCenter1 = BookingCenter::create([
            'user_id' => $this->bookingCenterUser1->id,
            'name' => 'Booking Center 1',
            'phone' => '021999001',
            'address' => 'Alg 1',
            'wilaya' => 'Algiers',
            'quota_balance' => 500,
        ]);

        // Booking Center 2
        $this->bookingCenterUser2 = User::factory()->create([
            'email' => 'bc2_search@aafiya.test',
            'name' => 'Booking Center 2',
        ]);
        $this->bookingCenterUser2->roles()->attach($bcRole->id);
        $this->bookingCenter2 = BookingCenter::create([
            'user_id' => $this->bookingCenterUser2->id,
            'name' => 'Booking Center 2',
            'phone' => '021999002',
            'address' => 'Alg 2',
            'wilaya' => 'Algiers',
            'quota_balance' => 500,
        ]);

        // Doctor & Clinic for creating appointments
        $this->doctorUser = User::factory()->create(['email' => 'doctor_search@aafiya.test']);
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'General Medicine',
            'license_number' => 'DOC-SEARCH-100',
            'is_verified' => true,
        ]);
        $this->clinic = Clinic::create([
            'name' => 'Search Test Clinic',
            'address' => 'Algiers',
            'wilaya' => 'Algiers',
            'phone' => '021888001',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 30,
        ]);
        $this->doctor->clinics()->attach($this->clinic->id, ['position' => 'director', 'is_primary' => true]);

        // Patient 1: Registered Patient with ZERO appointments
        $this->patientNew = Patient::create([
            'mrn' => 'MRN-2026-TEST01',
            'first_name' => 'TestPatient',
            'last_name' => 'NewFirst',
            'gender' => 'male',
            'date_of_birth' => '1995-03-20',
            'phone' => '0550999001',
            'email' => 'newpatient@aafiya.test',
        ]);

        // Patient 2: Registered Patient with previous appointment at BC1
        $this->patientWithBc1Appointment = Patient::create([
            'mrn' => 'MRN-2026-TEST02',
            'first_name' => 'TestPatient',
            'last_name' => 'ExistingBC1',
            'gender' => 'female',
            'date_of_birth' => '1992-08-10',
            'phone' => '0550999002',
            'email' => 'existingbc1@aafiya.test',
        ]);

        Appointment::create([
            'booking_reference' => 'MS-2026-BC1-001',
            'patient_id' => $this->patientWithBc1Appointment->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'booking_center_id' => $this->bookingCenter1->id,
            'patient_name' => 'TestPatient ExistingBC1',
            'patient_phone' => '0550999002',
            'appointment_date' => now()->format('Y-m-d'),
            'time_slot' => '10:00',
            'status' => 'confirmed',
            'type' => 'consultation',
            'created_by_id' => $this->bookingCenterUser1->id,
        ]);
    }

    /**
     * TEST 1: Registered patient with zero appointments is found by explicit Name search.
     */
    public function test_first_booking_registered_patient_found_by_name_search(): void
    {
        $response = $this->actingAs($this->bookingCenterUser1, 'sanctum')
            ->getJson('/api/v1/patients?search=NewFirst');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.mrn', 'MRN-2026-TEST01')
            ->assertJsonPath('data.0.phone', '0550999001');
    }

    /**
     * TEST 2: Registered patient with zero appointments is found by explicit MRN search.
     */
    public function test_first_booking_registered_patient_found_by_mrn_search(): void
    {
        $response = $this->actingAs($this->bookingCenterUser1, 'sanctum')
            ->getJson('/api/v1/patients?search=MRN-2026-TEST01');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.first_name', 'TestPatient')
            ->assertJsonPath('data.0.mrn', 'MRN-2026-TEST01');
    }

    /**
     * TEST 3: Registered patient with zero appointments is found by explicit Phone search.
     */
    public function test_first_booking_registered_patient_found_by_phone_search(): void
    {
        $response = $this->actingAs($this->bookingCenterUser1, 'sanctum')
            ->getJson('/api/v1/patients?search=0550999001');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.mrn', 'MRN-2026-TEST01');
    }

    /**
     * TEST 4: Patient associated with current Booking Center remains searchable.
     */
    public function test_existing_booking_center_patient_remains_searchable(): void
    {
        $response = $this->actingAs($this->bookingCenterUser1, 'sanctum')
            ->getJson('/api/v1/patients?search=ExistingBC1');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.mrn', 'MRN-2026-TEST02');
    }

    /**
     * TEST 5: Booking Center 2 can find registered patient for NEW BOOKING via explicit search even if appointment exists at BC1.
     */
    public function test_booking_center_2_can_find_patient_for_new_booking(): void
    {
        $response = $this->actingAs($this->bookingCenterUser2, 'sanctum')
            ->getJson('/api/v1/patients?search=ExistingBC1');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.mrn', 'MRN-2026-TEST02');
    }

    /**
     * TEST 6: Unfiltered request without explicit search parameter returns EMPTY list.
     */
    public function test_unfiltered_booking_center_request_returns_empty_list(): void
    {
        $response = $this->actingAs($this->bookingCenterUser1, 'sanctum')
            ->getJson('/api/v1/patients');

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    /**
     * TEST 7: Response uses PatientLookupResource and strictly omits medical/clinical data.
     */
    public function test_patient_lookup_response_does_not_leak_clinical_data(): void
    {
        $response = $this->actingAs($this->bookingCenterUser1, 'sanctum')
            ->getJson('/api/v1/patients?search=NewFirst');

        $response->assertStatus(200);
        $json = $response->json('data.0');

        $this->assertArrayHasKey('id', $json);
        $this->assertArrayHasKey('mrn', $json);
        $this->assertArrayHasKey('first_name', $json);
        $this->assertArrayHasKey('last_name', $json);
        $this->assertArrayHasKey('phone', $json);

        // Strict omission assertions for clinical & sensitive fields
        $this->assertArrayNotHasKey('allergies', $json);
        $this->assertArrayNotHasKey('chronic_conditions', $json);
        $this->assertArrayNotHasKey('current_medications', $json);
        $this->assertArrayNotHasKey('clinical_visits', $json);
        $this->assertArrayNotHasKey('prescriptions', $json);
        $this->assertArrayNotHasKey('diagnostic_orders', $json);
        $this->assertArrayNotHasKey('national_id', $json);
        $this->assertArrayNotHasKey('emergency_contacts', $json);
    }
}
