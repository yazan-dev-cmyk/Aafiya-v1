<?php

namespace Tests\Feature;

use App\Models\BookingCenter;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingCenterSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected BookingCenter $center;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['name' => 'booking_center'], ['display_name' => 'Booking Center']);

        $this->user = User::factory()->create([
            'email' => 'center.manager@aafiya.dz',
            'name'  => 'مركز النور الطبي',
        ]);
        $this->user->roles()->attach($role->id);

        $this->center = BookingCenter::create([
            'user_id'             => $this->user->id,
            'name'                => 'مركز النور الطبي',
            'commercial_register' => 'RC-16/00-1122334',
            'phone'               => '+213550000011',
            'email'               => 'center.manager@aafiya.dz',
            'address'             => 'شارع ديدوش مراد',
            'wilaya'              => 'الجزائر العاصمة',
            'quota_balance'       => 25,
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'is_active'           => true,
            'verified_at'         => now(),
        ]);
    }

    public function test_authenticated_booking_center_can_update_allowed_profile_fields(): void
    {
        $payload = [
            'name'    => 'مركز النور المحدث',
            'phone'   => '+213770998877',
            'email'   => 'new.contact@aafiya.dz',
            'wilaya'  => 'وهران',
            'address' => 'حي السلام، وهران',
        ];

        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson('/api/v1/booking-centers/profile', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.name', 'مركز النور المحدث')
            ->assertJsonPath('data.phone', '+213770998877')
            ->assertJsonPath('data.email', 'new.contact@aafiya.dz')
            ->assertJsonPath('data.wilaya', 'وهران')
            ->assertJsonPath('data.address', 'حي السلام، وهران');

        $this->assertDatabaseHas('booking_centers', [
            'id'      => $this->center->id,
            'name'    => 'مركز النور المحدث',
            'phone'   => '+213770998877',
            'email'   => 'new.contact@aafiya.dz',
            'wilaya'  => 'وهران',
            'address' => 'حي السلام، وهران',
        ]);
    }

    public function test_protected_fields_cannot_be_modified(): void
    {
        $payload = [
            'name'                => 'مركز النور المحدث',
            'phone'               => '+213770998877',
            'email'               => 'new.contact@aafiya.dz',
            'wilaya'              => 'وهران',
            'address'             => 'حي السلام، وهران',
            // Tampering attempts on protected fields
            'commercial_register' => 'CR-TAMPERED-999',
            'quota_balance'       => 99999,
            'verification_status' => 'pending',
            'is_active'           => false,
            'verified_at'         => null,
            'rejection_reason'    => 'hack attempt',
        ];

        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson('/api/v1/booking-centers/profile', $payload);

        $response->assertStatus(200);

        $fresh = $this->center->fresh();
        // Allowed fields changed
        $this->assertEquals('مركز النور المحدث', $fresh->name);
        $this->assertEquals('+213770998877', $fresh->phone);

        // Protected fields strictly unchanged
        $this->assertEquals('RC-16/00-1122334', $fresh->commercial_register);
        $this->assertEquals(25, $fresh->quota_balance);
        $this->assertEquals(BookingCenter::STATUS_VERIFIED, $fresh->verification_status);
        $this->assertTrue($fresh->is_active);
        $this->assertNotNull($fresh->verified_at);
        $this->assertNull($fresh->rejection_reason);
    }

    public function test_booking_center_cannot_modify_another_center_idor_prevention(): void
    {
        // Second booking center
        $role = Role::where('name', 'booking_center')->first();
        $otherUser = User::factory()->create(['email' => 'other@aafiya.dz']);
        $otherUser->roles()->attach($role->id);
        $otherCenter = BookingCenter::create([
            'user_id'             => $otherUser->id,
            'name'                => 'مركز ثان مستقل',
            'commercial_register' => 'RC-99/00-8888',
            'phone'               => '+213550000022',
            'address'             => 'قسنطينة',
            'wilaya'              => 'قسنطينة',
            'quota_balance'       => 10,
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'is_active'           => true,
        ]);

        // First user sends update trying to supply other center's ID
        $payload = [
            'booking_center_id' => $otherCenter->id,
            'id'                => $otherCenter->id,
            'name'              => 'محاولة تعديل غير مصرحة',
            'phone'             => '+213771112233',
            'email'             => 'hacked@aafiya.dz',
            'wilaya'            => 'عنابة',
            'address'           => 'عنابة',
        ];

        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson('/api/v1/booking-centers/profile', $payload);

        $response->assertStatus(200);

        // Other center remains completely untouched
        $otherFresh = $otherCenter->fresh();
        $this->assertEquals('مركز ثان مستقل', $otherFresh->name);
        $this->assertEquals('+213550000022', $otherFresh->phone);
        $this->assertEquals('قسنطينة', $otherFresh->wilaya);

        // Authenticated user's center is the one updated
        $thisFresh = $this->center->fresh();
        $this->assertEquals('محاولة تعديل غير مصرحة', $thisFresh->name);
    }

    public function test_validation_rejects_invalid_or_missing_fields(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson('/api/v1/booking-centers/profile', [
                'name'    => '',
                'phone'   => '',
                'email'   => 'not-an-email',
                'wilaya'  => '',
                'address' => '',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'phone', 'email', 'wilaya', 'address']);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->putJson('/api/v1/booking-centers/profile', [
            'name'    => 'مركز مجهول',
            'phone'   => '+213550000099',
            'wilaya'  => 'الجزائر',
            'address' => 'الجزائر',
        ]);

        $response->assertStatus(401);
    }
}
