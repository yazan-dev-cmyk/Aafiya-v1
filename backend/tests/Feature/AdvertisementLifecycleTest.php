<?php

namespace Tests\Feature;

use App\Models\Advertisement;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdvertisementLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
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

        $adminRole = Role::where('name', 'admin')->firstOrFail();
        $doctorRole = Role::where('name', 'doctor')->firstOrFail();

        // 1. Admin User
        $this->adminUser = User::factory()->create();
        $this->adminUser->roles()->attach($adminRole->id);

        // 2. Doctor & Clinic
        $this->doctorUser = User::factory()->create();
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب الأطفال',
            'license_number' => 'DOC-8899',
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة الطفولة السعيدة',
            'address' => 'الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'phone' => '021445566',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);
    }

    public function test_doctor_can_create_advertisement_and_admin_approves(): void
    {
        // 1. Doctor creates ad campaign
        $response = $this->actingAs($this->doctorUser, 'sanctum')->postJson('/api/v1/advertisements', [
            'clinic_id' => $this->clinic->id,
            'title' => 'افتتاح عيادة طب الأطفال التخصصية',
            'content' => 'استشارات وفحوصات دورية للأطفال وحديثي الولادة بأحدث التقنيات.',
            'banner_image_url' => 'https://aafiya.test/banners/pediatrics.jpg',
            'target_url' => 'https://aafiya.test/clinics/happy-childhood',
            'placement' => 'home_banner',
            'target_role' => 'patient',
            'target_specialty' => 'pediatrics',
            'target_wilaya' => 'الجزائر',
            'is_welcome_offer' => true,
            'start_date' => now()->format('Y-m-d'),
            'end_date' => now()->addDays(30)->format('Y-m-d'),
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'pending_approval')
            ->assertJsonPath('data.is_welcome_offer', true);

        $adId = $response->json('data.id');
        $ad = Advertisement::findOrFail($adId);
        $this->assertEquals('pending_approval', $ad->status);

        // 2. Admin approves ad
        $approveRes = $this->actingAs($this->adminUser, 'sanctum')->putJson("/api/v1/advertisements/{$adId}/status", [
            'status' => 'active',
        ]);
        $approveRes->assertStatus(200)
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.is_active', true);

        // 3. Public API lists active targeted ads and records impressions
        $publicRes = $this->getJson('/api/v1/advertisements?placement=home_banner&target_wilaya=الجزائر');
        $publicRes->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'افتتاح عيادة طب الأطفال التخصصية');

        $ad->refresh();
        $this->assertEquals(1, $ad->impressions_count);

        // 4. Record click
        $clickRes = $this->postJson("/api/v1/advertisements/{$adId}/click");
        $clickRes->assertStatus(200)
            ->assertJsonPath('target_url', 'https://aafiya.test/clinics/happy-childhood');

        $ad->refresh();
        $this->assertEquals(1, $ad->clicks_count);
    }
}
