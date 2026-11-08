<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminOrAssistant
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (! $user->hasRole('admin') && ! $user->hasRole('admin_assistant')) {
            return response()->json(['message' => 'Forbidden. Requires admin or admin assistant role.'], 403);
        }

        return $next($request);
    }
}
