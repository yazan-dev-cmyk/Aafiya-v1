<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\MedicalSpecialty;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class MedicalSpecialtyMasterDataTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->seed(DatabaseSeeder::class);
    }

    /**
     * Test 01: Specialties endpoint returns active 36-specialty catalog (RAD/PATH deactivated).
     */
    public function test_specialties_endpoint_returns_active_catalog(): void
    {
        $response = $this->getJson('/api/v1/master/specialties');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => [
                        'id',
                        'code',
                        'name_ar',
                        'name_fr',
                        'name_en',
                        'is_active',
                        'display_order',
                    ],
                ],
                'meta' => [
                    'total',
                ],
            ]);

        $this->assertEquals(36, $response->json('meta.total'));
        $data = $response->json('data');
        $this->assertCount(36, $data);
        $this->assertEquals('GP', $data[0]['code']);
        $this->assertEquals('CARD', $data[1]['code']);
    }

    /**
     * Test 02: Specialties search filters by localized name and code.
     */
    public function test_specialties_search_filters_results(): void
    {
        // Search by English name
        $response = $this->getJson('/api/v1/master/specialties?search=Cardiology');
        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertGreaterThanOrEqual(1, count($data));
        $this->assertEquals('CARD', $data[0]['code']);

        // Search by Arabic name
        Cache::flush();
        $responseAr = $this->getJson('/api/v1/master/specialties?search=' . urlencode('القلب'));
        $responseAr->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, count($responseAr->json('data')));

        // Search by code
        Cache::flush();
        $responseCode = $this->getJson('/api/v1/master/specialties?search=PED');
        $responseCode->assertStatus(200);
        $this->assertEquals('PED', $responseCode->json('data.0.code'));
    }

    /**
     * Test 03: Inactive specialties are excluded from public catalog.
     */
    public function test_inactive_specialties_excluded_from_endpoint(): void
    {
        $ped = MedicalSpecialty::where('code', 'PED')->firstOrFail();
        $ped->update(['is_active' => false]);
        Cache::flush();

        $response = $this->getJson('/api/v1/master/specialties');
        $response->assertStatus(200);
        $this->assertEquals(35, $response->json('meta.total'));

        $codes = collect($response->json('data'))->pluck('code')->all();
        $this->assertNotContains('PED', $codes);
    }

    /**
     * Test 04: Doctor registration requires specialty.
     */
    public function test_doctor_registration_requires_specialty(): void
    {
        $payload = [
            'name' => 'Dr. Unspecialized',
            'email' => 'unspec@example.com',
            'phone' => '+213555000111',
            'password' => 'secret1234',
            'role' => 'doctor',
            'license_number' => 'LIC-UNSPEC-001',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);
        $response->assertStatus(422);
    }

    /**
     * Test 05: Doctor registration with valid specialty_id succeeds and populates both fields.
     */
    public function test_doctor_registration_with_valid_specialty_id(): void
    {
        $card = MedicalSpecialty::where('code', 'CARD')->firstOrFail();

        $payload = [
            'name' => 'Dr. Salim Cardiologist',
            'email' => 'salim.cardio@example.com',
            'phone' => '+213555111222',
            'password' => 'secret1234',
            'role' => 'doctor',
            'specialty_id' => $card->id,
            'license_number' => 'LIC-SALIM-CARD-001',
            'clinic_name' => 'عيادة القلب التخصصية',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);
        $response->assertStatus(201);

        $doctor = Doctor::where('license_number', 'LIC-SALIM-CARD-001')->firstOrFail();
        $this->assertEquals($card->id, $doctor->specialty_id);
        $this->assertEquals($card->name_ar, $doctor->specialty);
    }

    /**
     * Test 06: Doctor registration with invalid specialty_id fails cleanly.
     */
    public function test_doctor_registration_with_invalid_specialty_id_fails(): void
    {
        $payload = [
            'name' => 'Dr. Invalid Spec',
            'email' => 'invalid.spec@example.com',
            'phone' => '+213555222333',
            'password' => 'secret1234',
            'role' => 'doctor',
            'specialty_id' => 99999,
            'license_number' => 'LIC-INV-001',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);
        $response->assertStatus(422);
    }

    /**
     * Test 07: Doctor registration with inactive specialty_id fails cleanly.
     */
    public function test_doctor_registration_with_inactive_specialty_id_fails(): void
    {
        $derm = MedicalSpecialty::where('code', 'DERM')->firstOrFail();
        $derm->update(['is_active' => false]);

        $payload = [
            'name' => 'Dr. Inactive Spec',
            'email' => 'inactive.spec@example.com',
            'phone' => '+213555333444',
            'password' => 'secret1234',
            'role' => 'doctor',
            'specialty_id' => $derm->id,
            'license_number' => 'LIC-INACT-001',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);
        $response->assertStatus(422);
    }

    /**
     * Test 08: Doctor directory filters accurately by specialty_id.
     */
    public function test_doctor_directory_filters_by_specialty_id(): void
    {
        $card = MedicalSpecialty::where('code', 'CARD')->firstOrFail();
        $ped = MedicalSpecialty::where('code', 'PED')->firstOrFail();

        // Create Doctor 1 (Cardiology)
        $user1 = User::create(['name' => 'Dr. One', 'email' => 'd1@test.com', 'phone' => '+213555001101', 'password' => 'sec', 'is_active' => true]);
        $user1->assignRole('doctor');
        Doctor::create(['user_id' => $user1->id, 'specialty_id' => $card->id, 'specialty' => 'Cardiology', 'license_number' => 'LIC-D1', 'is_verified' => true]);

        // Create Doctor 2 (Pediatrics)
        $user2 = User::create(['name' => 'Dr. Two', 'email' => 'd2@test.com', 'phone' => '+213555001102', 'password' => 'sec', 'is_active' => true]);
        $user2->assignRole('doctor');
        Doctor::create(['user_id' => $user2->id, 'specialty_id' => $ped->id, 'specialty' => 'Pediatrics', 'license_number' => 'LIC-D2', 'is_verified' => true]);

        // Filter by CARD specialty_id
        $resCard = $this->getJson("/api/v1/doctors?specialty_id={$card->id}");
        $resCard->assertStatus(200);
        $this->assertEquals(1, $resCard->json('meta.total'));
        $this->assertEquals('Dr. One', $resCard->json('data.0.name'));
        $this->assertEquals($card->id, $resCard->json('data.0.specialty_id'));
        $this->assertEquals('CARD', $resCard->json('data.0.medical_specialty.code'));

        // Filter by PED specialty_id
        $resPed = $this->getJson("/api/v1/doctors?specialty_id={$ped->id}");
        $resPed->assertStatus(200);
        $this->assertEquals(1, $resPed->json('meta.total'));
        $this->assertEquals('Dr. Two', $resPed->json('data.0.name'));
    }

    /**
     * Test 09: Doctor directory rejects invalid specialty_id cleanly with 422.
     */
    public function test_doctor_directory_rejects_invalid_specialty_id(): void
    {
        $response = $this->getJson('/api/v1/doctors?specialty_id=99999');
        $response->assertStatus(422)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('code', 422);

        $responseStr = $this->getJson('/api/v1/doctors?specialty_id=not-a-number');
        $responseStr->assertStatus(422);
    }

    /**
     * Test 10: Doctor public profile exposes canonical structured specialty.
     */
    public function test_doctor_public_profile_exposes_structured_specialty(): void
    {
        $orth = MedicalSpecialty::where('code', 'ORTH')->firstOrFail();
        $user = User::create(['name' => 'Dr. Orthopedic', 'email' => 'ortho@test.com', 'phone' => '+213555001103', 'password' => 'sec', 'is_active' => true]);
        $user->assignRole('doctor');
        $doctor = Doctor::create([
            'user_id' => $user->id,
            'specialty_id' => $orth->id,
            'specialty' => 'Orthopedics',
            'license_number' => 'LIC-ORTH-001',
            'is_verified' => true,
        ]);

        $response = $this->getJson("/api/v1/doctors/{$doctor->id}");
        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.specialty', 'Orthopedics')
            ->assertJsonPath('data.specialty_id', $orth->id)
            ->assertJsonPath('data.medical_specialty.code', 'ORTH')
            ->assertJsonPath('data.medical_specialty.name_en', 'Orthopedics')
            ->assertJsonPath('data.medical_specialty.name_ar', $orth->name_ar)
            ->assertJsonPath('data.medical_specialty.name_fr', $orth->name_fr);
    }

    /**
     * Test 11: Clinic directory discovers clinics through doctor specialty affiliation.
     */
    public function test_clinic_directory_filters_by_doctor_specialty_id(): void
    {
        $card = MedicalSpecialty::where('code', 'CARD')->firstOrFail();
        $gastro = MedicalSpecialty::where('code', 'GASTRO')->firstOrFail();

        // Clinic 1: Director is Cardiologist
        $uDir1 = User::create(['name' => 'Dr. Card Director', 'email' => 'c1@test.com', 'phone' => '+213555002101', 'password' => 'sec', 'is_active' => true]);
        $uDir1->assignRole('doctor');
        $doc1 = Doctor::create(['user_id' => $uDir1->id, 'specialty_id' => $card->id, 'specialty' => 'Cardiology', 'license_number' => 'LIC-CD-1', 'is_verified' => true]);
        $clinic1 = Clinic::create(['name' => 'Cardio Care Clinic', 'address' => 'Algiers', 'wilaya' => '16', 'phone' => '+21321000001', 'director_doctor_id' => $doc1->id, 'is_active' => true]);
        DoctorClinic::create(['doctor_id' => $doc1->id, 'clinic_id' => $clinic1->id, 'position' => 'director', 'is_active' => true]);

        // Clinic 2: Director is Gastro
        $uDir2 = User::create(['name' => 'Dr. Gastro Director', 'email' => 'c2@test.com', 'phone' => '+213555002102', 'password' => 'sec', 'is_active' => true]);
        $uDir2->assignRole('doctor');
        $doc2 = Doctor::create(['user_id' => $uDir2->id, 'specialty_id' => $gastro->id, 'specialty' => 'Gastroenterology', 'license_number' => 'LIC-GD-1', 'is_verified' => true]);
        $clinic2 = Clinic::create(['name' => 'Digestive Health Clinic', 'address' => 'Oran', 'wilaya' => '31', 'phone' => '+21341000002', 'director_doctor_id' => $doc2->id, 'is_active' => true]);
        DoctorClinic::create(['doctor_id' => $doc2->id, 'clinic_id' => $clinic2->id, 'position' => 'director', 'is_active' => true]);

        // Filter clinics by CARD specialty_id
        $resCard = $this->getJson("/api/v1/clinics?specialty_id={$card->id}");
        $resCard->assertStatus(200);
        $this->assertEquals(1, $resCard->json('meta.total'));
        $this->assertEquals('Cardio Care Clinic', $resCard->json('data.0.name'));

        // Filter clinics by GASTRO specialty_id
        $resGastro = $this->getJson("/api/v1/clinics?specialty_id={$gastro->id}");
        $resGastro->assertStatus(200);
        $this->assertEquals(1, $resGastro->json('meta.total'));
        $this->assertEquals('Digestive Health Clinic', $resGastro->json('data.0.name'));
    }

    /**
     * Test 12: Backward compatibility auto-resolves legacy specialty strings on registration.
     */
    public function test_backward_compatibility_legacy_specialty_string_resolution(): void
    {
        $payload = [
            'name' => 'Dr. Legacy Client',
            'email' => 'legacy.client@example.com',
            'phone' => '+213555999888',
            'password' => 'secret1234',
            'role' => 'doctor',
            'specialty' => 'Cardiology', // Legacy string without specialty_id
            'license_number' => 'LIC-LEG-001',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);
        $response->assertStatus(201);

        $doctor = Doctor::where('license_number', 'LIC-LEG-001')->firstOrFail();
        $this->assertEquals('Cardiology', $doctor->specialty);
        $this->assertNotNull($doctor->specialty_id);
        $this->assertEquals('CARD', $doctor->medicalSpecialty->code);
    }
}
