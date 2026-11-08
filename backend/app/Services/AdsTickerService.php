<?php

namespace App\Services;

use App\Models\Advertisement;
use App\Models\AdvertisementPlacement;
use App\Models\AdvertisementUserClick;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdsTickerService
{
    /**
     * Resolve audience string from authenticated user context.
     */
    public function resolveAudience(?User $user): string
    {
        if (!$user) {
            return 'public';
        }

        // Check medical & clinical roles
        $roles = [
            'doctor',
            'doctor_assistant',
            'booking_center',
            'lab',
            'lab_assistant',
            'radiology',
            'rad_assistant',
        ];

        foreach ($roles as $role) {
            if ($user->hasRole($role)) {
                return $role;
            }
        }

        if ($user->hasRole('patient_registered') || $user->hasRole('patient_guest')) {
            return 'patient';
        }

        if ($user->hasRole('admin')) {
            return 'admin';
        }

        if ($user->hasRole('admin_assistant')) {
            return 'admin_assistant';
        }

        return 'public';
    }

    /**
     * Check if a specific audience is enabled via SystemSetting (strict fail-closed).
     */
    public function isAudienceEnabled(string $audience): bool
    {
        // Public, patient, all, admin, and admin_assistant audiences are enabled by default
        if (in_array($audience, ['public', 'patient', 'all', 'admin', 'admin_assistant'], true)) {
            return true;
        }

        $medicalAudiences = [
            'doctor',
            'doctor_assistant',
            'booking_center',
            'lab',
            'lab_assistant',
            'radiology',
            'rad_assistant',
        ];

        if (in_array($audience, $medicalAudiences, true)) {
            $key = "ads.audience.{$audience}.enabled";
            // Strict fail-closed: missing setting evaluates to false
            $value = SystemSetting::getValue($key, false);
            return filter_var($value, FILTER_VALIDATE_BOOLEAN) === true;
        }

        return false;
    }

    /**
     * Retrieve eligible active advertisements for ticker feed.
     */
    public function getEligibleAds(?User $user, string $platform, string $destination = 'ticker'): Collection
    {
        // 1. Check global ticker killswitch
        if (!SystemSetting::getValue('ads.ticker.enabled', true)) {
            return new Collection();
        }

        // 2. Validate destination allowlist
        if (!in_array($destination, AdvertisementPlacement::DESTINATIONS, true)) {
            return new Collection();
        }

        // 3. Resolve audience and check feature flag
        $audience = $this->resolveAudience($user);
        if (!$this->isAudienceEnabled($audience)) {
            return new Collection();
        }

        // 4. Public requests may use cache
        $cacheKey = null;
        if ($user === null) {
            $cacheKey = AdsTickerCacheService::buildPublicKey($platform, $destination, $audience);
            $cached = Cache::get($cacheKey);
            if ($cached instanceof Collection) {
                return $cached;
            }
        }

        // 5. Query active ads with inclusive start and exclusive end
        $now = now()->toDateTimeString();
        $canViewAllTickerAudiences = $user && ($user->hasRole('admin') || $user->hasRole('admin_assistant'));

        $ads = Advertisement::query()
            ->with(['placements'])
            ->where('status', 'active')
            ->where(function ($q) use ($now) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>', $now);
            })
            ->whereHas('placements', function ($q) use ($destination, $audience, $canViewAllTickerAudiences) {
                $q->where('destination', $destination);
                if (!$canViewAllTickerAudiences) {
                    $allowedAudiences = [$audience, 'all'];
                    if ($audience === 'patient') {
                        $allowedAudiences[] = 'public';
                    }
                    $q->whereIn('audience', $allowedAudiences);
                }
            })
            ->orderBy('priority', 'desc')
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'asc')
            ->get();

        // 6. Cache public results
        if ($cacheKey !== null) {
            Cache::put($cacheKey, $ads, AdsTickerCacheService::CACHE_TTL_SECONDS);
        }

        return $ads;
    }

    /**
     * Atomically record ticker click with 1-hour deduplication window.
     */
    public function recordTickerClick(
        Advertisement $advertisement,
        ?User $user,
        string $ip,
        ?string $userAgent,
        string $destination = 'ticker'
    ): array {
        return DB::transaction(function () use ($advertisement, $user, $ip, $userAgent, $destination) {
            // 1. Lock the parent advertisement row
            $ad = Advertisement::where('id', $advertisement->id)->lockForUpdate()->firstOrFail();

            // 2. Validate that advertisement is active and belongs to requested destination
            if ($ad->status !== 'active') {
                throw ValidationException::withMessages([
                    'advertisement' => ['This advertisement is not active.'],
                ]);
            }

            // Validate that advertisement is currently valid (not scheduled for future and not expired)
            $now = now();
            if ($ad->starts_at && $ad->starts_at->isFuture()) {
                throw ValidationException::withMessages([
                    'advertisement' => ['This advertisement is not yet active.'],
                ]);
            }
            if ($ad->ends_at && $ad->ends_at->isPast()) {
                throw ValidationException::withMessages([
                    'advertisement' => ['This advertisement has expired.'],
                ]);
            }

            // Resolve caller audience and verify audience eligibility (prevent IDOR)
            $audience = $this->resolveAudience($user);
            if (!$this->isAudienceEnabled($audience)) {
                throw ValidationException::withMessages([
                    'audience' => ['Audience access is currently disabled.'],
                ]);
            }

            $canClickAllTickerAudiences = $user && ($user->hasRole('admin') || $user->hasRole('admin_assistant'));

            $hasPlacement = $ad->placements()
                ->where('destination', $destination)
                ->when(!$canClickAllTickerAudiences, function ($q) use ($audience) {
                    $allowedAudiences = [$audience, 'all'];
                    if ($audience === 'patient') {
                        $allowedAudiences[] = 'public';
                    }
                    $q->whereIn('audience', $allowedAudiences);
                })
                ->exists();

            if (!$hasPlacement) {
                throw ValidationException::withMessages([
                    'destination' => ['This advertisement is not accessible for the current audience or destination.'],
                ]);
            }

            // 3. Deduplication boundary: strictly within the past 3600 seconds
            $windowStart = now()->subSeconds(3600)->toDateTimeString();

            if ($user) {
                $isDuplicate = AdvertisementUserClick::where('advertisement_id', $ad->id)
                    ->where('user_id', $user->id)
                    ->where('clicked_at', '>', $windowStart)
                    ->exists();
            } else {
                $fingerprint = hash('sha256', $ip . '|' . ($userAgent ?: 'UNKNOWN_CLIENT'));
                $isDuplicate = AdvertisementUserClick::where('advertisement_id', $ad->id)
                    ->whereNull('user_id')
                    ->where('guest_fingerprint', $fingerprint)
                    ->where('clicked_at', '>', $windowStart)
                    ->exists();
            }

            if ($isDuplicate) {
                return [
                    'recorded' => false,
                    'reason' => 'deduplicated',
                    'clicks_count' => (int) $ad->ticker_clicks_count,
                    'target_url' => $ad->target_url,
                ];
            }

            // 4. Insert telemetry log
            AdvertisementUserClick::create([
                'advertisement_id' => $ad->id,
                'user_id' => $user?->id,
                'guest_fingerprint' => $user ? null : $fingerprint,
                'ip_address' => $ip,
                'user_agent' => substr($userAgent ?: '', 0, 500),
                'clicked_at' => now()->toDateTimeString(),
            ]);

            // 5. Increment ONLY ticker_clicks_count (ADS-DEC-01)
            $ad->increment('ticker_clicks_count');

            return [
                'recorded' => true,
                'clicks_count' => (int) $ad->ticker_clicks_count,
                'target_url' => $ad->target_url,
            ];
        }, 3);
    }
}
