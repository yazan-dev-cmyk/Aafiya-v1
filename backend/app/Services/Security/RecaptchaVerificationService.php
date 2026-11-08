<?php

namespace App\Services\Security;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RecaptchaVerificationService
{
    /**
     * Verify Google reCAPTCHA v2 Checkbox response token.
     *
     * @param string|null $token
     * @param string|null $ip
     * @return bool
     */
    public function verify(?string $token, ?string $ip = null): bool
    {
        if (empty($token)) {
            return false;
        }

        $secret = config('services.recaptcha.secret_key');

        // Test environment bypass: allow testing token in non-production
        if (app()->environment('local', 'testing') && $token === 'test_recaptcha_valid_token') {
            return true;
        }

        // If no secret configured in local/test environment, fail-open only in local if explicitly enabled
        if (empty($secret)) {
            if (app()->environment('local', 'testing')) {
                Log::warning('reCAPTCHA secret key is not set; allowing token in local/testing environment.');
                return true;
            }
            Log::error('reCAPTCHA secret key is missing in production environment.');
            return false;
        }

        try {
            $payload = [
                'secret' => $secret,
                'response' => $token,
            ];

            if (! empty($ip)) {
                $payload['remoteip'] = $ip;
            }

            $response = Http::asForm()
                ->timeout(5)
                ->post('https://www.google.com/recaptcha/api/siteverify', $payload);

            if (! $response->successful()) {
                Log::warning('Google reCAPTCHA HTTP request failed with status ' . $response->status());
                return false;
            }

            $data = $response->json();

            return (bool) ($data['success'] ?? false);
        } catch (\Throwable $e) {
            Log::error('reCAPTCHA verification exception: ' . $e->getMessage());
            return false;
        }
    }
}
