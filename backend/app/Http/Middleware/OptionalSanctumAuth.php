<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class OptionalSanctumAuth
{
    /**
     * Handle an incoming request.
     * Enforces strict 3-state authentication:
     * 1. No header -> legitimate guest.
     * 2. Valid Bearer token -> authenticated user.
     * 3. Header present but empty, malformed, non-Bearer, expired, or invalid -> strictly 401.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. If Authorization header is completely absent, treat as guest (or preserve actingAs user if already authenticated)
        if (!$request->hasHeader('Authorization')) {
            if (Auth::guard('sanctum')->check()) {
                $request->setUserResolver(fn () => Auth::guard('sanctum')->user());
                return $next($request);
            }

            $request->setUserResolver(fn () => null);
            return $next($request);
        }

        $header = trim((string) $request->header('Authorization'));

        // 2. Reject empty or whitespace-only header
        if ($header === '') {
            return response()->json([
                'status' => 'error',
                'code' => 401,
                'message' => 'Malformed or empty Authorization header.',
            ], 401);
        }

        // 3. Reject any scheme other than Bearer
        if (!str_starts_with(strtolower($header), 'bearer ')) {
            return response()->json([
                'status' => 'error',
                'code' => 401,
                'message' => 'Unsupported authorization scheme. Only Bearer tokens are accepted.',
            ], 401);
        }

        $token = trim(substr($header, 7));

        // 4. Reject empty token string
        if ($token === '') {
            return response()->json([
                'status' => 'error',
                'code' => 401,
                'message' => 'Bearer token value cannot be empty.',
            ], 401);
        }

        // 5. Authenticate via Sanctum guard
        $user = Auth::guard('sanctum')->user();

        // 6. If credential was provided but guard returned null -> strictly 401
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'code' => 401,
                'message' => 'Unauthenticated: Token is invalid, expired, or revoked.',
            ], 401);
        }

        // 7. Bind authentic user to request and Auth facade
        Auth::setUser($user);
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
