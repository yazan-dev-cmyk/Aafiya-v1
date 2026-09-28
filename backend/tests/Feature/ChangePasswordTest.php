<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ChangePasswordTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
    }

    /**
     * Test successful password change, database hash update, old password rejection, and new password login.
     */
    public function test_user_can_successfully_change_password_and_login_with_new_password(): void
    {
        $oldPassword = 'OldSecret2026!';
        $newPassword = 'BrandNewSecret2026!';

        $user = User::factory()->create([
            'name' => 'Dr. Karim Mansouri',
            'email' => 'dr.karim@aafiya.dz',
            'phone' => '+213550111999',
            'password' => Hash::make($oldPassword),
            'is_active' => true,
        ]);
        $user->assignRole('doctor');

        $token = $user->createToken('auth')->plainTextToken;

        // 1. Send Change Password request
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/auth/change-password', [
                'current_password' => $oldPassword,
                'new_password' => $newPassword,
                'new_password_confirmation' => $newPassword,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'message' => 'Password updated successfully.',
        ]);

        // 2. Verify Database: password must be updated, hashed, and not match old password
        $freshUser = $user->fresh();
        $this->assertNotNull($freshUser);
        $this->assertTrue(Hash::check($newPassword, $freshUser->password), 'New password must match stored hash');
        $this->assertFalse(Hash::check($oldPassword, $freshUser->password), 'Old password must NOT match stored hash');
        $this->assertNotEquals($newPassword, $freshUser->password, 'Password must not be stored in plain text');

        // Verify no side-effects on user profile
        $this->assertEquals('Dr. Karim Mansouri', $freshUser->name);
        $this->assertEquals('dr.karim@aafiya.dz', $freshUser->email);
        $this->assertEquals('+213550111999', $freshUser->phone);
        $this->assertTrue($freshUser->is_active);
        $this->assertTrue($freshUser->hasRole('doctor'));

        // 3. Login with OLD password -> MUST FAIL (422 validation error)
        $this->flushHeaders();
        app('auth')->forgetGuards();
        $oldLoginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'dr.karim@aafiya.dz',
            'password' => $oldPassword,
        ]);
        $oldLoginResponse->assertStatus(422);
        $oldLoginResponse->assertJsonValidationErrors('email');

        // 4. Login with NEW password -> MUST SUCCEED (200 OK + Token)
        $this->flushHeaders();
        app('auth')->forgetGuards();
        $newLoginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'dr.karim@aafiya.dz',
            'password' => $newPassword,
        ]);
        $newLoginResponse->assertStatus(200);
        $newLoginResponse->assertJsonStructure([
            'status',
            'data' => [
                'user' => ['id', 'name', 'email', 'roles'],
                'token',
            ],
        ]);
        $this->assertNotEmpty($newLoginResponse->json('data.token'));
    }

    /**
     * Test validation failure when current password is wrong.
     */
    public function test_change_password_fails_if_current_password_is_incorrect(): void
    {
        $user = User::factory()->create([
            'email' => 'patient@aafiya.dz',
            'password' => Hash::make('CorrectPassword123!'),
            'is_active' => true,
        ]);
        $user->assignRole('patient_registered');

        $token = $user->createToken('auth')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/auth/change-password', [
                'current_password' => 'WrongCurrentPassword!',
                'new_password' => 'NewPassword999!',
                'new_password_confirmation' => 'NewPassword999!',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('current_password');

        // Verify database password remained untouched
        $this->assertTrue(Hash::check('CorrectPassword123!', $user->fresh()->password));
    }

    /**
     * Test validation failure when confirmation does not match.
     */
    public function test_change_password_fails_if_confirmation_mismatches(): void
    {
        $user = User::factory()->create([
            'email' => 'lab@aafiya.dz',
            'password' => Hash::make('OldPassword123!'),
            'is_active' => true,
        ]);
        $user->assignRole('lab');

        $token = $user->createToken('auth')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/auth/change-password', [
                'current_password' => 'OldPassword123!',
                'new_password' => 'NewPassword999!',
                'new_password_confirmation' => 'MismatchedPassword999!',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('new_password');
    }

    /**
     * Test validation failure when new password is too short (< 8 chars).
     */
    public function test_change_password_fails_if_new_password_is_too_short(): void
    {
        $user = User::factory()->create([
            'email' => 'admin@aafiya.dz',
            'password' => Hash::make('OldPassword123!'),
            'is_active' => true,
        ]);
        $user->assignRole('admin');

        $token = $user->createToken('auth')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/auth/change-password', [
                'current_password' => 'OldPassword123!',
                'new_password' => 'short',
                'new_password_confirmation' => 'short',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('new_password');
    }

    /**
     * Test unauthenticated request is blocked.
     */
    public function test_unauthenticated_user_cannot_change_password(): void
    {
        $response = $this->postJson('/api/v1/auth/change-password', [
            'current_password' => 'OldPassword123!',
            'new_password' => 'NewPassword999!',
            'new_password_confirmation' => 'NewPassword999!',
        ]);

        $response->assertStatus(401);
    }

    /**
     * Test password change workflow across all 10 roles in Aafiya.
     */
    #[DataProvider('roleProvider')]
    public function test_password_change_across_all_roles(string $roleName): void
    {
        $oldPass = 'InitialRoleSecret2026!';
        $newPass = 'UpdatedRoleSecret2026!';

        $user = User::factory()->create([
            'email' => "user.{$roleName}@aafiya.dz",
            'password' => Hash::make($oldPass),
            'is_active' => true,
        ]);
        $user->assignRole($roleName);

        $token = $user->createToken('auth')->plainTextToken;

        // Change Password
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/auth/change-password', [
                'current_password' => $oldPass,
                'new_password' => $newPass,
                'new_password_confirmation' => $newPass,
            ]);

        $response->assertStatus(200);
        $this->assertTrue(Hash::check($newPass, $user->fresh()->password));

        // Old login fails
        $this->flushHeaders();
        app('auth')->forgetGuards();
        $oldLogin = $this->postJson('/api/v1/auth/login', [
            'email' => "user.{$roleName}@aafiya.dz",
            'password' => $oldPass,
        ]);
        $oldLogin->assertStatus(422);

        // New login succeeds
        $this->flushHeaders();
        app('auth')->forgetGuards();
        $newLogin = $this->postJson('/api/v1/auth/login', [
            'email' => "user.{$roleName}@aafiya.dz",
            'password' => $newPass,
        ]);
        $newLogin->assertStatus(200);
        $roles = $newLogin->json('data.user.roles');
        $this->assertContains($roleName, $roles);
    }

    public static function roleProvider(): array
    {
        return [
            'admin' => ['admin'],
            'admin_assistant' => ['admin_assistant'],
            'doctor' => ['doctor'],
            'doctor_assistant' => ['doctor_assistant'],
            'patient_registered' => ['patient_registered'],
            'booking_center' => ['booking_center'],
            'lab' => ['lab'],
            'lab_assistant' => ['lab_assistant'],
            'radiology' => ['radiology'],
            'rad_assistant' => ['rad_assistant'],
        ];
    }
}
