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
            'name' => 'Ahmed Benali',
            'email' => 'ahmed.benali@aafiya.dz',
            'phone' => '+213555123456',
            'password' => 'SecurePassword123!',
            'accepted_terms' => true,
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
        $this->assertTrue($user->hasRole('patient_registered'));
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

    /**
     * SEC-01 Regression: Prohibited roles cannot be assigned via public self-registration.
     */
    public function test_prohibited_roles_cannot_be_assigned_via_public_registration(): void
    {
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);

        $prohibitedRoles = [
            'admin',
            'admin_assistant',
            'clinic_director',
            'doctor',
            'doctor_assistant',
            'lab',
            'lab_assistant',
            'radiology',
            'rad_assistant',
            'superadmin',
            'invalid_role_xyz',
        ];

        foreach ($prohibitedRoles as $index => $prohibitedRole) {
            $response = $this->postJson('/api/v1/auth/register', [
                'name' => "Attacker {$index}",
                'email' => "attacker{$index}@exploit.local",
                'phone' => "+2136990000" . str_pad((string) $index, 2, '0', STR_PAD_LEFT),
                'password' => 'ExploitPass123!',
                'role' => $prohibitedRole,
                'accepted_terms' => true,
            ]);

            $response->assertStatus(422)
                ->assertJsonValidationErrors(['role']);

            $this->assertDatabaseMissing('users', [
                'email' => "attacker{$index}@exploit.local",
            ]);
        }
    }

    /**
     * SEC-01 Regression: Booking center registration with whitelisted role succeeds and is pending.
     */
    public function test_booking_center_registration_succeeds_with_whitelisted_role_and_pending_status(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'مركز الشفاء للحجز',
            'manager_name' => 'عمر خالد',
            'email' => 'contact@alshifa-booking.dz',
            'phone' => '+213550998877',
            'password' => 'SecureAgency2026!',
            'role' => 'booking_center',
            'commercial_register' => 'RC-16/00-1122334',
            'license_number' => 'DZ-BC-2026-009',
            'wilaya' => 'الجزائر العاصمة',
            'address' => 'شارع ديدوش مراد',
            'accepted_terms' => true,
        ]);

        $response->assertStatus(201);
        $user = User::where('email', 'contact@alshifa-booking.dz')->firstOrFail();
        $this->assertTrue($user->hasRole('booking_center'));

        $this->assertDatabaseHas('booking_centers', [
            'user_id' => $user->id,
            'verification_status' => 'pending',
            'is_active' => false,
        ]);
    }

    /**
     * SEC-01 Regression: AuthService rejects prohibited roles directly with ValidationException.
     */
    public function test_auth_service_rejects_unauthorized_role_directly(): void
    {
        $authService = app(\App\Services\AuthService::class);

        $this->expectException(\Illuminate\Validation\ValidationException::class);

        $authService->register([
            'name' => 'Direct Escalation Attempt',
            'email' => 'direct.escalation@exploit.local',
            'phone' => '+213550887766',
            'password' => 'DirectPass123!',
            'role' => 'admin',
            'accepted_terms' => true,
        ]);
    }
}
