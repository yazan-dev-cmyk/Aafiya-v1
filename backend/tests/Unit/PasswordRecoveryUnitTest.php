<?php

namespace Tests\Unit;

use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\VerifyResetTokenRequest;
use App\Mail\PasswordChangedSecurityAlertMail;
use App\Mail\PasswordResetNotificationMail;
use App\Models\User;
use App\Services\Security\PasswordRecoveryRateLimiter;
use App\Services\Security\RecaptchaVerificationService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class PasswordRecoveryUnitTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['cache.default' => 'array']);
        Cache::flush();
    }

    /**
     * Test PasswordRecoveryRateLimiter constants and key generation.
     */
    public function test_rate_limiter_constants_and_normalized_keys(): void
    {
        $limiter = new PasswordRecoveryRateLimiter();

        $this->assertSame(900, PasswordRecoveryRateLimiter::WINDOW_SECONDS);
        $this->assertSame(1800, PasswordRecoveryRateLimiter::LOCKOUT_SECONDS);
        $this->assertSame(3, PasswordRecoveryRateLimiter::FREE_ATTEMPTS_LIMIT);
        $this->assertSame(5, PasswordRecoveryRateLimiter::MAX_ATTEMPTS);

        $reflection = new \ReflectionClass($limiter);
        $attemptsKeyMethod = $reflection->getMethod('attemptsKey');
        $attemptsKeyMethod->setAccessible(true);
        $lockoutKeyMethod = $reflection->getMethod('lockoutKey');
        $lockoutKeyMethod->setAccessible(true);

        $email1 = 'Doctor.Test@Aafiya.DZ';
        $email2 = '  doctor.test@aafiya.dz  ';
        $expectedHash = hash('sha256', 'doctor.test@aafiya.dz');

        $this->assertSame("pwr_attempts:{$expectedHash}", $attemptsKeyMethod->invoke($limiter, $email1));
        $this->assertSame("pwr_attempts:{$expectedHash}", $attemptsKeyMethod->invoke($limiter, $email2));
        $this->assertSame("pwr_lockout:{$expectedHash}", $lockoutKeyMethod->invoke($limiter, $email1));
        $this->assertSame("pwr_lockout:{$expectedHash}", $lockoutKeyMethod->invoke($limiter, $email2));
    }

    /**
     * Test full lifecycle of rate limiter sliding window and lockout enforcement.
     */
    public function test_rate_limiter_tiered_enforcement_and_lockout(): void
    {
        $limiter = new PasswordRecoveryRateLimiter();
        $email = 'User.Limiter@Aafiya.DZ';

        // 1. Initial State
        $this->assertFalse($limiter->isLockedOut($email));
        $this->assertSame(0, $limiter->getAttempts($email));
        $this->assertFalse($limiter->isCaptchaRequired($email));

        // 2. Free attempts tier (Attempts 1 to 3 via successful requests)
        $r1 = $limiter->recordSuccessfulRequest($email);
        $this->assertFalse($r1['locked_out']);
        $this->assertSame(1, $r1['attempts']);
        $this->assertFalse($limiter->isCaptchaRequired($email));

        $r2 = $limiter->recordSuccessfulRequest($email);
        $this->assertSame(2, $r2['attempts']);
        $this->assertFalse($limiter->isCaptchaRequired($email));

        $r3 = $limiter->recordSuccessfulRequest($email);
        $this->assertSame(3, $r3['attempts']);
        // After 3 attempts, captcha becomes required
        $this->assertTrue($limiter->isCaptchaRequired($email));

        // 3. Attempt 4 fails captcha: incremented to 4, no lockout yet
        $f4 = $limiter->recordFailedCaptcha($email);
        $this->assertFalse($f4['locked_out']);
        $this->assertSame(4, $f4['attempts']);
        $this->assertFalse($limiter->isLockedOut($email));

        // 4. Attempt 5 fails captcha: triggers 30-minute lockout!
        $f5 = $limiter->recordFailedCaptcha($email);
        $this->assertTrue($f5['locked_out']);
        $this->assertSame(5, $f5['attempts']);
        $this->assertSame(1800, $f5['remaining_seconds']);
        $this->assertTrue($limiter->isLockedOut($email));
        $this->assertSame(1800, $f5['remaining_seconds']);

        // 5. Clear state
        $limiter->clear($email);
        $this->assertFalse($limiter->isLockedOut($email));
        $this->assertSame(0, $limiter->getAttempts($email));
    }

    /**
     * Test RecaptchaVerificationService test token bypass.
     */
    public function test_recaptcha_verification_service(): void
    {
        $service = new RecaptchaVerificationService();

        $this->assertTrue(
            $service->verify('test_recaptcha_valid_token'),
            'Test token bypass must always return true for automated testing'
        );

        $this->assertFalse(
            $service->verify(null),
            'Null token must return false'
        );

        $this->assertFalse(
            $service->verify(''),
            'Empty token must return false'
        );
    }

    /**
     * Test FormRequest validation rules and normalization.
     */
    public function test_form_requests_validation_and_normalization(): void
    {
        // 1. ForgotPasswordRequest validation
        $forgotReq = new ForgotPasswordRequest();
        $forgotRules = $forgotReq->rules();
        $this->assertArrayHasKey('email', $forgotRules);

        $validForgot = Validator::make(['email' => 'TEST@AAFIYA.DZ'], $forgotRules);
        $this->assertTrue($validForgot->passes());

        $invalidForgot = Validator::make(['email' => 'not-an-email'], $forgotRules);
        $this->assertFalse($invalidForgot->passes());

        // 2. VerifyResetTokenRequest validation
        $verifyReq = new VerifyResetTokenRequest();
        $verifyRules = $verifyReq->rules();
        $this->assertArrayHasKey('token', $verifyRules);
        $this->assertArrayHasKey('email', $verifyRules);

        $validVerify = Validator::make(['email' => 'test@aafiya.dz', 'token' => 'abc123token'], $verifyRules);
        $this->assertTrue($validVerify->passes());

        // 3. ResetPasswordRequest validation (8 min chars, confirmed)
        $resetReq = new ResetPasswordRequest();
        $resetRules = $resetReq->rules();
        $this->assertArrayHasKey('password', $resetRules);
        $this->assertArrayHasKey('password_confirmation', $resetRules);

        $validReset = Validator::make([
            'email' => 'test@aafiya.dz',
            'token' => 'abc123token',
            'password' => 'SecurePass2026!',
            'password_confirmation' => 'SecurePass2026!',
        ], $resetRules);
        $this->assertTrue($validReset->passes());

        $shortPass = Validator::make([
            'email' => 'test@aafiya.dz',
            'token' => 'abc123token',
            'password' => 'short',
            'password_confirmation' => 'short',
        ], $resetRules);
        $this->assertFalse($shortPass->passes());

        $mismatchedPass = Validator::make([
            'email' => 'test@aafiya.dz',
            'token' => 'abc123token',
            'password' => 'SecurePass2026!',
            'password_confirmation' => 'DifferentPass2026!',
        ], $resetRules);
        $this->assertFalse($mismatchedPass->passes());
    }

    /**
     * Test Mailable envelopes, subjects, and views.
     */
    public function test_mailables_envelope_and_views(): void
    {
        // 1. PasswordResetNotificationMail
        $user = new User();
        $user->name = 'Dr. Ahmed';
        $user->email = 'ahmed@aafiya.dz';

        $plainToken = 'sample_plain_token_64chars';
        $resetMail = new PasswordResetNotificationMail($user, $plainToken, 'ar');
        $envelope = $resetMail->envelope();
        $this->assertStringContainsString('طلب استعادة كلمة المرور', $envelope->subject);
        $this->assertStringContainsString('sample_plain_token_64chars', $resetMail->resetUrl);

        $resetMailEn = new PasswordResetNotificationMail($user, $plainToken, 'en');
        $this->assertStringContainsString('Password Reset Request', $resetMailEn->envelope()->subject);

        $content = $resetMail->content();
        $this->assertSame('emails.password-reset', $content->view);

        // 2. PasswordChangedSecurityAlertMail
        $alertMail = new PasswordChangedSecurityAlertMail($user, 'ar');
        $alertEnvelope = $alertMail->envelope();
        $this->assertStringContainsString('تنبيه أمني', $alertEnvelope->subject);

        $alertMailFr = new PasswordChangedSecurityAlertMail($user, 'fr');
        $this->assertStringContainsString('Alerte de sécurité', $alertMailFr->envelope()->subject);

        $alertContent = $alertMail->content();
        $this->assertSame('emails.password-changed', $alertContent->view);
    }
}
