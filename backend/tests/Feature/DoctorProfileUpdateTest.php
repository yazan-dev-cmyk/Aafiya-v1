<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\MedicalSpecialty;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DoctorProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    /**
     * Helper to create an authenticated doctor user with an associated doctor model and token.
     */
    protected function createDoctorUser(array $userAttributes = [], array $doctorAttributes = []): array
    {
        $specialty = MedicalSpecialty::where('code', 'CARD')->first()
            ?? MedicalSpecialty::first();

        $user = User::factory()->create(array_merge([
            'name' => 'د. كمال بن علي',
            'email' => 'dr.kamal@aafiya.dz',
            'phone' => '+213550111222',
            'password' => Hash::make('Password123!'),
            'is_active' => true,
        ], $userAttributes));

        $user->assignRole('doctor');

        $doctor = Doctor::create(array_merge([
            'user_id' => $user->id,
            'specialty' => $specialty->name_ar,
            'specialty_id' => $specialty->id,
            'license_number' => 'DZ-ALG-CARD-' . substr(md5(uniqid()), 0, 8),
            'bio' => 'طبيب متخصص في أمراض القلب والشرايين',
            'is_verified' => true,
        ], $doctorAttributes));

        $token = $user->createToken('auth')->plainTextToken;

        return [$user, $doctor, $token];
    }

    /**
     * 1. Unauthenticated request returns HTTP 401.
     */
    public function test_unauthenticated_request_returns_401(): void
    {
        $response = $this->putJson('/api/v1/doctor/profile', [
            'name' => 'د. حسان الجديد',
        ]);

        $response->assertStatus(401);
    }

    /**
     * 2. Authenticated non-doctor request returns HTTP 403.
     */
    public function test_authenticated_non_doctor_returns_403(): void
    {
        $patient = User::factory()->create([
            'email' => 'patient@aafiya.dz',
            'phone' => '+213550333444',
            'is_active' => true,
        ]);
        $patient->assignRole('patient_registered');

        $token = $patient->createToken('auth')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/doctor/profile', [
                'name' => 'تعديل اسم غير مصرح',
            ]);

        $response->assertStatus(403);
    }

    /**
     * Authenticated user with doctor role but missing doctor record returns HTTP 403.
     */
    public function test_authenticated_doctor_missing_doctor_record_returns_403(): void
    {
        $user = User::factory()->create([
            'email' => 'orphaned.doctor@aafiya.dz',
            'phone' => '+213550999000',
            'is_active' => true,
        ]);
        $user->assignRole('doctor');

        $token = $user->createToken('auth')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/doctor/profile', [
                'name' => 'طبيب بدون سجل',
            ]);

        $response->assertStatus(403);
    }

    /**
     * 3. Doctor can update all four permitted fields.
     */
    public function test_doctor_can_update_all_permitted_fields(): void
    {
        [$user, $doctor, $token] = $this->createDoctorUser();

        $newSpecialty = MedicalSpecialty::where('code', 'PED')->firstOrFail();

        $payload = [
            'name' => 'د. كمال المنصوري',
            'phone' => '+213550777888',
            'specialty_id' => $newSpecialty->id,
            'bio' => 'طبيب أطفال متخصص بخبرة عشر سنوات في رعاية حديثي الولادة.',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/doctor/profile', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('message', 'تم تحديث الملف الشخصي بنجاح.')
            ->assertJsonPath('data.name', 'د. كمال المنصوري')
            ->assertJsonPath('data.phone', '+213550777888')
            ->assertJsonPath('data.doctor.specialty', $newSpecialty->name_ar)
            ->assertJsonPath('data.doctor.bio', $payload['bio']);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'د. كمال المنصوري',
            'phone' => '+213550777888',
        ]);

        $this->assertDatabaseHas('doctors', [
            'id' => $doctor->id,
            'specialty_id' => $newSpecialty->id,
            'specialty' => $newSpecialty->name_ar,
            'bio' => $payload['bio'],
        ]);
    }

    /**
     * 4. Partial update preserves omitted fields.
     */
    public function test_partial_update_preserves_omitted_fields(): void
    {
        [$user, $doctor, $token] = $this->createDoctorUser([
            'name' => 'د. محفوظ قدور',
            'phone' => '+213550112233',
        ], [
            'bio' => 'نبذة سابقة محفوظة',
        ]);

        $initialSpecialtyId = $doctor->specialty_id;
        $initialSpecialtyStr = $doctor->specialty;

        // Update ONLY name
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/doctor/profile', [
                'name' => 'د. محفوظ قدور المحدث',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'د. محفوظ قدور المحدث')
            ->assertJsonPath('data.phone', '+213550112233')
            ->assertJsonPath('data.doctor.bio', 'نبذة سابقة محفوظة');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'د. محفوظ قدور المحدث',
            'phone' => '+213550112233',
        ]);

        $this->assertDatabaseHas('doctors', [
            'id' => $doctor->id,
            'specialty_id' => $initialSpecialtyId,
            'specialty' => $initialSpecialtyStr,
            'bio' => 'نبذة سابقة محفوظة',
        ]);
    }

    /**
     * 5. Email modification is rejected and does not change the database.
     */
    public function test_email_modification_is_rejected_and_database_unchanged(): void
    {
        [$user, $doctor, $token] = $this->createDoctorUser([
            'email' => 'original.doctor@aafiya.dz',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/doctor/profile', [
                'name' => 'د. اسم جديد',
                'email' => 'hacked.doctor@aafiya.dz',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email' => 'original.doctor@aafiya.dz',
        ]);

        $this->assertDatabaseMissing('users', [
            'email' => 'hacked.doctor@aafiya.dz',
        ]);
    }

    /**
     * 6. License number modification is rejected and does not change the database.
     */
    public function test_license_number_modification_is_rejected_and_database_unchanged(): void
    {
        [$user, $doctor, $token] = $this->createDoctorUser([], [
            'license_number' => 'DZ-ALG-ORIGINAL-999',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/doctor/profile', [
                'license_number' => 'DZ-FORGED-LICENSE-000',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['license_number']);

        $this->assertDatabaseHas('doctors', [
            'id' => $doctor->id,
            'license_number' => 'DZ-ALG-ORIGINAL-999',
        ]);

        $this->assertDatabaseMissing('doctors', [
            'license_number' => 'DZ-FORGED-LICENSE-000',
        ]);
    }

    /**
     * 7. Inactive or nonexistent specialty is rejected.
     */
    public function test_inactive_or_nonexistent_specialty_is_rejected(): void
    {
        [$user, $doctor, $token] = $this->createDoctorUser();

        // 7a. Non-existent ID
        $responseNonExistent = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/doctor/profile', [
                'specialty_id' => 99999,
            ]);

        $responseNonExistent->assertStatus(422)
            ->assertJsonValidationErrors(['specialty_id']);

        // 7b. Inactive specialty
        $inactiveSpecialty = MedicalSpecialty::create([
            'code' => 'INACT',
            'name_ar' => 'تخصص معطل تجريبي',
            'name_fr' => 'Spécialité inactive',
            'name_en' => 'Inactive Specialty',
            'is_active' => false,
            'display_order' => 999,
        ]);

        $responseInactive = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/doctor/profile', [
                'specialty_id' => $inactiveSpecialty->id,
            ]);

        $responseInactive->assertStatus(422)
            ->assertJsonValidationErrors(['specialty_id']);
    }

    /**
     * 8. Duplicate phone number is rejected.
     */
    public function test_duplicate_phone_number_is_rejected(): void
    {
        // Existing user taking the phone number
        User::factory()->create([
            'phone' => '+213550999888',
            'email' => 'other.user@aafiya.dz',
            'is_active' => true,
        ]);

        [$user, $doctor, $token] = $this->createDoctorUser([
            'phone' => '+213550111222',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/doctor/profile', [
                'phone' => '+213550999888',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'phone' => '+213550111222',
        ]);
    }

    /**
     * 9. Existing phone number belonging to the same user is accepted.
     */
    public function test_existing_phone_number_belonging_to_same_user_is_accepted(): void
    {
        [$user, $doctor, $token] = $this->createDoctorUser([
            'phone' => '+213550111222',
            'name' => 'د. سمير حمداوي',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/doctor/profile', [
                'name' => 'د. سمير حمداوي المحدث',
                'phone' => '+213550111222', // Same phone resubmitted
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'د. سمير حمداوي المحدث')
            ->assertJsonPath('data.phone', '+213550111222');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'د. سمير حمداوي المحدث',
            'phone' => '+213550111222',
        ]);
    }

    /**
     * 10. A doctor associated with multiple clinics can update their profile without X-Clinic-ID.
     */
    public function test_multi_clinic_doctor_can_update_profile_without_clinic_header(): void
    {
        [$user, $doctor, $token] = $this->createDoctorUser();

        // Create two clinics and affiliate doctor to both
        $clinicA = Clinic::create([
            'name' => 'عيادة الشفاء 1',
            'wilaya' => 'الجزائر العاصمة',
            'address' => 'الجزائر العاصمة',
            'phone' => '+213550100001',
            'is_active' => true,
        ]);
        $clinicB = Clinic::create([
            'name' => 'عيادة الشفاء 2',
            'wilaya' => 'الجزائر العاصمة',
            'address' => 'الجزائر العاصمة',
            'phone' => '+213550100002',
            'is_active' => true,
        ]);

        DoctorClinic::create([
            'doctor_id' => $doctor->id,
            'clinic_id' => $clinicA->id,
            'position' => 'doctor',
            'is_active' => true,
            'is_primary' => true,
            'joined_at' => now(),
        ]);

        DoctorClinic::create([
            'doctor_id' => $doctor->id,
            'clinic_id' => $clinicB->id,
            'position' => 'doctor',
            'is_active' => true,
            'is_primary' => false,
            'joined_at' => now(),
        ]);

        $this->assertCount(2, $doctor->fresh()->clinics);

        // Call PUT /doctor/profile WITHOUT X-Clinic-ID header
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/doctor/profile', [
                'name' => 'د. كمال متعدد العيادات',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'د. كمال متعدد العيادات');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'د. كمال متعدد العيادات',
        ]);
    }

    /**
     * 11. is_verified and caller-supplied identity fields cannot be manipulated.
     */
    public function test_prohibited_identity_and_verification_fields_cannot_be_manipulated(): void
    {
        [$user, $doctor, $token] = $this->createDoctorUser([], [
            'is_verified' => false,
        ]);

        $fakeId = '00000000-0000-0000-0000-000000000000';

        // 11a. Test is_verified manipulation attempt
        $resVerified = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/doctor/profile', [
                'is_verified' => true,
            ]);

        $resVerified->assertStatus(422)
            ->assertJsonValidationErrors(['is_verified']);

        // 11b. Test caller-supplied id tampering
        $resId = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/doctor/profile', [
                'id' => $fakeId,
            ]);

        $resId->assertStatus(422)
            ->assertJsonValidationErrors(['id']);

        // 11c. Test caller-supplied user_id tampering
        $resUserId = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/doctor/profile', [
                'user_id' => $fakeId,
            ]);

        $resUserId->assertStatus(422)
            ->assertJsonValidationErrors(['user_id']);

        // 11d. Test caller-supplied doctor_id tampering
        $resDoctorId = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/doctor/profile', [
                'doctor_id' => $fakeId,
            ]);

        $resDoctorId->assertStatus(422)
            ->assertJsonValidationErrors(['doctor_id']);

        // Confirm doctor remains unverified in database
        $this->assertDatabaseHas('doctors', [
            'id' => $doctor->id,
            'is_verified' => false,
        ]);
    }

    /**
     * 12. Bio can be set to null to clear existing bio.
     */
    public function test_bio_can_be_cleared_by_sending_null(): void
    {
        [$user, $doctor, $token] = $this->createDoctorUser([], [
            'bio' => 'نبذة أولية موجودة',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/doctor/profile', [
                'bio' => null,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.doctor.bio', null);

        $this->assertDatabaseHas('doctors', [
            'id' => $doctor->id,
            'bio' => null,
        ]);
    }

    /**
     * 13. Database transaction rollback prevents partial updates if downstream error occurs.
     */
    public function test_transaction_rollback_prevents_partial_updates_on_failure(): void
    {
        [$user, $doctor, $token] = $this->createDoctorUser([
            'name' => 'الاسم الأصلي المحمي',
        ], [
            'bio' => 'النبذة الأصلية المحمية',
        ]);

        // Mock Doctor model saving to throw an exception during update
        Doctor::saving(function ($doc) {
            if ($doc->isDirty('bio') && $doc->bio === 'TRIGGER_TRANSACTION_ROLLBACK') {
                throw new \RuntimeException('Simulated failure during doctor profile persistence');
            }
        });

        try {
            $this->withHeader('Authorization', 'Bearer ' . $token)
                ->putJson('/api/v1/doctor/profile', [
                    'name' => 'اسم معدل يفترض أن يتراجع',
                    'bio' => 'TRIGGER_TRANSACTION_ROLLBACK',
                ]);
        } catch (\RuntimeException $e) {
            // Expected simulation exception
        }

        // Verify users.name rolled back and was NOT partially committed
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'الاسم الأصلي المحمي',
        ]);

        $this->assertDatabaseMissing('users', [
            'name' => 'اسم معدل يفترض أن يتراجع',
        ]);
    }
}
