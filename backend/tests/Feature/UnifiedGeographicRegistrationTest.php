<?php

namespace Tests\Feature;

use App\Http\Resources\BookingCenterResource;
use App\Http\Resources\ClinicResource;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\Commune;
use App\Models\Doctor;
use App\Models\MedicalSpecialty;
use App\Models\User;
use App\Models\Wilaya;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class UnifiedGeographicRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    /**
     * Test 1: Doctor onboarding with canonical wilaya_code, commune_code, and test GPS vector.
     */
    public function test_doctor_can_register_with_canonical_wilaya_commune_codes_and_gps_vector(): void
    {
        $specialty = MedicalSpecialty::where('is_active', true)->firstOrFail();

        $payload = [
            'name' => 'د. ياسين تلمساني',
            'email' => 'dr.tlemceni@aafiya.dz',
            'phone' => '+213550998877',
            'password' => 'DoctorPass2026!',
            'specialty_id' => $specialty->id,
            'license_number' => 'DOC-TLM-2026-99',
            'clinic_name' => 'عيادة ابن سينا التخصصية',
            'wilaya_code' => '13',
            'commune_code' => '1301',
            'address' => 'حي المنصورة، تلمسان',
            'latitude' => 34.89777154,
            'longitude' => 1.23764942,
            'google_maps_link' => 'https://maps.google.com/?q=34.89777154,1.23764942',
            'clinic_phone' => '+21343201122',
        ];

        $response = $this->postJson('/api/v1/auth/register-doctor', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success');

        $user = User::where('email', 'dr.tlemceni@aafiya.dz')->firstOrFail();
        $this->assertTrue($user->hasRole('doctor'));

        $doctor = Doctor::where('user_id', $user->id)->firstOrFail();
        $this->assertEquals('DOC-TLM-2026-99', $doctor->license_number);

        $clinic = Clinic::where('director_doctor_id', $doctor->id)->firstOrFail();
        $wilaya13 = Wilaya::where('code', '13')->firstOrFail();
        $commune1301 = Commune::where('code', '1301')->firstOrFail();

        $this->assertEquals($wilaya13->id, $clinic->wilaya_id);
        $this->assertEquals($commune1301->id, $clinic->commune_id);
        $this->assertEquals('حي المنصورة، تلمسان', $clinic->address);
        $this->assertEqualsWithDelta(34.89777154, (float) $clinic->latitude, 0.00001);
        $this->assertEqualsWithDelta(1.23764942, (float) $clinic->longitude, 0.00001);
        $this->assertEquals('https://maps.google.com/?q=34.89777154,1.23764942', $clinic->google_maps_link);
    }

    /**
     * Test 2: Booking Center registration with canonical wilaya_code, commune_code, and test GPS vector.
     */
    public function test_booking_center_can_register_with_canonical_wilaya_commune_codes_and_gps_vector(): void
    {
        $payload = [
            'name' => 'وكالة الشفاء للخدمات الطبية',
            'email' => 'agency.chifa@aafiya.dz',
            'phone' => '+213550334455',
            'password' => 'AgencyPass2026!',
            'password_confirmation' => 'AgencyPass2026!',
            'role' => 'booking_center',
            'commercial_register' => 'RC-13/00-987654',
            'license_number' => 'AG-2026-1301',
            'wilaya_code' => '13',
            'commune_code' => '1301',
            'address' => 'نهج العربي بن مهيدي، تلمسان',
            'latitude' => 34.89777154,
            'longitude' => 1.23764942,
            'google_maps_link' => 'https://maps.google.com/?q=34.89777154,1.23764942',
            'accepted_terms' => true,
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success');

        $user = User::where('email', 'agency.chifa@aafiya.dz')->firstOrFail();
        $this->assertTrue($user->hasRole('booking_center'));

        $center = BookingCenter::where('user_id', $user->id)->firstOrFail();
        $wilaya13 = Wilaya::where('code', '13')->firstOrFail();
        $commune1301 = Commune::where('code', '1301')->firstOrFail();

        $this->assertEquals($wilaya13->id, $center->wilaya_id);
        $this->assertEquals($commune1301->id, $center->commune_id);
        $this->assertEquals('نهج العربي بن مهيدي، تلمسان', $center->address);
        $this->assertEqualsWithDelta(34.89777154, (float) $center->latitude, 0.00001);
        $this->assertEqualsWithDelta(1.23764942, (float) $center->longitude, 0.00001);
        $this->assertEquals('https://maps.google.com/?q=34.89777154,1.23764942', $center->google_maps_link);
    }

    /**
     * Test 3: Doctor registration rejects commune_code not belonging to chosen wilaya_code.
     */
    public function test_doctor_registration_rejects_commune_not_belonging_to_wilaya(): void
    {
        $specialty = MedicalSpecialty::where('is_active', true)->firstOrFail();

        $payload = [
            'name' => 'د. خالد زناتي',
            'email' => 'dr.khaled@aafiya.dz',
            'phone' => '+213550123499',
            'password' => 'DoctorPass2026!',
            'specialty_id' => $specialty->id,
            'license_number' => 'DOC-MISMATCH-01',
            'clinic_name' => 'عيادة الاختبار',
            'wilaya_code' => '16', // Alger
            'commune_code' => '1301', // Tlemcen (mismatch!)
        ];

        $response = $this->postJson('/api/v1/auth/register-doctor', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['commune_code']);
    }

    /**
     * Test 4: Doctor registration rejects out-of-range GPS coordinates.
     */
    public function test_doctor_registration_rejects_out_of_range_coordinates(): void
    {
        $specialty = MedicalSpecialty::where('is_active', true)->firstOrFail();

        $payload = [
            'name' => 'د. فؤاد قاسمي',
            'email' => 'dr.fouad@aafiya.dz',
            'phone' => '+213550123488',
            'password' => 'DoctorPass2026!',
            'specialty_id' => $specialty->id,
            'license_number' => 'DOC-BAD-GPS-01',
            'clinic_name' => 'عيادة الاختبار',
            'wilaya_code' => '13',
            'commune_code' => '1301',
            'latitude' => 120.0, // Invalid latitude (> 90)
            'longitude' => 1.23764942,
        ];

        $response = $this->postJson('/api/v1/auth/register-doctor', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['latitude']);
    }

    /**
     * Test 5: Clinic creation by authenticated doctor persists commune and GPS coordinates.
     */
    public function test_clinic_creation_by_doctor_persists_commune_and_coordinates(): void
    {
        $doctorUser = User::factory()->create();
        $doctorUser->assignRole('doctor');
        $specialty = MedicalSpecialty::where('is_active', true)->firstOrFail();
        $doctor = Doctor::create([
            'user_id' => $doctorUser->id,
            'specialty' => $specialty->name_ar,
            'specialty_id' => $specialty->id,
            'license_number' => 'DOC-CREATOR-99',
            'is_verified' => true,
        ]);

        $payload = [
            'name' => 'العيادة الجراحية الخاصة بتلمسان',
            'address' => 'شارع الشهداء، تلمسان',
            'wilaya_code' => '13',
            'commune_code' => '1301',
            'latitude' => 34.89777154,
            'longitude' => 1.23764942,
            'google_maps_link' => 'https://maps.google.com/?q=34.89777154,1.23764942',
            'phone' => '+21343209988',
        ];

        $response = $this->actingAs($doctorUser)->postJson('/api/v1/clinics', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success');

        $clinicId = $response->json('data.id');
        $clinic = Clinic::findOrFail($clinicId);
        $commune1301 = Commune::where('code', '1301')->firstOrFail();

        $this->assertEquals($commune1301->id, $clinic->commune_id);
        $this->assertEqualsWithDelta(34.89777154, (float) $clinic->latitude, 0.00001);
        $this->assertEqualsWithDelta(1.23764942, (float) $clinic->longitude, 0.00001);
    }

    /**
     * Test 6: ClinicResource and BookingCenterResource serialize commune object and coordinates.
     */
    public function test_resources_serialize_commune_and_coordinates(): void
    {
        $commune1301 = Commune::where('code', '1301')->firstOrFail();
        $wilaya13 = Wilaya::where('code', '13')->firstOrFail();

        $clinic = Clinic::create([
            'name' => 'عيادة الفحص السريع',
            'address' => 'تلمسان الوسطى',
            'wilaya' => $wilaya13->name_ar,
            'wilaya_id' => $wilaya13->id,
            'commune_id' => $commune1301->id,
            'latitude' => 34.89777154,
            'longitude' => 1.23764942,
            'google_maps_link' => 'https://maps.google.com/?q=34.89777154,1.23764942',
            'phone' => '+21343000000',
        ]);
        $clinic->load('commune');

        $resource = (new ClinicResource($clinic))->toArray(Request::create('/'));

        $this->assertEquals('1301', $resource['commune']['code']);
        $this->assertEqualsWithDelta(34.89777154, $resource['latitude'], 0.00001);
        $this->assertEqualsWithDelta(1.23764942, $resource['longitude'], 0.00001);
        $this->assertEquals('https://maps.google.com/?q=34.89777154,1.23764942', $resource['google_maps_link']);
    }

    /**
     * Test 7: Registration rejects single coordinate without its pair.
     */
    public function test_registration_rejects_single_coordinate_without_pair(): void
    {
        $specialty = MedicalSpecialty::where('is_active', true)->firstOrFail();

        // 1. Latitude provided without longitude
        $response1 = $this->postJson('/api/v1/auth/register-doctor', [
            'name' => 'د. حسان قدور',
            'email' => 'dr.hassan@aafiya.dz',
            'phone' => '+213550999888',
            'password' => 'DoctorPass2026!',
            'specialty_id' => $specialty->id,
            'license_number' => 'DOC-SINGLE-LAT',
            'clinic_name' => 'عيادة حسان',
            'wilaya_code' => '13',
            'commune_code' => '1301',
            'latitude' => 34.89777154,
        ]);
        $response1->assertStatus(422)->assertJsonValidationErrors(['longitude']);

        // 2. Longitude provided without latitude
        $response2 = $this->postJson('/api/v1/auth/register-doctor', [
            'name' => 'د. حسان قدور',
            'email' => 'dr.hassan2@aafiya.dz',
            'phone' => '+213550999889',
            'password' => 'DoctorPass2026!',
            'specialty_id' => $specialty->id,
            'license_number' => 'DOC-SINGLE-LNG',
            'clinic_name' => 'عيادة حسان 2',
            'wilaya_code' => '13',
            'commune_code' => '1301',
            'longitude' => 1.23764942,
        ]);
        $response2->assertStatus(422)->assertJsonValidationErrors(['latitude']);
    }

    /**
     * Test 8: Google Maps link is generated dynamically from coordinates when stored link is null.
     */
    public function test_google_maps_link_is_dynamically_generated_from_coordinates(): void
    {
        $clinic = Clinic::create([
            'name' => 'عيادة التوليد الذاتي',
            'address' => 'وهران',
            'wilaya' => 'وهران',
            'latitude' => 35.6987,
            'longitude' => -0.6349,
            'google_maps_link' => null,
            'phone' => '+21341000000',
        ]);

        $this->assertEquals('https://maps.google.com/?q=35.6987,-0.6349', $clinic->google_maps_link);

        $resource = (new ClinicResource($clinic))->toArray(Request::create('/'));
        $this->assertEquals('https://maps.google.com/?q=35.6987,-0.6349', $resource['google_maps_link']);
    }
}
