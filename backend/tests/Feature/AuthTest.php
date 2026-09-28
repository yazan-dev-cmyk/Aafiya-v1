<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_user_can_register_with_valid_data_and_receives_uuid_and_token(): void
    {
        $payload = [
            'name' => 'Dr. Ahmed Benali',
            'email' => 'ahmed.benali@aafiya.dz',
            'phone' => '+213555123456',
            'password' => 'SecurePassword123!',
            'role' => 'doctor',
            'specialty' => 'أمراض القلب (Cardiology)',
            'license_number' => 'DZ-ALG-2026-DOC-TEST',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'user' => [
                        'id',
                        'name',
                        'email',
                        'phone',
                        'is_active',
                        'roles',
                        'permissions',
                        'created_at',
                        'updated_at',
                    ],
                    'token',
                    'token_type',
                ],
            ]);

        $userId = $response->json('data.user.id');
        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
            $userId
        );

        $this->assertDatabaseHas('users', [
            'id' => $userId,
            'email' => 'ahmed.benali@aafiya.dz',
            'phone' => '+213555123456',
            'is_active' => true,
        ]);

        $user = User::find($userId);
        $this->assertTrue(Hash::check('SecurePassword123!', $user->password));
        $this->assertTrue($user->hasRole('doctor'));
    }

    public function test_user_cannot_register_with_duplicate_email_or_phone(): void
    {
        User::factory()->create([
            'email' => 'existing@aafiya.dz',
            'phone' => '+213555000111',
        ]);

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Duplicate User',
            'email' => 'existing@aafiya.dz',
            'phone' => '+213555999888',
            'password' => 'Password123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        $response2 = $this->postJson('/api/v1/auth/register', [
            'name' => 'Duplicate Phone User',
            'email' => 'another@aafiya.dz',
            'phone' => '+213555000111',
            'password' => 'Password123!',
        ]);

        $response2->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'doctor@aafiya.dz',
            'password' => Hash::make('CorrectPassword123!'),
            'is_active' => true,
        ]);
        $user->assignRole('doctor');

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'doctor@aafiya.dz',
            'password' => 'CorrectPassword123!',
            'device_name' => 'Web Browser',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'user' => ['id', 'email', 'roles', 'permissions'],
                    'token',
                    'token_type',
                ],
            ]);

        $this->assertNotEmpty($response->json('data.token'));
    }

    public function test_user_cannot_login_with_invalid_password(): void
    {
        User::factory()->create([
            'email' => 'doctor@aafiya.dz',
            'password' => Hash::make('CorrectPassword123!'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'doctor@aafiya.dz',
            'password' => 'WrongPassword!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_authenticated_user_can_access_me_profile_without_sensitive_data(): void
    {
        $user = User::factory()->create([
            'name' => 'Dr. Karim',
            'email' => 'karim@aafiya.dz',
            'password' => Hash::make('SecurePassword123!'),
        ]);
        $user->assignRole('doctor');

        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'id' => $user->id,
                    'name' => 'Dr. Karim',
                    'email' => 'karim@aafiya.dz',
                    'roles' => ['doctor'],
                ],
            ]);

        // Sensitive credentials must NEVER be in response
        $this->assertArrayNotHasKey('password', $response->json('data'));
        $this->assertArrayNotHasKey('remember_token', $response->json('data'));
    }

    public function test_authenticated_user_can_logout_and_token_is_revoked(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/logout');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Logged out successfully.',
            ]);

        // Token must be revoked
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->id,
        ]);

        app('auth')->forgetGuards();
        $unauthorizedResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/me');
        $unauthorizedResponse->assertStatus(401);
    }

    public function test_exactly_eleven_roles_are_seeded_with_correct_names(): void
    {
        $expectedRoles = [
            'patient_registered',
            'patient_guest',
            'doctor',
            'doctor_assistant',
            'booking_center',
            'lab',
            'lab_assistant',
            'radiology',
            'rad_assistant',
            'admin',
            'admin_assistant',
        ];

        $this->assertCount(11, Role::all());

        foreach ($expectedRoles as $roleName) {
            $this->assertDatabaseHas('roles', ['name' => $roleName]);
        }
    }

    public function test_seeded_permissions_match_p2_specification(): void
    {
        $requiredPermissions = [
            'clinic.manage_settings',
            'clinic.view_analytics',
            'clinic.create_staff',
            'clinical.write_rx',
            'clinical.view_ehr',
            'booking.manage_queue',
            'booking.confirm_quota',
            'booking.create',
            'booking.confirm_attendance',
            'patient.view_contacts',
            'lab.manage_orders',
            'lab.enter_results',
            'lab.finalize_results',
            'radiology.manage_orders',
            'radiology.upload_images',
            'radiology.finalize_report',
            'diagnostic.approve_result',
            'platform.manage_users',
            'platform.view_audit_logs',
            'platform.manage_ads',
        ];

        foreach ($requiredPermissions as $permissionName) {
            $this->assertDatabaseHas('permissions', ['name' => $permissionName]);
        }
    }
}
