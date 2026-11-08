<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforcePlatformHeader
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $platform = $request->header('X-Platform');

        if ($platform === null || trim((string) $platform) === '') {
            return response()->json([
                'status' => 'error',
                'code' => 422,
                'message' => "Invalid or missing X-Platform header. Permitted values: 'web', 'mobile'.",
                'errors' => [
                    'X-Platform' => ["The X-Platform header is required and must be either 'web' or 'mobile'."],
                ],
            ], 422);
        }

        $normalized = strtolower(trim((string) $platform));

        if (!in_array($normalized, ['web', 'mobile'], true)) {
            return response()->json([
                'status' => 'error',
                'code' => 422,
                'message' => "Invalid or missing X-Platform header. Permitted values: 'web', 'mobile'.",
                'errors' => [
                    'X-Platform' => ["The X-Platform header must be either 'web' or 'mobile'."],
                ],
            ], 422);
        }

        // Store normalized platform attribute on request
        $request->attributes->set('platform', $normalized);

        return $next($request);
    }
}
