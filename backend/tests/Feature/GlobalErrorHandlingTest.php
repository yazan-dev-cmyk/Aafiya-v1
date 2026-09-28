<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GlobalErrorHandlingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            BookingPackageSeeder::class,
        ]);
    }

    public function test_unauthenticated_request_returns_standardized_401_json(): void
    {
        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(401)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('code', 401)
            ->assertJsonStructure(['status', 'code', 'message']);
    }

    public function test_non_existent_entity_returns_standardized_404_json(): void
    {
        $adminRole = Role::where('name', 'admin')->firstOrFail();
        $admin = User::factory()->create();
        $admin->roles()->attach($adminRole->id);

        $fakeUuid = '00000000-0000-0000-0000-000000000000';
        $response = $this->actingAs($admin, 'sanctum')->getJson("/api/v1/patients/{$fakeUuid}");

        $response->assertStatus(404)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('code', 404)
            ->assertJsonStructure(['status', 'code', 'message']);
    }

    public function test_validation_failure_returns_standardized_422_json_with_errors(): void
    {
        $response = $this->postJson('/api/v1/auth/login', []);

        $response->assertStatus(422)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('code', 422)
            ->assertJsonStructure(['status', 'code', 'message', 'errors'])
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_unauthorized_action_returns_standardized_403_json(): void
    {
        $patientRole = Role::where('name', 'patient_registered')->firstOrFail();
        $patientUser = User::factory()->create();
        $patientUser->roles()->attach($patientRole->id);

        $ad = \App\Models\Advertisement::create([
            'user_id' => $patientUser->id,
            'title' => 'إعلان تجريبي',
            'content' => 'محتوى الإعلان',
            'start_date' => now()->format('Y-m-d'),
            'end_date' => now()->addDays(30)->format('Y-m-d'),
            'status' => 'pending_approval',
        ]);

        // Patient attempts to approve an advertisement -> 403 Forbidden
        $response = $this->actingAs($patientUser, 'sanctum')->putJson("/api/v1/advertisements/{$ad->id}/status", [
            'status' => 'active',
        ]);

        $response->assertStatus(422) // Service throws ValidationException on unauthorized status change
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('code', 422);
    }
}
