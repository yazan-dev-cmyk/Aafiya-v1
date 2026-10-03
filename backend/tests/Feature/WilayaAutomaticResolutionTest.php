<?php

namespace Tests\Feature;

use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\DiagnosticCenter;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use App\Models\Wilaya;
use App\Services\BookingCenterService;
use App\Services\ClinicService;
use App\Services\DoctorProvisioningService;
use App\Services\EhrService;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\WilayaCommuneMasterDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WilayaAutomaticResolutionTest extends TestCase
{
    use RefreshDatabase;

    protected Wilaya $algiers;
    protected Wilaya $oran;
    protected Wilaya $constantine;
    protected Wilaya $blida;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->seed(WilayaCommuneMasterDataSeeder::class);

        $this->algiers = Wilaya::where('code', '16')->firstOrFail();
        $this->oran = Wilaya::where('code', '31')->firstOrFail();
        $this->constantine = Wilaya::where('code', '25')->firstOrFail();
        $this->blida = Wilaya::where('code', '09')->firstOrFail();
    }

    /**
     * Test ClinicService auto-resolves wilaya_id on create and update.
     */
    public function test_clinic_service_auto_resolves_wilaya_id(): void
    {
        /** @var User $doctorUser */
        $doctorUser = User::factory()->create();
        $doctorUser->assignRole('doctor');
        $doctor = Doctor::create([
            'user_id' => $doctorUser->id,
            'specialty' => 'Cardiology',
            'license_number' => 'DOC-RES-001',
            'is_verified' => true,
        ]);
        $doctorUser->setRelation('doctor', $doctor);

        /** @var ClinicService $clinicService */
        $clinicService = app(ClinicService::class);

        // 1. Create with official code '16'
        $clinic1 = $clinicService->createClinic($doctorUser, [
            'name' => 'Algiers Heart Clinic',
            'address' => 'Didouche Mourad',
            'wilaya' => '16',
            'phone' => '+21321000001',
        ]);
        $this->assertEquals('16', $clinic1->wilaya);
        $this->assertEquals($this->algiers->id, $clinic1->wilaya_id);
        $this->assertEquals('16', $clinic1->wilaya()->first()?->code);

        // 2. Create with Arabic text 'الجزائر العاصمة'
        $clinic2 = $clinicService->createClinic($doctorUser, [
            'name' => 'El Chiffa Clinic',
            'address' => 'Rue de la Liberte',
            'wilaya' => 'الجزائر العاصمة',
            'phone' => '+21321000002',
        ]);
        $this->assertEquals('الجزائر العاصمة', $clinic2->wilaya);
        $this->assertEquals($this->algiers->id, $clinic2->wilaya_id);

        // 3. Create with French name 'Oran'
        $clinic3 = $clinicService->createClinic($doctorUser, [
            'name' => 'Wahran Medical',
            'address' => 'Front de Mer',
            'wilaya' => 'Oran',
            'phone' => '+21341000003',
        ]);
        $this->assertEquals('Oran', $clinic3->wilaya);
        $this->assertEquals($this->oran->id, $clinic3->wilaya_id);

        // 4. Update clinic settings to 'Constantine'
        $updated = $clinicService->updateSettings($doctorUser, $clinic3, [
            'wilaya' => 'Constantine',
        ]);
        $this->assertEquals('Constantine', $updated->wilaya);
        $this->assertEquals($this->constantine->id, $updated->wilaya_id);

        // 5. Unresolved value preserves legacy string and sets null wilaya_id
        $unresolvedClinic = $clinicService->createClinic($doctorUser, [
            'name' => 'Outland Clinic',
            'address' => 'Unknown Sector',
            'wilaya' => 'Mars Colony',
            'phone' => '+21300000004',
        ]);
        $this->assertEquals('Mars Colony', $unresolvedClinic->wilaya);
        $this->assertNull($unresolvedClinic->wilaya_id);
    }

    /**
     * Test DoctorProvisioningService auto-resolves clinic wilaya_id.
     */
    public function test_doctor_provisioning_service_auto_resolves_clinic_wilaya_id(): void
    {
        /** @var DoctorProvisioningService $service */
        $service = app(DoctorProvisioningService::class);

        $userData = [
            'name' => 'Dr. Karim Benali',
            'email' => 'karim.benali@aafiya.dz',
            'phone' => '+213550112233',
            'password' => 'SecurePass123!',
        ];
        $doctorData = [
            'specialty' => 'Pediatrics',
            'license_number' => 'DOC-PROV-001',
        ];
        $clinicData = [
            'name' => 'Cabinet Dr Benali',
            'address' => 'Boulevard Zighout Youcef',
            'wilaya' => 'Oran',
            'phone' => '+213550112233',
        ];

        $result = $service->provisionDoctor($userData, $doctorData, $clinicData);
        $clinic = $result['clinic'];

        $this->assertInstanceOf(Clinic::class, $clinic);
        $this->assertEquals('Oran', $clinic->wilaya);
        $this->assertEquals($this->oran->id, $clinic->wilaya_id);
    }

    /**
     * Test EhrService auto-resolves patient wilaya_id on create and update.
     */
    public function test_ehr_service_auto_resolves_patient_wilaya_id(): void
    {
        /** @var EhrService $ehrService */
        $ehrService = app(EhrService::class);

        // 1. Create patient with Wilaya code '31'
        $patient = $ehrService->createPatient([
            'first_name' => 'Amina',
            'last_name' => 'Mansouri',
            'gender' => 'female',
            'date_of_birth' => '1995-05-12',
            'phone' => '+213661223344',
            'address' => 'Akid Lotfi',
            'wilaya' => '31',
        ]);

        $this->assertEquals('31', $patient->wilaya);
        $this->assertEquals($this->oran->id, $patient->wilaya_id);
        $this->assertEquals('Oran', $patient->wilaya()->first()?->name_fr);

        // 2. Update patient with Arabic name 'البليدة'
        $updated = $ehrService->updatePatient($patient, [
            'wilaya' => 'البليدة',
        ]);

        $this->assertEquals('البليدة', $updated->wilaya);
        $this->assertEquals($this->blida->id, $updated->wilaya_id);

        // 3. Create patient with unresolved string
        $patientUnresolved = $ehrService->createPatient([
            'first_name' => 'Samir',
            'last_name' => 'Test',
            'gender' => 'male',
            'date_of_birth' => '1988-01-01',
            'phone' => '+213661998877',
            'wilaya' => 'Atlantis',
        ]);
        $this->assertEquals('Atlantis', $patientUnresolved->wilaya);
        $this->assertNull($patientUnresolved->wilaya_id);
    }

    /**
     * Test BookingCenterService and Controller auto-resolve wilaya_id.
     */
    public function test_booking_center_service_and_controller_auto_resolve_wilaya_id(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->assignRole('booking_center');

        /** @var BookingCenterService $service */
        $service = app(BookingCenterService::class);

        // 1. Provision center with Wilaya 'Constantine'
        $center = $service->provisionCenter([
            'name' => 'Centre Cirta Reservation',
            'phone' => '+21331889900',
            'address' => 'Sidi Mabrouk',
            'wilaya' => 'Constantine',
        ], $user);

        $this->assertEquals('Constantine', $center->wilaya);
        $this->assertEquals($this->constantine->id, $center->wilaya_id);

        // 2. Update via controller endpoint with authentication
        $response = $this->actingAs($user)
            ->putJson('/api/v1/booking-centers/profile', [
                'name' => 'Centre Cirta Reservation Updated',
                'phone' => '+21331889900',
                'address' => 'Belle Vue',
                'wilaya' => '16',
            ]);

        $response->assertStatus(200);
        $refreshed = $center->fresh();
        $this->assertEquals('16', $refreshed->wilaya);
        $this->assertEquals($this->algiers->id, $refreshed->wilaya_id);
    }

    /**
     * Test DiagnosticCenterController store auto-resolves wilaya_id.
     */
    public function test_diagnostic_center_controller_auto_resolves_wilaya_id(): void
    {
        /** @var User $manager */
        $manager = User::factory()->create();
        $manager->assignRole('admin');

        $response = $this->actingAs($manager)
            ->postJson('/api/v1/diagnostic-centers', [
                'name' => 'Laboratoire d\'Analyses Pasteur',
                'type' => 'laboratory',
                'license_number' => 'LAB-AUTORES-001',
                'phone' => '+21325112233',
                'email' => 'pasteur@diag.dz',
                'address' => 'Boulevard Mohamed V',
                'wilaya' => '09',
            ]);

        $response->assertStatus(201);
        $centerId = $response->json('data.id');
        $center = DiagnosticCenter::findOrFail($centerId);

        $this->assertEquals('09', $center->wilaya);
        $this->assertEquals($this->blida->id, $center->wilaya_id);
    }

    /**
     * Test full Registration API end-to-end integration resolves wilaya_id.
     */
    public function test_registration_api_auto_resolves_wilaya_id(): void
    {
        // 1. Register Patient with Wilaya '16'
        $patientResponse = $this->postJson('/api/v1/auth/register', [
            'name' => 'Nadia Cherif',
            'email' => 'nadia.cherif@test.dz',
            'phone' => '+213770123456',
            'password' => 'Password1234!',
            'password_confirmation' => 'Password1234!',
            'role' => 'patient_registered',
            'wilaya' => '16',
            'address' => 'Bab El Oued',
        ]);

        $patientResponse->assertStatus(201);
        $patientUser = User::where('email', 'nadia.cherif@test.dz')->firstOrFail();
        $patient = Patient::where('user_id', $patientUser->id)->firstOrFail();
        $this->assertEquals('16', $patient->wilaya);
        $this->assertEquals($this->algiers->id, $patient->wilaya_id);

        // 2. Register Booking Center with Wilaya 'Oran'
        $bcResponse = $this->postJson('/api/v1/auth/register', [
            'name' => 'Centre Sante Oranais',
            'manager_name' => 'Omar Hadj',
            'email' => 'omar.hadj@test.dz',
            'phone' => '+213770654321',
            'password' => 'Password1234!',
            'password_confirmation' => 'Password1234!',
            'role' => 'booking_center',
            'wilaya' => 'Oran',
            'address' => 'Canastel',
        ]);

        $bcResponse->assertStatus(201);
        $bcUser = User::where('email', 'omar.hadj@test.dz')->firstOrFail();
        $bc = BookingCenter::where('user_id', $bcUser->id)->firstOrFail();
        $this->assertEquals('Oran', $bc->wilaya);
        $this->assertEquals($this->oran->id, $bc->wilaya_id);
    }
}
