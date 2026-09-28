<?php

namespace Tests\Feature;

use App\Models\Clinic;
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
use Tests\TestCase;

class FrontendContractIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;

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
        $this->doctorUser = User::factory()->create([
            'email' => 'doctor.contract@aafiya.dz',
            'password' => bcrypt('Password123!'),
            'is_active' => true,
        ]);
        $this->doctorUser->roles()->attach($doctorRole->id);

        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب الأطفال',
            'license_number' => 'DOC-CONTRACT-01',
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة الطفولة السعيدة',
            'address' => 'الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'phone' => '021223344',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);
    }

    public function test_public_directory_contract_matches_frontend_expectations(): void
    {
        $resDoctors = $this->getJson('/api/v1/doctors');
        $resDoctors->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'name', 'specialty', 'is_verified']]]);

        $resClinics = $this->getJson('/api/v1/clinics');
        $resClinics->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'name', 'address', 'wilaya', 'phone']]]);

        $resPackages = $this->getJson('/api/v1/booking-packages');
        $resPackages->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'name', 'quota_units', 'price_dzd']]]);
    }

    public function test_auth_lifecycle_contract_matches_frontend_expectations(): void
    {
        // 1. Login
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'doctor.contract@aafiya.dz',
            'password' => 'Password123!',
        ]);

        $loginRes->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'user' => ['id', 'name', 'email', 'roles', 'permissions'],
                    'token',
                    'token_type',
                ],
            ]);

        $token = $loginRes->json('data.token');

        // 2. Profile Me
        $meRes = $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/v1/auth/me');
        $meRes->assertStatus(200)
            ->assertJsonPath('data.email', 'doctor.contract@aafiya.dz');

        // 3. Logout
        $logoutRes = $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/v1/auth/logout');
        $logoutRes->assertStatus(200);
    }

    public function test_full_clinical_workflow_contract(): void
    {
        // 1. Create Patient
        $patient = Patient::create([
            'mrn' => 'MRN-2026-8888',
            'first_name' => 'ياسين',
            'last_name' => 'براهيمي',
            'gender' => 'male',
            'date_of_birth' => '1995-05-15',
            'phone' => '0555112233',
        ]);

        // 2. Doctor issues prescription
        $prescription = Prescription::create([
            'prescription_reference' => 'RX-2026-8888',
            'secure_token' => 'secure-contract-verification-token',
            'patient_id' => $patient->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'issue_date' => now()->format('Y-m-d'),
            'expiry_date' => now()->addDays(30)->format('Y-m-d'),
            'status' => 'active',
        ]);

        // 3. Public QR Verification contract
        $qrRes = $this->getJson("/api/v1/v/{$prescription->secure_token}");
        $qrRes->assertStatus(200)
            ->assertJsonPath('data.prescription_reference', 'RX-2026-8888')
            ->assertJsonPath('data.is_valid', true)
            ->assertJsonStructure(['data' => ['is_valid', 'prescription_reference', 'doctor_name', 'clinic_name', 'patient_name', 'issue_date', 'expiry_date']]);
    }
}
