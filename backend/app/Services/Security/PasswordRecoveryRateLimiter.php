<?php

namespace App\Services\Security;

use Illuminate\Support\Facades\Cache;

class PasswordRecoveryRateLimiter
{
    /**
     * Duration of the sliding attempts window in seconds (15 minutes).
     */
    public const WINDOW_SECONDS = 900;

    /**
     * Duration of the enforcement lockout in seconds (30 minutes).
     */
    public const LOCKOUT_SECONDS = 1800;

    /**
     * Maximum free attempts before Google reCAPTCHA is mandatory.
     */
    public const FREE_ATTEMPTS_LIMIT = 3;

    /**
     * Maximum total attempts allowed before a 30-minute lockout is enforced.
     */
    public const MAX_ATTEMPTS = 5;

    /**
     * Build canonical normalized cache key for attempts.
     */
    protected function attemptsKey(string $email): string
    {
        $hash = hash('sha256', strtolower(trim($email)));
        return "pwr_attempts:{$hash}";
    }

    /**
     * Build canonical normalized cache key for lockout.
     */
    protected function lockoutKey(string $email): string
    {
        $hash = hash('sha256', strtolower(trim($email)));
        return "pwr_lockout:{$hash}";
    }

    /**
     * Determine if recovery requests for this email are currently locked out.
     */
    public function isLockedOut(string $email): bool
    {
        return Cache::has($this->lockoutKey($email));
    }

    /**
     * Retrieve the current count of recovery attempts for this email within the active window.
     */
    public function getAttempts(string $email): int
    {
        return (int) Cache::get($this->attemptsKey($email), 0);
    }

    /**
     * Determine if Google reCAPTCHA v2 is mandatory for the current attempt.
     * Attempts 1, 2, 3 are free.
     * Attempt 4 and 5 require reCAPTCHA.
     */
    public function isCaptchaRequired(string $email): bool
    {
        return $this->getAttempts($email) >= self::FREE_ATTEMPTS_LIMIT;
    }

    /**
     * Record a failed or missing reCAPTCHA attempt.
     *
     * Rules:
     * - Attempt 4 failure: counter increments to 4, no lockout yet; Attempt 5 remains available.
     * - Attempt 5 failure: counter reaches 5, triggers an authoritative 30-minute lockout.
     *
     * @param string $email
     * @return array{locked_out: bool, attempts: int, remaining_seconds: int}
     */
    public function recordFailedCaptcha(string $email): array
    {
        $key = $this->attemptsKey($email);
        $attempts = (int) Cache::get($key, 0) + 1;

        if ($attempts >= self::MAX_ATTEMPTS) {
            // Enforce 30-minute lockout and purge attempt counter
            Cache::put($this->lockoutKey($email), true, now()->addSeconds(self::LOCKOUT_SECONDS));
            Cache::forget($key);

            return [
                'locked_out' => true,
                'attempts' => self::MAX_ATTEMPTS,
                'remaining_seconds' => self::LOCKOUT_SECONDS,
            ];
        }

        // Save attempt counter with 15-minute sliding TTL
        Cache::put($key, $attempts, now()->addSeconds(self::WINDOW_SECONDS));

        return [
            'locked_out' => false,
            'attempts' => $attempts,
            'remaining_seconds' => 0,
        ];
    }

    /**
     * Record a successful request and advance attempt state.
     *
     * Rules:
     * - Increments attempt count within 15-minute window.
     * - If attempt count reaches MAX_ATTEMPTS (5 requests in 15 minutes),
     *   the quota is exhausted and a 30-minute lockout is enforced for subsequent requests.
     *
     * @param string $email
     * @return array{locked_out: bool, attempts: int}
     */
    public function recordSuccessfulRequest(string $email): array
    {
        $key = $this->attemptsKey($email);
        $attempts = (int) Cache::get($key, 0) + 1;

        if ($attempts >= self::MAX_ATTEMPTS) {
            // Quota of 5 requests fulfilled. Impose 30-minute lockout for future requests.
            Cache::put($this->lockoutKey($email), true, now()->addSeconds(self::LOCKOUT_SECONDS));
            Cache::forget($key);

            return [
                'locked_out' => true,
                'attempts' => self::MAX_ATTEMPTS,
            ];
        }

        Cache::put($key, $attempts, now()->addSeconds(self::WINDOW_SECONDS));

        return [
            'locked_out' => false,
            'attempts' => $attempts,
        ];
    }

    /**
     * Reset/clear all attempt counters and lockout state for this email (e.g. after successful password reset).
     */
    public function clear(string $email): void
    {
        Cache::forget($this->attemptsKey($email));
        Cache::forget($this->lockoutKey($email));
    }
}
