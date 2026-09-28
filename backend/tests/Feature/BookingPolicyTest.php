<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $bookingCenterUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Roles
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Platform Admin']);
        $centerRole = Role::firstOrCreate(['name' => 'booking_center'], ['display_name' => 'Booking Center']);

        // Users
        $this->admin = User::factory()->create(['email' => 'admin.test@aafiya.dz']);
        $this->admin->roles()->attach($adminRole->id);

        $this->bookingCenterUser = User::factory()->create(['email' => 'center.test@aafiya.dz']);
        $this->bookingCenterUser->roles()->attach($centerRole->id);

        // Initial settings
        SystemSetting::setValue('booking.cancellation_cutoff_hours', 24, 'integer', 'booking');
        SystemSetting::setValue('booking.max_daily_bookings_per_patient', 5, 'integer', 'booking');
        // Extra sensitive setting to test non-leakage
        SystemSetting::setValue('system.internal_api_secret', 'SECRET_KEY_123', 'string', 'security');
    }

    public function test_booking_center_can_read_booking_policies(): void
    {
        $response = $this->actingAs($this->bookingCenterUser, 'sanctum')
            ->getJson('/api/v1/booking-policies');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.cancellation_cutoff_hours', 24)
            ->assertJsonPath('data.max_daily_bookings_per_patient', 5);

        // Verify strictly no leakage of other system_settings keys
        $response->assertJsonMissingPath('data.system.internal_api_secret')
            ->assertJsonMissingPath('data.internal_api_secret');

        $dataKeys = array_keys($response->json('data'));
        sort($dataKeys);
        $this->assertEquals(['cancellation_cutoff_hours', 'max_daily_bookings_per_patient'], $dataKeys);
    }

    public function test_admin_can_read_booking_policies(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/booking-policies');

        $response->assertStatus(200)
            ->assertJsonPath('data.cancellation_cutoff_hours', 24)
            ->assertJsonPath('data.max_daily_bookings_per_patient', 5);
    }

    public function test_admin_can_update_booking_policies(): void
    {
        $payload = [
            'cancellation_cutoff_hours'      => 48,
            'max_daily_bookings_per_patient' => 10,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/booking-policies', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.cancellation_cutoff_hours', 48)
            ->assertJsonPath('data.max_daily_bookings_per_patient', 10);

        // Verify DB persistence
        $this->assertEquals(48, SystemSetting::getValue('booking.cancellation_cutoff_hours'));
        $this->assertEquals(10, SystemSetting::getValue('booking.max_daily_bookings_per_patient'));
    }

    public function test_booking_center_cannot_update_booking_policies(): void
    {
        $payload = [
            'cancellation_cutoff_hours'      => 12,
            'max_daily_bookings_per_patient' => 2,
        ];

        $response = $this->actingAs($this->bookingCenterUser, 'sanctum')
            ->putJson('/api/v1/admin/booking-policies', $payload);

        $response->assertStatus(403);

        // Verify DB remains untouched
        $this->assertEquals(24, SystemSetting::getValue('booking.cancellation_cutoff_hours'));
        $this->assertEquals(5, SystemSetting::getValue('booking.max_daily_bookings_per_patient'));
    }

    public function test_unauthenticated_user_cannot_update_booking_policies(): void
    {
        $response = $this->putJson('/api/v1/admin/booking-policies', [
            'cancellation_cutoff_hours'      => 12,
            'max_daily_bookings_per_patient' => 2,
        ]);

        $response->assertStatus(401);
    }

    public function test_validation_rejects_invalid_zero_and_negative_values(): void
    {
        // Negative
        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/booking-policies', [
                'cancellation_cutoff_hours'      => -5,
                'max_daily_bookings_per_patient' => 0,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['cancellation_cutoff_hours', 'max_daily_bookings_per_patient']);

        // Missing
        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/booking-policies', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['cancellation_cutoff_hours', 'max_daily_bookings_per_patient']);
    }

    public function test_persistence_and_propagation_to_booking_center(): void
    {
        // 1. Admin updates policy
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/booking-policies', [
                'cancellation_cutoff_hours'      => 36,
                'max_daily_bookings_per_patient' => 8,
            ])
            ->assertStatus(200);

        // 2. Booking Center reads policies and immediately sees new values
        $response = $this->actingAs($this->bookingCenterUser, 'sanctum')
            ->getJson('/api/v1/booking-policies');

        $response->assertStatus(200)
            ->assertJsonPath('data.cancellation_cutoff_hours', 36)
            ->assertJsonPath('data.max_daily_bookings_per_patient', 8);
    }
}
