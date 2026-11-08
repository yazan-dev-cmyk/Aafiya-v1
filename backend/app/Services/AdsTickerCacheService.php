<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdsTickerCacheService
{
    public const VERSION_SETTING_KEY = 'ads.ticker.version';
    public const CACHE_TTL_SECONDS = 300; // 5 minutes safety backstop

    /**
     * Get the current global ticker cache version.
     */
    public static function getVersion(): int
    {
        try {
            return (int) Cache::get(self::VERSION_SETTING_KEY, 1);
        } catch (\Throwable $e) {
            Log::warning('ADS_TICKER_CACHE: Failed to read version from cache store', ['error' => $e->getMessage()]);
            return 1;
        }
    }

    /**
     * Generate versioned public cache key.
     */
    public static function buildPublicKey(string $platform, string $destination, string $audience): string
    {
        $version = self::getVersion();
        return "ads:ticker:public:v{$version}:{$platform}:{$destination}:{$audience}";
    }

    /**
     * Invalidate all public ticker caches atomically via version bump.
     * Guaranteed to execute only after database transaction commit.
     */
    public static function invalidate(): void
    {
        $action = function () {
            try {
                $newVersion = self::getVersion() + 1;
                Cache::forever(self::VERSION_SETTING_KEY, $newVersion);
            } catch (\Throwable $e) {
                Log::warning('ADS_TICKER_CACHE: Failed to bump version in cache store', ['error' => $e->getMessage()]);
            }
        };

        if (DB::transactionLevel() > 0) {
            DB::afterCommit($action);
        } else {
            $action();
        }
    }
}
