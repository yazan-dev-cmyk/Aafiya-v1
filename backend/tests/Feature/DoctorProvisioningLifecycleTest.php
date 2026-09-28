<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\User;
use App\Services\ClinicService;
use App\Services\DoctorProvisioningService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class DoctorProvisioningLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    /**
     * Test 1: Successful atomic provisioning creates User, Role, Doctor, and Clinic.
     */
    public function test_successful_atomic_doctor_provisioning(): void
    {
        $response = $this->postJson('/api/v1/auth/register-doctor', [
            'name' => 'د. حسان بوعلام',
            'email' => 'dr.hassan@aafiya.dz',
            'phone' => '+213550112233',
            'password' => 'SecurePass2026!',
            'specialty' => 'طب الأطفال (Pediatrics)',
            'license_number' => 'DZ-ALG-2026-PED-001',
            'bio' => 'طبيب أطفال بخبرة 15 عاماً',
            'clinic_name' => 'عيادة الطفولة السعيدة',
            'wilaya' => 'الجزائر العاصمة',
            'address' => 'حي العربي بن مهيدي، الجزائر',
            'clinic_phone' => '+213550112233',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'user' => ['id', 'name', 'email', 'roles', 'doctor'],
                    'token',
                    'token_type',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'dr.hassan@aafiya.dz',
            'is_active' => true,
        ]);

        $user = User::where('email', 'dr.hassan@aafiya.dz')->first();
        $this->assertTrue($user->hasRole('doctor'));
        $this->assertNotNull($user->doctor);
        $this->assertEquals('DZ-ALG-2026-PED-001', $user->doctor->license_number);
        $this->assertFalse($user->doctor->is_verified);

        // Verify Clinic Director binding
        $clinic = Clinic::where('name', 'عيادة الطفولة السعيدة')->first();
        $this->assertNotNull($clinic);
        $this->assertEquals($user->doctor->id, $clinic->director_doctor_id);

        $this->assertDatabaseHas('doctor_clinic', [
            'doctor_id' => $user->doctor->id,
            'clinic_id' => $clinic->id,
            'position' => 'director',
            'is_primary' => true,
        ]);
    }

    /**
     * Test 2: Self-registration always creates Clinic Owner / Director and cannot downgrade.
     */
    public function test_self_registration_always_creates_director_and_cannot_downgrade(): void
    {
        $response = $this->postJson('/api/v1/auth/register-doctor', [
            'name' => 'د. عادل عماري',
            'email' => 'dr.adel@aafiya.dz',
            'phone' => '+213550445566',
            'password' => 'SecurePass2026!',
            'specialty' => 'طب عام',
            'license_number' => 'DZ-ALG-2026-GEN-002',
            'clinic_name' => 'عيادة الأمل',
            'position' => 'doctor', // Client attempt to downgrade
            'role' => 'employee',   // Client attempt to downgrade
        ]);

        $response->assertStatus(201);

        $user = User::where('email', 'dr.adel@aafiya.dz')->first();
        $this->assertNotNull($user->doctor);
        
        $clinic = Clinic::where('name', 'عيادة الأمل')->first();
        $this->assertEquals($user->doctor->id, $clinic->director_doctor_id);

        $pivot = DoctorClinic::where('doctor_id', $user->doctor->id)->first();
        $this->assertEquals('director', $pivot->position, 'Self-registered doctor must always be director');
        $this->assertTrue($pivot->is_primary);
    }

    /**
     * Test 3: Doctor provisioning rolls back completely on transaction failure (no orphans).
     */
    public function test_doctor_provisioning_rollback_on_failure(): void
    {
        $existingDoctorUser = User::factory()->create(['email' => 'existing.doc@aafiya.dz']);
        $existingDoctorUser->assignRole('doctor');
        Doctor::create([
            'user_id' => $existingDoctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DUPLICATE-LICENSE-999',
            'is_verified' => true,
        ]);

        $initialUserCount = User::count();
        $initialDoctorCount = Doctor::count();

        $response = $this->postJson('/api/v1/auth/register-doctor', [
            'name' => 'د. سليم كمال',
            'email' => 'dr.salim@aafiya.dz',
            'phone' => '+213550998877',
            'password' => 'SecurePass2026!',
            'specialty' => 'طب عام',
            'license_number' => 'DUPLICATE-LICENSE-999',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['license_number']);

        $this->assertEquals($initialUserCount, User::count());
        $this->assertEquals($initialDoctorCount, Doctor::count());
        $this->assertDatabaseMissing('users', ['email' => 'dr.salim@aafiya.dz']);
    }

    /**
     * Test 4: Doctor registration via general register endpoint requires doctor profile data.
     */
    public function test_doctor_registration_requires_profile_data(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'د. غير مكتمل',
            'email' => 'incomplete.doc@aafiya.dz',
            'phone' => '+213550443322',
            'password' => 'SecurePass2026!',
            'role' => 'doctor',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['doctor_profile']);

        $this->assertDatabaseMissing('users', ['email' => 'incomplete.doc@aafiya.dz']);
    }

    /**
     * Test 5: Existing authenticated doctor User can complete onboarding profile.
     */
    public function test_authenticated_doctor_can_onboard_profile(): void
    {
        $user = User::factory()->create([
            'email' => 'pending.doctor@aafiya.dz',
            'password' => Hash::make('Secret2026!'),
            'is_active' => true,
        ]);
        $user->assignRole('doctor');

        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'pending.doctor@aafiya.dz',
            'password' => 'Secret2026!',
        ]);
        $token = $loginRes->json('data.token');

        $onboardRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/doctors/onboard', [
                'specialty' => 'جراحة العظام (Orthopedics)',
                'license_number' => 'DZ-ALG-2026-ORT-777',
                'bio' => 'جراح عظام ومفاصل',
                'clinic_name' => 'مركز العظام المتخصص',
                'wilaya' => 'الجزائر العاصمة',
                'address' => 'شارع ديدوش مراد',
            ]);

        $onboardRes->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('doctors', [
            'user_id' => $user->id,
            'specialty' => 'جراحة العظام (Orthopedics)',
            'license_number' => 'DZ-ALG-2026-ORT-777',
            'is_verified' => true,
        ]);

        $clinic = Clinic::where('name', 'مركز العظام المتخصص')->first();
        $this->assertNotNull($clinic);
        $this->assertEquals($user->fresh()->doctor->id, $clinic->director_doctor_id);
    }

    /**
     * Test 6: Onboarding status reports correct states across lifecycle.
     */
    public function test_onboarding_status_reports_correct_state(): void
    {
        $user = User::factory()->create([
            'email' => 'status.doctor@aafiya.dz',
            'password' => Hash::make('Secret2026!'),
        ]);
        $user->assignRole('doctor');

        $token = $user->createToken('test_token')->plainTextToken;

        // 1. Before onboarding (pending_profile)
        $statusRes1 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/doctors/onboarding-status');

        $statusRes1->assertStatus(200)
            ->assertJsonPath('data.has_doctor_role', true)
            ->assertJsonPath('data.has_doctor_profile', false)
            ->assertJsonPath('data.provisioning_state', 'pending_profile');

        // 2. Onboard profile
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/doctors/onboard', [
                'specialty' => 'أمراض العيون (Ophthalmology)',
                'license_number' => 'DZ-ALG-2026-OPH-001',
            ]);

        // 3. After onboarding (complete)
        $statusRes2 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/doctors/onboarding-status');

        $statusRes2->assertStatus(200)
            ->assertJsonPath('data.has_doctor_profile', true)
            ->assertJsonPath('data.is_profile_complete', true)
            ->assertJsonPath('data.provisioning_state', 'complete')
            ->assertJsonPath('data.doctor_profile.specialty', 'أمراض العيون (Ophthalmology)');
    }

    /**
     * Test 7: Clinic Director can create an Employed Doctor for their clinic.
     */
    public function test_clinic_director_can_create_employed_doctor(): void
    {
        // 1. Create Director and Clinic
        $directorUser = User::factory()->create(['email' => 'director.owner@aafiya.dz']);
        $directorUser->assignRole('doctor');
        $directorDoctor = Doctor::create([
            'user_id' => $directorUser->id,
            'specialty' => 'Cardiology',
            'license_number' => 'DZ-DIR-001',
            'is_verified' => true,
        ]);
        $clinic = Clinic::create([
            'name' => 'عيادة القلب المتطورة',
            'address' => 'الجزائر',
            'wilaya' => 'الجزائر العاصمة',
            'phone' => '+213550001122',
            'director_doctor_id' => $directorDoctor->id,
        ]);
        DoctorClinic::create([
            'doctor_id' => $directorDoctor->id,
            'clinic_id' => $clinic->id,
            'position' => 'director',
            'is_primary' => true,
        ]);

        $directorToken = $directorUser->createToken('dir_token')->plainTextToken;

        // 2. Director creates an Employed Doctor
        $initialPassword = 'InitialSecret2026!';
        $response = $this->withHeader('Authorization', 'Bearer ' . $directorToken)
            ->postJson("/api/v1/clinics/{$clinic->id}/doctors", [
                'name' => 'د. موظف ممارس',
                'email' => 'employed.doctor@aafiya.dz',
                'phone' => '+213550998811',
                'password' => $initialPassword,
                'specialty' => 'طب القلب التداخلي',
                'license_number' => 'DZ-EMP-001',
                'bio' => 'طبيب مساعد في عيادة القلب',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success');

        // 3. Verify Database
        $employedUser = User::where('email', 'employed.doctor@aafiya.dz')->first();
        $this->assertNotNull($employedUser);
        $this->assertTrue($employedUser->hasRole('doctor'));
        $this->assertTrue($employedUser->is_active);

        $employedDoctor = $employedUser->doctor;
        $this->assertNotNull($employedDoctor);
        $this->assertEquals('DZ-EMP-001', $employedDoctor->license_number);

        // 4. Verify Employed Doctor is NOT director
        $pivot = DoctorClinic::where('doctor_id', $employedDoctor->id)->first();
        $this->assertNotNull($pivot);
        $this->assertEquals('doctor', $pivot->position);
        $this->assertFalse($pivot->is_primary);

        // Director of the clinic must NOT change
        $this->assertEquals($directorDoctor->id, $clinic->fresh()->director_doctor_id);
    }

    /**
     * Test 8: Employed doctor cannot create other doctors or manage clinic (403).
     */
    public function test_employed_doctor_cannot_create_another_doctor_or_manage_clinic(): void
    {
        $directorUser = User::factory()->create();
        $directorUser->assignRole('doctor');
        $directorDoctor = Doctor::create([
            'user_id' => $directorUser->id,
            'specialty' => 'General',
            'license_number' => 'DIR-LIC-100',
            'is_verified' => true,
        ]);
        $clinic = Clinic::create([
            'name' => 'العيادة المركزية',
            'address' => 'الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '+213550111111',
            'director_doctor_id' => $directorDoctor->id,
        ]);
        DoctorClinic::create([
            'doctor_id' => $directorDoctor->id,
            'clinic_id' => $clinic->id,
            'position' => 'director',
            'is_primary' => true,
        ]);

        // Employed Doctor
        $employedUser = User::factory()->create();
        $employedUser->assignRole('doctor');
        $employedDoctor = Doctor::create([
            'user_id' => $employedUser->id,
            'specialty' => 'Dermatology',
            'license_number' => 'EMP-LIC-200',
            'is_verified' => true,
        ]);
        DoctorClinic::create([
            'doctor_id' => $employedDoctor->id,
            'clinic_id' => $clinic->id,
            'position' => 'doctor',
            'is_primary' => false,
        ]);

        $employedToken = $employedUser->createToken('emp_token')->plainTextToken;

        // 1. Employed Doctor attempts to create staff/doctor -> 403 Forbidden
        $response1 = $this->withHeader('Authorization', 'Bearer ' . $employedToken)
            ->postJson("/api/v1/clinics/{$clinic->id}/doctors", [
                'name' => 'د. غير مصرح',
                'email' => 'unauthorized@aafiya.dz',
                'phone' => '+213550887766',
                'password' => 'Pass2026!',
                'specialty' => 'General',
                'license_number' => 'UNAUTH-001',
            ]);
        $response1->assertStatus(403);

        // 2. Employed Doctor attempts to update clinic settings -> 403 Forbidden
        $response2 = $this->withHeader('Authorization', 'Bearer ' . $employedToken)
            ->putJson("/api/v1/clinics/{$clinic->id}", [
                'name' => 'تغيير غير مصرح به',
            ]);
        $response2->assertStatus(403);
    }

    /**
     * Test 9: Director cannot create doctor in an unauthorized clinic (403).
     */
    public function test_director_cannot_create_doctor_in_unauthorized_clinic(): void
    {
        // Clinic 1 with Director 1
        $dirUser1 = User::factory()->create();
        $dirUser1->assignRole('doctor');
        $doc1 = Doctor::create(['user_id' => $dirUser1->id, 'specialty' => 'GP', 'license_number' => 'LIC-1', 'is_verified' => true]);
        $clinic1 = Clinic::create(['name' => 'Clinic 1', 'address' => 'A', 'wilaya' => 'W', 'phone' => '1', 'director_doctor_id' => $doc1->id]);
        DoctorClinic::create(['doctor_id' => $doc1->id, 'clinic_id' => $clinic1->id, 'position' => 'director', 'is_primary' => true]);

        // Clinic 2 with Director 2
        $dirUser2 = User::factory()->create();
        $dirUser2->assignRole('doctor');
        $doc2 = Doctor::create(['user_id' => $dirUser2->id, 'specialty' => 'GP', 'license_number' => 'LIC-2', 'is_verified' => true]);
        $clinic2 = Clinic::create(['name' => 'Clinic 2', 'address' => 'B', 'wilaya' => 'W', 'phone' => '2', 'director_doctor_id' => $doc2->id]);
        DoctorClinic::create(['doctor_id' => $doc2->id, 'clinic_id' => $clinic2->id, 'position' => 'director', 'is_primary' => true]);

        $token1 = $dirUser1->createToken('t1')->plainTextToken;

        // Director 1 tries to create doctor in Clinic 2 -> 403 Forbidden
        $response = $this->withHeader('Authorization', 'Bearer ' . $token1)
            ->postJson("/api/v1/clinics/{$clinic2->id}/doctors", [
                'name' => 'د. متطفل',
                'email' => 'intruder@aafiya.dz',
                'phone' => '+213550334455',
                'password' => 'Pass2026!',
                'specialty' => 'General',
                'license_number' => 'INTRUDER-001',
            ]);

        $response->assertStatus(403);
    }

    /**
     * Test 10: Employed doctor can login with initial password and change password.
     */
    public function test_employed_doctor_first_login_and_password_change_flow(): void
    {
        $initialPassword = 'InitialSecret2026!';
        $newPassword = 'BrandNewDoctorPass2026!';

        $user = User::factory()->create([
            'email' => 'emp.login@aafiya.dz',
            'password' => Hash::make($initialPassword),
            'is_active' => true,
        ]);
        $user->assignRole('doctor');
        Doctor::create([
            'user_id' => $user->id,
            'specialty' => 'Pediatrics',
            'license_number' => 'PED-EMP-001',
            'is_verified' => true,
        ]);

        // 1. Login with initial password
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'emp.login@aafiya.dz',
            'password' => $initialPassword,
        ]);
        $loginRes->assertStatus(200);
        $token = $loginRes->json('data.token');

        // 2. Change password
        $changeRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/auth/change-password', [
                'current_password' => $initialPassword,
                'new_password' => $newPassword,
                'new_password_confirmation' => $newPassword,
            ]);
        $changeRes->assertStatus(200);

        // 3. Old password is now rejected
        $this->postJson('/api/v1/auth/login', [
            'email' => 'emp.login@aafiya.dz',
            'password' => $initialPassword,
        ])->assertStatus(422);

        // 4. New password succeeds
        $this->postJson('/api/v1/auth/login', [
            'email' => 'emp.login@aafiya.dz',
            'password' => $newPassword,
        ])->assertStatus(200);
    }

    /**
     * Test 11: Employed doctor retains clinical access (EHR, Appointments).
     */
    public function test_employed_doctor_retains_clinical_access(): void
    {
        $dirUser = User::factory()->create();
        $dirUser->assignRole('doctor');
        $docDir = Doctor::create(['user_id' => $dirUser->id, 'specialty' => 'GP', 'license_number' => 'DIR-999', 'is_verified' => true]);
        $clinic = Clinic::create(['name' => 'Clinic Clinical', 'address' => 'A', 'wilaya' => 'W', 'phone' => '1', 'director_doctor_id' => $docDir->id]);
        DoctorClinic::create(['doctor_id' => $docDir->id, 'clinic_id' => $clinic->id, 'position' => 'director', 'is_primary' => true]);

        $empUser = User::factory()->create();
        $empUser->assignRole('doctor');
        $empDoc = Doctor::create(['user_id' => $empUser->id, 'specialty' => 'Cardiology', 'license_number' => 'EMP-999', 'is_verified' => true]);
        DoctorClinic::create(['doctor_id' => $empDoc->id, 'clinic_id' => $clinic->id, 'position' => 'doctor', 'is_primary' => false]);

        $token = $empUser->createToken('emp')->plainTextToken;

        // Can list EHR patients
        $res = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/patients');
        $res->assertStatus(200);
    }

    /**
     * Test 12: Clinic cannot be created without Doctor profile.
     */
    public function test_clinic_cannot_be_created_without_doctor_profile(): void
    {
        $unprovisionedUser = User::factory()->create([
            'email' => 'unprovisioned@aafiya.dz',
        ]);
        $unprovisionedUser->assignRole('doctor');

        $clinicService = app(ClinicService::class);

        $this->expectException(ValidationException::class);

        $clinicService->createClinic($unprovisionedUser, [
            'name' => 'عيادة وهمية',
            'address' => 'شارع الشهداء',
            'wilaya' => 'الجزائر العاصمة',
            'phone' => '+213550111111',
        ]);
    }

    /**
     * Test 13: Pilot account repair is idempotent.
     */
    public function test_pilot_repair_is_idempotent(): void
    {
        $user = User::factory()->create([
            'email' => 'val.doctor.dir@aafiya.dz',
            'name' => 'د. أحمد السعيد',
            'phone' => '+213550000003',
        ]);
        $user->assignRole('doctor');

        $service = app(DoctorProvisioningService::class);

        $doctorData = [
            'specialty' => 'أمراض القلب والأوعية الدموية (Cardiology)',
            'license_number' => 'DZ-ALG-2026-DOC-001',
            'bio' => 'استشاري أمراض القلب والأوعية الدموية',
            'is_verified' => true,
        ];

        $clinicData = [
            'name' => 'عيادة النور الطبية المتخصصة (Al-Noor Medical Clinic)',
            'address' => 'شارع ديدوش مراد، الجزائر الوسطى',
            'wilaya' => 'الجزائر العاصمة',
            'phone' => '+213550000003',
        ];

        $res1 = $service->repairDoctorAccount($user, $doctorData, $clinicData);
        $firstDocId = $res1['doctor']->id;
        $firstClinicId = $res1['clinic']->id;

        $res2 = $service->repairDoctorAccount($user, $doctorData, $clinicData);
        $this->assertEquals($firstDocId, $res2['doctor']->id);
        $this->assertEquals($firstClinicId, $res2['clinic']->id);

        $this->assertEquals(1, Doctor::where('user_id', $user->id)->count());
        $this->assertEquals(1, Clinic::where('name', 'عيادة النور الطبية المتخصصة (Al-Noor Medical Clinic)')->count());
        $this->assertEquals(1, DoctorClinic::where('doctor_id', $firstDocId)->count());
    }

    /**
     * Test 14: Existing pilot account is repaired and remains Director.
     */
    public function test_existing_pilot_account_is_repaired(): void
    {
        $user = User::factory()->create([
            'email' => 'val.doctor.dir@aafiya.dz',
            'name' => 'د. أحمد السعيد',
            'phone' => '+213550000003',
            'password' => Hash::make('DoctorSecret2026!'),
            'is_active' => true,
        ]);
        $user->assignRole('doctor');

        $service = app(DoctorProvisioningService::class);
        $service->repairDoctorAccount(
            $user,
            [
                'specialty' => 'أمراض القلب والأوعية الدموية (Cardiology)',
                'license_number' => 'DZ-ALG-2026-DOC-001',
                'is_verified' => true,
            ],
            [
                'name' => 'عيادة النور الطبية المتخصصة (Al-Noor Medical Clinic)',
                'address' => 'شارع ديدوش مراد، الجزائر الوسطى',
                'wilaya' => 'الجزائر العاصمة',
                'phone' => '+213550000003',
            ]
        );

        $freshUser = $user->fresh(['doctor.clinics']);
        $this->assertNotNull($freshUser->doctor);
        $this->assertEquals('أمراض القلب والأوعية الدموية (Cardiology)', $freshUser->doctor->specialty);
        $this->assertEquals('DZ-ALG-2026-DOC-001', $freshUser->doctor->license_number);
        $this->assertTrue($freshUser->doctor->is_verified);

        $primaryClinic = $freshUser->doctor->clinics->first();
        $this->assertNotNull($primaryClinic);
        $this->assertEquals('عيادة النور الطبية المتخصصة (Al-Noor Medical Clinic)', $primaryClinic->name);
        $this->assertEquals($freshUser->doctor->id, $primaryClinic->director_doctor_id);
        $this->assertEquals('director', $primaryClinic->pivot->position);
    }

    /**
     * Test 15: Doctor cannot onboard or modify another user's profile.
     */
    public function test_doctor_cannot_onboard_another_users_profile(): void
    {
        $targetUser = User::factory()->create([
            'email' => 'target.doctor@aafiya.dz',
            'password' => Hash::make('Target2026!'),
        ]);
        $targetUser->assignRole('doctor');

        $attackerUser = User::factory()->create([
            'email' => 'attacker.doctor@aafiya.dz',
            'password' => Hash::make('Attacker2026!'),
        ]);
        $attackerUser->assignRole('doctor');

        $attackerToken = $attackerUser->createToken('attacker_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer ' . $attackerToken)
            ->postJson('/api/v1/doctors/onboard', [
                'specialty' => 'طب الجلد (Dermatology)',
                'license_number' => 'DZ-ALG-2026-DERM-001',
            ])->assertStatus(200);

        $this->assertNotNull($attackerUser->fresh()->doctor);
        $this->assertNull($targetUser->fresh()->doctor);
    }

    /**
     * Test 16: Unverified self-registered Doctor Director is blocked from clinical and staff APIs.
     */
    public function test_unverified_doctor_director_blocked_from_clinical_and_staff_apis(): void
    {
        $regResponse = $this->postJson('/api/v1/auth/register-doctor', [
            'name' => 'د. بلال فاروق',
            'email' => 'dr.bilal@aafiya.dz',
            'phone' => '+213550998877',
            'password' => 'SecurePass2026!',
            'specialty' => 'Cardiology',
            'license_number' => 'DZ-ALG-2026-CARD-099',
            'clinic_name' => 'عيادة القلب',
        ]);

        $token = $regResponse->json('data.token');
        $clinicId = Clinic::where('name', 'عيادة القلب')->first()->id;

        // 1. Blocked from listing patients
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/patients')
            ->assertStatus(403);

        // 2. Blocked from creating clinical visits
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/clinical-visits', [
                'clinic_id' => $clinicId,
                'patient_id' => '01a05674-65b5-723b-8003-e838548fb4d9',
                'visit_date' => now()->toDateString(),
                'chief_complaint' => 'Chest pain',
            ])
            ->assertStatus(403);

        // 3. Blocked from creating employed doctors
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/clinics/{$clinicId}/doctors", [
                'name' => 'د. مساعد',
                'email' => 'doc.assistant@aafiya.dz',
                'phone' => '+213550119900',
                'password' => 'EmployedPass2026!',
                'specialty' => 'GP',
                'license_number' => 'DZ-GP-999',
            ])
            ->assertStatus(403);
    }

    /**
     * Test 17: Platform Admin verifies Doctor Director, activating clinic and unlocking clinical operations.
     */
    public function test_admin_verifies_doctor_director_and_unlocks_operations(): void
    {
        $regResponse = $this->postJson('/api/v1/auth/register-doctor', [
            'name' => 'د. طارق مراد',
            'email' => 'dr.tarek@aafiya.dz',
            'phone' => '+213550887766',
            'password' => 'SecurePass2026!',
            'specialty' => 'Neurology',
            'license_number' => 'DZ-ALG-2026-NEUR-001',
            'clinic_name' => 'عيادة الأعصاب المتطورة',
        ]);

        $token = $regResponse->json('data.token');
        $user = User::where('email', 'dr.tarek@aafiya.dz')->first();
        $doctorId = $user->doctor->id;
        $clinic = Clinic::where('name', 'عيادة الأعصاب المتطورة')->first();

        $this->assertFalse($user->doctor->is_verified);
        $this->assertFalse($clinic->is_active);

        // Admin approves doctor
        $admin = User::factory()->create(['email' => 'test.admin@aafiya.dz']);
        $admin->assignRole('admin');
        $adminToken = $admin->createToken('admin_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->putJson("/api/v1/admin/doctors/{$doctorId}/verify", [
                'is_verified' => true,
            ])
            ->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertTrue($user->doctor->fresh()->is_verified);
        $this->assertTrue($clinic->fresh()->is_active);

        // Now Doctor Director can access patients list
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/patients')
            ->assertStatus(200);

        // Now Doctor Director can create employed doctor
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/clinics/{$clinic->id}/doctors", [
                'name' => 'د. كمال سعدي',
                'email' => 'dr.kamal@aafiya.dz',
                'phone' => '+213550334411',
                'password' => 'EmployedPass2026!',
                'specialty' => 'General Medicine',
                'license_number' => 'DZ-GP-2026-044',
            ])
            ->assertStatus(201);

        $employedUser = User::where('email', 'dr.kamal@aafiya.dz')->first();
        $this->assertNotNull($employedUser->doctor);
        $this->assertTrue($employedUser->doctor->is_verified);
    }
}
