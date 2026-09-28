<?php

namespace Tests\Feature;

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

class PatientEhrTest extends TestCase
{
    use RefreshDatabase;

    protected User $staffUser;
    protected Doctor $doctor;
    protected \App\Models\Clinic $clinic;

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
        $this->staffUser = User::factory()->create();
        $this->staffUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->staffUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-EHR-001',
            'is_verified' => true,
        ]);

        $this->clinic = \App\Models\Clinic::create([
            'name' => 'EHR Test Clinic',
            'address' => 'Algiers',
            'wilaya' => 'Algiers',
            'phone' => '021888999',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 30,
        ]);
        $this->doctor->clinics()->attach($this->clinic->id, ['position' => 'director', 'is_primary' => true, 'is_active' => true]);
    }

    public function test_can_create_patient_with_sequential_mrn(): void
    {
        $response = $this->actingAs($this->staffUser, 'sanctum')
            ->withHeaders(['X-Clinic-ID' => $this->clinic->id])
            ->postJson('/api/v1/patients', [
                'first_name' => 'يوسف',
                'last_name' => 'بن مهيدي',
                'gender' => 'male',
                'date_of_birth' => '1990-05-15',
                'blood_group' => 'O+',
                'phone' => '0550998877',
                'email' => 'youssef@example.dz',
                'national_id' => '123456789012345678',
                'wilaya' => 'الجزائر',
                'address' => 'الجزائر الوسطى',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.first_name', 'يوسف')
            ->assertJsonPath('data.blood_group', 'O+');

        $patient = Patient::first();
        $this->assertNotNull($patient);
        $this->assertMatchesRegularExpression('/^MRN-\d{4}-\d{2}-\d{5}$/', $patient->mrn);
    }

    public function test_can_add_allergies_chronic_conditions_and_medications(): void
    {
        $patient = Patient::create([
            'mrn' => 'MRN-2026-0001',
            'first_name' => 'فاطمة',
            'last_name' => 'زهراء',
            'gender' => 'female',
            'date_of_birth' => '1985-10-20',
            'blood_group' => 'A+',
            'phone' => '0661223344',
        ]);

        // Create an appointment for patient in doctor's clinic so doctor policy allows managing records
        \App\Models\Appointment::create([
            'booking_reference' => 'MS-2026-EHR-001',
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $patient->id,
            'patient_name' => "{$patient->first_name} {$patient->last_name}",
            'patient_phone' => $patient->phone,
            'appointment_date' => '2026-09-07',
            'time_slot' => '10:00',
            'status' => 'confirmed',
            'created_by_id' => $this->staffUser->id,
        ]);

        // Add Allergy
        $allergyRes = $this->actingAs($this->staffUser, 'sanctum')
            ->withHeaders(['X-Clinic-ID' => $this->clinic->id])
            ->postJson("/api/v1/patients/{$patient->id}/allergies", [
                'allergen' => 'Penicillin',
                'severity' => 'severe',
                'reaction' => 'Anaphylactic rash',
            ]);
        $allergyRes->assertStatus(201);
        $this->assertDatabaseHas('patient_allergies', ['patient_id' => $patient->id, 'allergen' => 'Penicillin']);

        // Add Chronic Condition
        $conditionRes = $this->actingAs($this->staffUser, 'sanctum')
            ->withHeaders(['X-Clinic-ID' => $this->clinic->id])
            ->postJson("/api/v1/patients/{$patient->id}/chronic-conditions", [
                'condition_name' => 'Diabetes Mellitus Type 2',
                'icd10_code' => 'E11',
                'status' => 'managed',
            ]);
        $conditionRes->assertStatus(201);
        $this->assertDatabaseHas('patient_chronic_conditions', ['patient_id' => $patient->id, 'icd10_code' => 'E11']);

        // Add Medication
        $medRes = $this->actingAs($this->staffUser, 'sanctum')
            ->withHeaders(['X-Clinic-ID' => $this->clinic->id])
            ->postJson("/api/v1/patients/{$patient->id}/medications", [
                'medication_name' => 'Metformin',
                'dosage' => '500mg',
                'frequency' => 'Twice daily',
            ]);
        $medRes->assertStatus(201);
        $this->assertDatabaseHas('patient_current_medications', ['patient_id' => $patient->id, 'medication_name' => 'Metformin']);

        // Add Emergency Contact
        $contactRes = $this->actingAs($this->staffUser, 'sanctum')
            ->withHeaders(['X-Clinic-ID' => $this->clinic->id])
            ->postJson("/api/v1/patients/{$patient->id}/emergency-contacts", [
                'name' => 'أحمد زهراء',
                'relationship' => 'brother',
                'phone' => '0661998877',
                'is_primary' => true,
            ]);
        $contactRes->assertStatus(201);
        $this->assertDatabaseHas('emergency_contacts', ['patient_id' => $patient->id, 'name' => 'أحمد زهراء']);
    }

    public function test_can_search_patients(): void
    {
        $patient = Patient::create([
            'mrn' => 'MRN-2026-0099',
            'first_name' => 'كريم',
            'last_name' => 'بوضياف',
            'gender' => 'male',
            'date_of_birth' => '1992-01-01',
            'phone' => '0770112233',
        ]);

        \App\Models\Appointment::create([
            'booking_reference' => 'MS-2026-EHR-002',
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $patient->id,
            'patient_name' => "{$patient->first_name} {$patient->last_name}",
            'patient_phone' => $patient->phone,
            'appointment_date' => '2026-09-07',
            'time_slot' => '11:00',
            'status' => 'confirmed',
            'created_by_id' => $this->staffUser->id,
        ]);

        $searchRes = $this->actingAs($this->staffUser, 'sanctum')
            ->withHeaders(['X-Clinic-ID' => $this->clinic->id])
            ->getJson('/api/v1/patients?search=بوضياف');
        $searchRes->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.first_name', 'كريم');
    }

    public function test_patient_list_pagination_and_meta(): void
    {
        for ($i = 1; $i <= 25; $i++) {
            $p = Patient::create([
                'mrn' => sprintf('MRN-2026-%04d', $i),
                'first_name' => "مريض_{$i}",
                'last_name' => 'اختبار',
                'gender' => 'male',
                'date_of_birth' => '1990-01-01',
                'phone' => sprintf('05500000%02d', $i),
            ]);

            \App\Models\Appointment::create([
                'booking_reference' => sprintf('MS-2026-PAG-%04d', $i),
                'clinic_id' => $this->clinic->id,
                'doctor_id' => $this->doctor->id,
                'patient_id' => $p->id,
                'patient_name' => "{$p->first_name} {$p->last_name}",
                'patient_phone' => $p->phone,
                'appointment_date' => '2026-09-07',
                'time_slot' => '12:00',
                'status' => 'confirmed',
                'created_by_id' => $this->staffUser->id,
            ]);
        }

        $res = $this->actingAs($this->staffUser, 'sanctum')
            ->withHeaders(['X-Clinic-ID' => $this->clinic->id])
            ->getJson('/api/v1/patients?page=1&per_page=10');
        $res->assertStatus(200)
            ->assertJsonCount(10, 'data')
            ->assertJsonStructure([
                'data',
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ])
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.total', 25)
            ->assertJsonPath('meta.last_page', 3);

        $resPage2 = $this->actingAs($this->staffUser, 'sanctum')
            ->withHeaders(['X-Clinic-ID' => $this->clinic->id])
            ->getJson('/api/v1/patients?page=2&per_page=10');
        $resPage2->assertStatus(200)
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.current_page', 2);
    }
}
