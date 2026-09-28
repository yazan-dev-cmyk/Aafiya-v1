<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClinicTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_doctor_can_create_clinic_and_becomes_director(): void
    {
        $user = User::factory()->create();
        $user->assignRole('doctor');
        $doctor = Doctor::create([
            'user_id' => $user->id,
            'specialty' => 'Cardiology',
            'license_number' => 'DOC-ALG-12345',
            'is_verified' => true,
        ]);

        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/clinics', [
                'name' => 'El Chifa Cardiology Clinic',
                'address' => '12 Didouche Mourad',
                'wilaya' => 'Algiers',
                'phone' => '+21321000111',
                'max_patients_per_slot' => 2,
                'slot_duration_min' => 20,
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'id',
                    'name',
                    'address',
                    'wilaya',
                    'phone',
                    'director' => ['id', 'name', 'specialty'],
                ],
            ]);

        $clinicId = $response->json('data.id');

        $this->assertDatabaseHas('clinics', [
            'id' => $clinicId,
            'name' => 'El Chifa Cardiology Clinic',
            'director_doctor_id' => $doctor->id,
        ]);

        $this->assertDatabaseHas('doctor_clinic', [
            'doctor_id' => $doctor->id,
            'clinic_id' => $clinicId,
            'position' => 'director',
            'is_primary' => true,
        ]);
    }

    public function test_director_can_update_clinic_settings(): void
    {
        $directorUser = User::factory()->create();
        $directorUser->assignRole('doctor');
        $directorDoctor = Doctor::create([
            'user_id' => $directorUser->id,
            'specialty' => 'Pediatrics',
            'license_number' => 'PED-ALG-99887',
            'is_verified' => true,
        ]);

        $clinic = Clinic::create([
            'name' => 'Pediatric Health Center',
            'address' => 'Center Street 5',
            'wilaya' => 'Oran',
            'phone' => '+21341000222',
            'director_doctor_id' => $directorDoctor->id,
            'max_patients_per_slot' => 1,
            'slot_duration_min' => 15,
        ]);

        $clinic->doctors()->attach($directorDoctor->id, [
            'position' => 'director',
            'is_primary' => true,
            'joined_at' => now(),
        ]);

        $directorToken = $directorUser->createToken('dir_token')->plainTextToken;
        $response = $this->withHeader('Authorization', "Bearer {$directorToken}")
            ->putJson("/api/v1/clinics/{$clinic->id}", [
                'name' => 'Updated Pediatric Center',
                'slot_duration_min' => 30,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'name' => 'Updated Pediatric Center',
                    'slot_duration_min' => 30,
                ],
            ]);
    }

    public function test_employed_doctor_cannot_update_clinic_settings(): void
    {
        $directorUser = User::factory()->create();
        $directorUser->assignRole('doctor');
        $directorDoctor = Doctor::create([
            'user_id' => $directorUser->id,
            'specialty' => 'Pediatrics',
            'license_number' => 'PED-ALG-99887',
            'is_verified' => true,
        ]);

        $clinic = Clinic::create([
            'name' => 'Pediatric Health Center',
            'address' => 'Center Street 5',
            'wilaya' => 'Oran',
            'phone' => '+21341000222',
            'director_doctor_id' => $directorDoctor->id,
            'max_patients_per_slot' => 1,
            'slot_duration_min' => 15,
        ]);

        $clinic->doctors()->attach($directorDoctor->id, [
            'position' => 'director',
            'is_primary' => true,
            'joined_at' => now(),
        ]);

        $employedUser = User::factory()->create();
        $employedUser->assignRole('doctor');
        $employedDoctor = Doctor::create([
            'user_id' => $employedUser->id,
            'specialty' => 'General Medicine',
            'license_number' => 'GEN-ALG-33445',
            'is_verified' => true,
        ]);

        $clinic->doctors()->attach($employedDoctor->id, [
            'position' => 'doctor',
            'is_primary' => false,
            'joined_at' => now(),
        ]);

        $employedToken = $employedUser->createToken('emp_token')->plainTextToken;
        $response = $this->withHeader('Authorization', "Bearer {$employedToken}")
            ->putJson("/api/v1/clinics/{$clinic->id}", [
                'name' => 'Unauthorized Update Name',
            ]);

        $response->assertStatus(403);
    }

    public function test_director_can_create_assistant_with_sanitized_delegated_permissions(): void
    {
        $directorUser = User::factory()->create();
        $directorUser->assignRole('doctor');
        $directorDoctor = Doctor::create([
            'user_id' => $directorUser->id,
            'specialty' => 'Dermatology',
            'license_number' => 'DER-ALG-77665',
            'is_verified' => true,
        ]);

        $clinic = Clinic::create([
            'name' => 'Derma Care Clinic',
            'address' => 'Boulevard 10',
            'wilaya' => 'Constantine',
            'phone' => '+21331000333',
            'director_doctor_id' => $directorDoctor->id,
        ]);

        $clinic->doctors()->attach($directorDoctor->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        $directorToken = $directorUser->createToken('dir_token')->plainTextToken;

        // Director tries to delegate both allowed and forbidden permissions
        $response = $this->withHeader('Authorization', "Bearer {$directorToken}")
            ->postJson("/api/v1/clinics/{$clinic->id}/assistants", [
                'name' => 'Fatima Assistant',
                'email' => 'fatima.assistant@aafiya.dz',
                'phone' => '+213666777888',
                'password' => 'SecurePass123!',
                'permissions_json' => [
                    'booking.manage_queue',
                    'clinical.write_rx', // FORBIDDEN by Hard Ceiling!
                    'booking.confirm_attendance',
                    'clinic.view_analytics', // FORBIDDEN by Hard Ceiling!
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'status',
                'data' => ['id', 'user_id', 'delegated_permissions'],
            ]);

        $assistantId = $response->json('data.id');
        $assistant = ClinicAssistant::find($assistantId);

        // Forbidden permissions must have been stripped out
        $this->assertEquals([
            'booking.manage_queue',
            'booking.confirm_attendance',
        ], $assistant->permissions_json);

        $this->assertFalse(in_array('clinical.write_rx', $assistant->permissions_json, true));
        $this->assertFalse(in_array('clinic.view_analytics', $assistant->permissions_json, true));
    }

    public function test_public_doctor_profile_endpoint_exposes_only_safe_data(): void
    {
        $user = User::factory()->create([
            'name' => 'Dr. Yassine Mansouri',
            'email' => 'private.email@aafiya.dz',
            'phone' => '+213555112233',
            'password' => bcrypt('SuperSecretPassword!'),
        ]);
        $user->assignRole('doctor');

        $doctor = Doctor::create([
            'user_id' => $user->id,
            'specialty' => 'Neurology',
            'license_number' => 'NEU-ALG-88990',
            'bio' => 'Senior Consultant Neurologist',
            'is_verified' => true,
        ]);

        $response = $this->getJson("/api/v1/doctors/{$doctor->id}");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'id' => $doctor->id,
                    'name' => 'Dr. Yassine Mansouri',
                    'specialty' => 'Neurology',
                    'bio' => 'Senior Consultant Neurologist',
                    'is_verified' => true,
                ],
            ]);

        // Private / Sensitive data MUST NOT be exposed
        $this->assertArrayNotHasKey('password', $response->json('data'));
        $this->assertArrayNotHasKey('license_number', $response->json('data'));
    }

    public function test_clinics_pagination_contract_and_page_isolation(): void
    {
        for ($i = 0; $i < 25; $i++) {
            Clinic::create([
                'name' => "Clinic {$i}",
                'address' => "Street {$i}",
                'wilaya' => 'Algiers',
                'phone' => "+2132100" . str_pad((string)$i, 3, '0', STR_PAD_LEFT),
                'is_active' => true,
            ]);
        }

        $resPage1 = $this->getJson('/api/v1/clinics?page=1&per_page=10');

        $resPage1->assertStatus(200)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 10);

        $data1 = $resPage1->json('data');
        $this->assertCount(10, $data1);
        $page1Ids = array_column($data1, 'id');

        $resPage2 = $this->getJson('/api/v1/clinics?page=2&per_page=10');

        $resPage2->assertStatus(200)
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 10);

        $data2 = $resPage2->json('data');
        $this->assertCount(10, $data2);
        $page2Ids = array_column($data2, 'id');

        $overlap = array_intersect($page1Ids, $page2Ids);
        $this->assertEmpty($overlap, 'Clinics Page 1 and Page 2 must not overlap.');
    }
}
