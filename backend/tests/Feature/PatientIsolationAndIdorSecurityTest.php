<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\DiagnosticOrder;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PatientIsolationAndIdorSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $doctorAUser;
    protected Doctor $doctorA;
    protected Clinic $clinicA;
    protected Clinic $clinicA2;

    protected User $doctorBUser;
    protected Doctor $doctorB;
    protected Clinic $clinicB;

    protected Patient $patientA;
    protected Patient $patientB;
    protected Patient $unattachedPatient;

    protected Appointment $appointmentA;
    protected Appointment $appointmentB;

    protected Prescription $prescriptionA;
    protected Prescription $prescriptionB;

    protected DiagnosticOrder $diagnosticOrderA;
    protected DiagnosticOrder $diagnosticOrderB;

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
        $adminRole = Role::where('name', 'admin')->firstOrFail();

        // Admin User
        $this->adminUser = User::factory()->create(['email' => 'admin_iso@test.com']);
        $this->adminUser->roles()->attach($adminRole->id);

        // Clinic A & Doctor A (Director of Clinic A and attached to Clinic A2 to test multi-clinic X-Clinic-ID enforcement)
        $this->doctorAUser = User::factory()->create(['email' => 'doctor_a@test.com']);
        $this->doctorAUser->roles()->attach($doctorRole->id);
        $this->doctorA = Doctor::create([
            'user_id' => $this->doctorAUser->id,
            'specialty' => 'Cardiology',
            'license_number' => 'DOC-A100',
            'is_verified' => true,
        ]);

        $this->clinicA = Clinic::create([
            'name' => 'Clinic A',
            'address' => 'Alg',
            'wilaya' => 'Algiers',
            'phone' => '021000001',
            'director_doctor_id' => $this->doctorA->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 30,
        ]);
        $this->doctorA->clinics()->attach($this->clinicA->id, ['position' => 'director', 'is_primary' => true]);

        $this->clinicA2 = Clinic::create([
            'name' => 'Clinic A2',
            'address' => 'Alg 2',
            'wilaya' => 'Algiers',
            'phone' => '021000002',
            'director_doctor_id' => $this->doctorA->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 30,
        ]);
        $this->doctorA->clinics()->attach($this->clinicA2->id, ['position' => 'director', 'is_primary' => false]);

        // Clinic B & Doctor B (Director of Clinic B)
        $this->doctorBUser = User::factory()->create(['email' => 'doctor_b@test.com']);
        $this->doctorBUser->roles()->attach($doctorRole->id);
        $this->doctorB = Doctor::create([
            'user_id' => $this->doctorBUser->id,
            'specialty' => 'Dermatology',
            'license_number' => 'DOC-B200',
            'is_verified' => true,
        ]);

        $this->clinicB = Clinic::create([
            'name' => 'Clinic B',
            'address' => 'Oran',
            'wilaya' => 'Oran',
            'phone' => '041000002',
            'director_doctor_id' => $this->doctorB->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 30,
        ]);
        $this->doctorB->clinics()->attach($this->clinicB->id, ['position' => 'director', 'is_primary' => true]);

        // Patient A (Belongs to Doctor A in Clinic A via Appointment)
        $this->patientA = Patient::create([
            'mrn' => 'MRN-2026-9001',
            'first_name' => 'PatientA',
            'last_name' => 'Test',
            'gender' => 'male',
            'date_of_birth' => '1990-05-15',
            'phone' => '0550112233',
        ]);

        $this->appointmentA = Appointment::create([
            'booking_reference' => 'MS-2026-9001',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctorA->id,
            'clinic_id' => $this->clinicA->id,
            'patient_name' => 'PatientA Test',
            'patient_phone' => '0550112233',
            'appointment_date' => now()->format('Y-m-d'),
            'time_slot' => '10:00',
            'status' => 'confirmed',
            'type' => 'consultation',
            'created_by_id' => $this->doctorAUser->id,
        ]);

        $this->prescriptionA = Prescription::create([
            'prescription_reference' => 'RX-2026-9001',
            'secure_token' => Str::random(64),
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctorA->id,
            'clinic_id' => $this->clinicA->id,
            'issue_date' => now()->format('Y-m-d'),
            'expiry_date' => now()->addDays(30)->format('Y-m-d'),
            'status' => 'active',
        ]);

        $this->diagnosticOrderA = DiagnosticOrder::create([
            'order_reference' => 'ORD-2026-9001',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctorA->id,
            'clinic_id' => $this->clinicA->id,
            'order_type' => 'lab',
            'ordered_at' => now(),
            'status' => 'ordered',
        ]);

        // Patient B (Belongs to Doctor B in Clinic B via Appointment)
        $this->patientB = Patient::create([
            'mrn' => 'MRN-2026-9002',
            'first_name' => 'PatientB',
            'last_name' => 'Test',
            'gender' => 'female',
            'date_of_birth' => '1992-08-20',
            'phone' => '0550445566',
        ]);

        $this->appointmentB = Appointment::create([
            'booking_reference' => 'MS-2026-9002',
            'patient_id' => $this->patientB->id,
            'doctor_id' => $this->doctorB->id,
            'clinic_id' => $this->clinicB->id,
            'patient_name' => 'PatientB Test',
            'patient_phone' => '0550445566',
            'appointment_date' => now()->format('Y-m-d'),
            'time_slot' => '11:00',
            'status' => 'confirmed',
            'type' => 'consultation',
            'created_by_id' => $this->doctorBUser->id,
        ]);

        $this->prescriptionB = Prescription::create([
            'prescription_reference' => 'RX-2026-9002',
            'secure_token' => Str::random(64),
            'patient_id' => $this->patientB->id,
            'doctor_id' => $this->doctorB->id,
            'clinic_id' => $this->clinicB->id,
            'issue_date' => now()->format('Y-m-d'),
            'expiry_date' => now()->addDays(30)->format('Y-m-d'),
            'status' => 'active',
        ]);

        $this->diagnosticOrderB = DiagnosticOrder::create([
            'order_reference' => 'ORD-2026-9002',
            'patient_id' => $this->patientB->id,
            'doctor_id' => $this->doctorB->id,
            'clinic_id' => $this->clinicB->id,
            'order_type' => 'lab',
            'ordered_at' => now(),
            'status' => 'ordered',
        ]);

        // Unattached Patient (No appointments, visits, prescriptions, or diagnostic orders)
        $this->unattachedPatient = Patient::create([
            'mrn' => 'MRN-2026-9999',
            'first_name' => 'Unattached',
            'last_name' => 'Patient',
            'gender' => 'male',
            'date_of_birth' => '1985-01-01',
            'phone' => '0550999999',
        ]);
    }

    /** TEST-ISO-001 */
    public function test_doctor_a_patient_list_contains_only_authorized_patients(): void
    {
        $response = $this->actingAs($this->doctorAUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/patients');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($this->patientA->id, $ids);
        $this->assertNotContains($this->patientB->id, $ids);
        $this->assertNotContains($this->unattachedPatient->id, $ids);
    }

    /** TEST-ISO-002 */
    public function test_doctor_b_patient_list_contains_only_authorized_patients(): void
    {
        $response = $this->actingAs($this->doctorBUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicB->id)
            ->getJson('/api/v1/patients');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($this->patientB->id, $ids);
        $this->assertNotContains($this->patientA->id, $ids);
        $this->assertNotContains($this->unattachedPatient->id, $ids);
    }

    /** TEST-ISO-003 */
    public function test_unattached_patient_is_not_globally_visible(): void
    {
        $response = $this->actingAs($this->doctorAUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/patients');

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertNotContains($this->unattachedPatient->id, $ids);
    }

    /** TEST-ISO-004 */
    public function test_missing_x_clinic_id_does_not_cause_global_patient_exposure(): void
    {
        $response = $this->actingAs($this->doctorAUser, 'sanctum')
            ->getJson('/api/v1/patients');

        // Multi-clinic doctor without X-Clinic-ID fails closed (403) or returns empty
        $this->assertTrue(in_array($response->status(), [200, 403]));
        if ($response->status() === 200) {
            $ids = collect($response->json('data'))->pluck('id')->all();
            $this->assertEmpty($ids);
        }
    }

    /** TEST-ISO-005 */
    public function test_doctor_a_cannot_get_doctor_b_unauthorized_patient_by_id(): void
    {
        $response = $this->actingAs($this->doctorAUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson("/api/v1/patients/{$this->patientB->id}");

        $response->assertStatus(403);
    }

    /** TEST-ISO-006 */
    public function test_doctor_a_cannot_put_update_doctor_b_unauthorized_patient(): void
    {
        $response = $this->actingAs($this->doctorAUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->putJson("/api/v1/patients/{$this->patientB->id}", [
                'first_name' => 'Tampered',
            ]);

        $response->assertStatus(403);
    }

    /** TEST-ISO-007 */
    public function test_doctor_a_cannot_add_allergy_to_unauthorized_patient(): void
    {
        $response = $this->actingAs($this->doctorAUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->postJson("/api/v1/patients/{$this->patientB->id}/allergies", [
                'allergen' => 'Penicillin',
                'severity' => 'severe',
            ]);

        $response->assertStatus(403);
    }

    /** TEST-ISO-008 */
    public function test_doctor_a_cannot_add_chronic_condition_to_unauthorized_patient(): void
    {
        $response = $this->actingAs($this->doctorAUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->postJson("/api/v1/patients/{$this->patientB->id}/chronic-conditions", [
                'condition_name' => 'Diabetes',
                'status' => 'active',
            ]);

        $response->assertStatus(403);
    }

    /** TEST-ISO-009 */
    public function test_doctor_a_cannot_add_medication_to_unauthorized_patient(): void
    {
        $response = $this->actingAs($this->doctorAUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->postJson("/api/v1/patients/{$this->patientB->id}/medications", [
                'medication_name' => 'Metformin',
                'dosage' => '500mg',
                'frequency' => 'daily',
            ]);

        $response->assertStatus(403);
    }

    /** TEST-ISO-010 */
    public function test_doctor_a_cannot_add_emergency_contact_to_unauthorized_patient(): void
    {
        $response = $this->actingAs($this->doctorAUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->postJson("/api/v1/patients/{$this->patientB->id}/emergency-contacts", [
                'name' => 'Jane Doe',
                'relationship' => 'Spouse',
                'phone' => '+213555000111',
            ]);

        $response->assertStatus(403);
    }

    /** TEST-ISO-011 */
    public function test_doctor_a_cannot_get_unauthorized_appointment(): void
    {
        $response = $this->actingAs($this->doctorAUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson("/api/v1/appointments/{$this->appointmentB->id}");

        $response->assertStatus(403);
    }

    /** TEST-ISO-012 */
    public function test_doctor_a_cannot_get_unauthorized_prescription(): void
    {
        $response = $this->actingAs($this->doctorAUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson("/api/v1/prescriptions/{$this->prescriptionB->id}");

        $response->assertStatus(403);
    }

    /** TEST-ISO-013 */
    public function test_doctor_a_cannot_get_unauthorized_diagnostic_order(): void
    {
        $response = $this->actingAs($this->doctorAUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson("/api/v1/diagnostic-orders/{$this->diagnosticOrderB->id}");

        $response->assertStatus(403);
    }

    /** TEST-ISO-014 */
    public function test_authorized_doctor_access_continues_to_work(): void
    {
        $response = $this->actingAs($this->doctorAUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson("/api/v1/patients/{$this->patientA->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('data.id', $this->patientA->id);
    }

    /** TEST-ISO-015 */
    public function test_authorized_clinic_director_access_continues_to_work(): void
    {
        $response = $this->actingAs($this->doctorAUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson("/api/v1/appointments/{$this->appointmentA->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('data.id', $this->appointmentA->id);
    }

    /** TEST-ISO-016 */
    public function test_admin_access_continues_to_work(): void
    {
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson("/api/v1/patients/{$this->patientB->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('data.id', $this->patientB->id);
    }
}
