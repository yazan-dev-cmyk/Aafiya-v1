<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class SafeDestinationUrl implements ValidationRule
{
    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        if (!is_string($value)) {
            $fail(__('validation.string', ['attribute' => $attribute]));
            return;
        }

        // 1. Multi-encoding detection (e.g. %252e%252e)
        if (rawurldecode($value) !== rawurldecode(rawurldecode($value))) {
            $fail('Multi-encoded destination URLs are strictly prohibited.');
            return;
        }

        // 2. Reject control characters (0x00-0x1F, 0x7F) and backslashes (\)
        if (preg_match('/[\x00-\x1F\x7F\\\\]/', $value)) {
            $fail('The destination URL contains illegal control characters or backslashes.');
            return;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            $fail('The destination URL cannot be whitespace only.');
            return;
        }

        // 3. Handle Internal Relative Paths
        if (str_starts_with($trimmed, '/')) {
            // Reject protocol-relative URLs (e.g. //example.com)
            if (str_starts_with($trimmed, '//')) {
                $fail('Protocol-relative URLs are not permitted.');
                return;
            }

            // Reject directory traversal segments
            if (
                str_contains($trimmed, '/../') ||
                str_contains($trimmed, '/./') ||
                str_ends_with($trimmed, '/..') ||
                str_ends_with($trimmed, '/.')
            ) {
                $fail('Path traversal segments are not permitted in relative URLs.');
                return;
            }

            return;
        }

        // 4. Handle External URLs
        $parsed = parse_url($trimmed);
        if ($parsed === false || !isset($parsed['scheme']) || !isset($parsed['host'])) {
            $fail('The destination URL must be a valid internal path starting with / or a secure HTTPS URL.');
            return;
        }

        // Enforce HTTPS scheme strictly
        $scheme = strtolower($parsed['scheme']);
        if ($scheme !== 'https') {
            $fail('External destination URLs must strictly use the secure HTTPS protocol.');
            return;
        }

        // Reject embedded credentials (e.g. https://user:pass@example.com)
        if (isset($parsed['user']) || isset($parsed['pass'])) {
            $fail('URLs containing embedded user credentials are not permitted.');
            return;
        }

        $host = strtolower($parsed['host']);

        // Handle IPv6 literal brackets in host (e.g. [::1])
        if (str_starts_with($host, '[') && str_ends_with($host, ']')) {
            $rawIp = substr($host, 1, -1);
            if (filter_var($rawIp, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
                $isPublic = filter_var(
                    $rawIp,
                    FILTER_VALIDATE_IP,
                    FILTER_FLAG_IPV6 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
                );
                if (!$isPublic) {
                    $fail('Private, reserved, or loopback IPv6 destinations are not permitted.');
                    return;
                }
            }
        }

        // Handle IPv4 literals
        if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $isPublic = filter_var(
                $host,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
            );
            if (!$isPublic) {
                $fail('Private, reserved, or loopback IP destinations are not permitted.');
                return;
            }
            return;
        }

        // Rejection of localhost, single-label hosts, and private/internal domains
        if (
            $host === 'localhost' ||
            str_ends_with($host, '.local') ||
            str_ends_with($host, '.internal') ||
            str_ends_with($host, '.onion') ||
            !str_contains($host, '.')
        ) {
            $fail('Local, internal, or pseudo-domain destinations are not permitted.');
            return;
        }
    }
}
