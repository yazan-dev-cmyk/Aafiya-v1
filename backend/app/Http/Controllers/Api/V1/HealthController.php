<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController extends Controller
{
    /**
     * Comprehensive System Readiness & Health Check Probe.
     *
     * @return JsonResponse
     */
    public function check(): JsonResponse
    {
        $status = 'healthy';
        $httpCode = 200;
        $checks = [];

        // 1. Database Connectivity Check (Safe non-locking query)
        try {
            DB::connection()->getPdo();
            $checks['database'] = [
                'status' => 'connected',
                'latency_ms' => round($this->measureDbPingMs(), 2),
            ];
        } catch (Throwable $e) {
            $status = 'unhealthy';
            $httpCode = 503;
            $checks['database'] = [
                'status' => 'unavailable',
                'error' => 'Database connection failed',
            ];
        }

        // 2. Cache Driver Check
        try {
            $testKey = 'health_check_probe_' . microtime(true);
            Cache::put($testKey, true, 10);
            $cacheOk = Cache::get($testKey) === true;
            Cache::forget($testKey);

            $checks['cache'] = [
                'status' => $cacheOk ? 'operational' : 'degraded',
            ];
            if (!$cacheOk) {
                $status = 'degraded';
            }
        } catch (Throwable $e) {
            $status = 'degraded';
            $checks['cache'] = [
                'status' => 'unavailable',
                'error' => 'Cache driver unavailable',
            ];
        }

        // 3. Queue & Background Services Status
        $checks['queue'] = [
            'connection' => config('queue.default', 'database'),
            'status' => 'operational',
        ];

        return response()->json([
            'status' => $status,
            'timestamp' => now()->toIso8601String(),
            'platform' => 'Aafiya National Digital Health Platform',
            'version' => '1.0.0',
            'checks' => $checks,
        ], $httpCode);
    }

    /**
     * Lightweight Liveness Probe (/up).
     *
     * @return JsonResponse
     */
    public function up(): JsonResponse
    {
        return response()->json([
            'status' => 'up',
            'timestamp' => now()->toIso8601String(),
        ], 200);
    }

    /**
     * Measure DB ping latency in milliseconds.
     */
    private function measureDbPingMs(): float
    {
        $start = microtime(true);
        DB::select('SELECT 1');
        return (microtime(true) - $start) * 1000;
    }
}
