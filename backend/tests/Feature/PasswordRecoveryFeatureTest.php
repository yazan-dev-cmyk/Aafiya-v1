<?php

namespace Tests\Feature;

use App\Mail\PasswordChangedSecurityAlertMail;
use App\Mail\PasswordResetNotificationMail;
use App\Models\User;
use App\Services\Security\PasswordRecoveryRateLimiter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

class PasswordRecoveryFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
    }

    /**
     * Test existing user receives uniform response and reset email is queued.
     */
    public function test_existing_user_receives_uniform_response_and_email_is_queued(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'email' => 'doctor.recovery@aafiya.dz',
            'password' => Hash::make('OldPassword123!'),
            'is_active' => true,
        ]);
        $user->assignRole('doctor');

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'doctor.recovery@aafiya.dz',
            'locale' => 'ar',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'message' => 'إذا كان هذا البريد مرتبطاً بحساب، فستصلك رسالة استعادة كلمة المرور.',
        ]);

        Mail::assertQueued(PasswordResetNotificationMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });

        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'doctor.recovery@aafiya.dz',
        ]);
    }

    /**
     * Test non-existent email returns identical uniform response with zero user enumeration.
     */
    public function test_non_existent_email_returns_identical_uniform_response_without_email(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'nonexistent.user@aafiya.dz',
            'locale' => 'en',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'message' => 'If this email address is associated with an account, a password recovery message will be sent.',
        ]);

        Mail::assertNothingQueued();

        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => 'nonexistent.user@aafiya.dz',
        ]);
    }

    /**
     * Test unverified email user is eligible for recovery (DEC-PWR-05).
     */
    public function test_unverified_email_user_can_request_recovery(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'email' => 'unverified.patient@aafiya.dz',
            'email_verified_at' => null,
            'password' => Hash::make('OldPassword123!'),
            'is_active' => true,
        ]);
        $user->assignRole('patient_registered');

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'unverified.patient@aafiya.dz',
        ]);

        $response->assertStatus(200);

        Mail::assertQueued(PasswordResetNotificationMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });
    }

    /**
     * Test rate limiter: attempts 1-3 free, attempts 4-5 require reCAPTCHA.
     */
    public function test_rate_limiter_allows_three_free_attempts_and_requires_recaptcha_on_fourth(): void
    {
        Mail::fake();
        $email = 'throttling.test@aafiya.dz';

        User::factory()->create([
            'email' => $email,
            'password' => Hash::make('Password123!'),
        ]);

        // Attempts 1 to 3: Free tier (no captcha required)
        for ($i = 1; $i <= 3; $i++) {
            $res = $this->postJson('/api/v1/auth/forgot-password', ['email' => $email]);
            $res->assertStatus(200);
        }

        // Attempt 4: Missing captcha -> 422 CAPTCHA_REQUIRED
        $res4 = $this->postJson('/api/v1/auth/forgot-password', ['email' => $email]);
        $res4->assertStatus(422);
        $res4->assertJson([
            'status' => 'error',
            'error_code' => 'CAPTCHA_REQUIRED',
        ]);

        // Attempt 4 with valid test captcha -> 200 OK
        $res4Valid = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => $email,
            'recaptcha_token' => 'test_recaptcha_valid_token',
        ]);
        $res4Valid->assertStatus(200);
    }

    /**
     * Test rate limiter enforces 30-minute lockout upon 5th failure.
     */
    public function test_rate_limiter_enforces_lockout_after_five_failed_attempts(): void
    {
        Mail::fake();
        $email = 'lockout.test@aafiya.dz';

        User::factory()->create([
            'email' => $email,
            'password' => Hash::make('Password123!'),
        ]);

        // Attempts 1 to 3
        for ($i = 1; $i <= 3; $i++) {
            $this->postJson('/api/v1/auth/forgot-password', ['email' => $email])->assertStatus(200);
        }

        // Attempt 4 without captcha (fails)
        $this->postJson('/api/v1/auth/forgot-password', ['email' => $email])->assertStatus(422);

        // Attempt 5 without captcha (fails and triggers 30-min lockout)
        $res5 = $this->postJson('/api/v1/auth/forgot-password', ['email' => $email]);
        $res5->assertStatus(422);

        // Subsequent attempt is blocked with 429 Lockout
        $res6 = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => $email,
            'recaptcha_token' => 'test_recaptcha_valid_token',
        ]);
        $res6->assertStatus(429);
        $res6->assertJson([
            'status' => 'error',
            'error_code' => 'RATE_LIMIT_EXCEEDED',
        ]);
    }

    /**
     * Test requesting a new link invalidates the previous link (DEC-PWR-04).
     */
    public function test_requesting_new_link_invalidates_previous_token(): void
    {
        Mail::fake();
        $email = 'single.active.token@aafiya.dz';

        $user = User::factory()->create([
            'email' => $email,
            'password' => Hash::make('OldPassword123!'),
        ]);

        // Request 1
        $this->postJson('/api/v1/auth/forgot-password', ['email' => $email])->assertStatus(200);
        $firstHash = DB::table('password_reset_tokens')->where('email', $email)->value('token');

        // Request 2
        $this->postJson('/api/v1/auth/forgot-password', ['email' => $email])->assertStatus(200);
        $secondHash = DB::table('password_reset_tokens')->where('email', $email)->value('token');

        // Verify tokens are different and only one row exists
        $this->assertNotEquals($firstHash, $secondHash);
        $this->assertEquals(1, DB::table('password_reset_tokens')->where('email', $email)->count());
    }

    /**
     * Test token verification endpoint.
     */
    public function test_verify_reset_token_endpoint(): void
    {
        $email = 'verify.token@aafiya.dz';
        $user = User::factory()->create([
            'email' => $email,
            'password' => Hash::make('Password123!'),
        ]);

        $plainToken = Str::random(64);
        DB::table('password_reset_tokens')->insert([
            'email' => $email,
            'token' => Hash::make($plainToken),
            'created_at' => now(),
        ]);

        // Valid token
        $resValid = $this->postJson('/api/v1/auth/verify-reset-token', [
            'email' => $email,
            'token' => $plainToken,
        ]);
        $resValid->assertStatus(200);
        $resValid->assertJson([
            'status' => 'success',
            'valid' => true,
        ]);

        // Invalid token
        $resInvalid = $this->postJson('/api/v1/auth/verify-reset-token', [
            'email' => $email,
            'token' => 'invalid-token-value',
        ]);
        $resInvalid->assertStatus(422);
    }

    /**
     * Test full password reset workflow:
     * - updates password hash
     * - deletes reset token
     * - purges Sanctum tokens across devices
     * - purges DB sessions
     * - cycles remember token
     * - queues security notification email
     * - zero auto-login (user logs in manually with new password)
     */
    public function test_full_password_reset_workflow(): void
    {
        Mail::fake();

        $oldPassword = 'OldPassword123!';
        $newPassword = 'BrandNewPassword2026!';
        $email = 'full.reset@aafiya.dz';

        $user = User::factory()->create([
            'email' => $email,
            'password' => Hash::make($oldPassword),
            'remember_token' => 'old_remember_token_123',
            'is_active' => true,
        ]);
        $user->assignRole('doctor');

        // Create Sanctum personal access tokens
        $user->createToken('web_session');
        $user->createToken('mobile_device_1');
        $this->assertEquals(2, $user->tokens()->count());

        // Create DB session in sessions table
        DB::table('sessions')->insert([
            'id' => Str::random(40),
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Mozilla/5.0',
            'payload' => 'dummy_payload',
            'last_activity' => time(),
        ]);
        $this->assertEquals(1, DB::table('sessions')->where('user_id', $user->id)->count());

        // Create active reset token
        $plainToken = Str::random(64);
        DB::table('password_reset_tokens')->insert([
            'email' => $email,
            'token' => Hash::make($plainToken),
            'created_at' => now(),
        ]);

        // Execute reset
        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => $email,
            'token' => $plainToken,
            'password' => $newPassword,
            'password_confirmation' => $newPassword,
            'locale' => 'ar',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'message' => 'تم تغيير كلمة المرور بنجاح. يرجى تسجيل الدخول باستخدام كلمة المرور الجديدة.',
        ]);

        // 1. Check user model updated
        $freshUser = $user->fresh();
        $this->assertTrue(Hash::check($newPassword, $freshUser->password));
        $this->assertFalse(Hash::check($oldPassword, $freshUser->password));
        $this->assertNotEquals('old_remember_token_123', $freshUser->remember_token);

        // 2. Token consumed (deleted)
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $email]);

        // 3. Sanctum tokens revoked
        $this->assertEquals(0, $freshUser->tokens()->count());

        // 4. DB sessions deleted
        $this->assertEquals(0, DB::table('sessions')->where('user_id', $user->id)->count());

        // 5. Security alert email queued (zero credentials exposed)
        Mail::assertQueued(PasswordChangedSecurityAlertMail::class, function ($mail) use ($email) {
            return $mail->hasTo($email);
        });

        // 6. Manual login with new password succeeds
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => $newPassword,
        ]);
        $loginRes->assertStatus(200);

        // 7. Old password rejected
        $oldLoginRes = $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => $oldPassword,
        ]);
        $oldLoginRes->assertStatus(401);

        // 8. Replaying consumed token fails
        $replayRes = $this->postJson('/api/v1/auth/reset-password', [
            'email' => $email,
            'token' => $plainToken,
            'password' => 'AnotherPassword123!',
            'password_confirmation' => 'AnotherPassword123!',
        ]);
        $replayRes->assertStatus(422);
    }
}
