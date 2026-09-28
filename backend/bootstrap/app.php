<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api/v1',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(\App\Http\Middleware\SecurityHeadersMiddleware::class);
        $middleware->alias([
            'active.clinic' => \App\Http\Middleware\EnsureActiveClinicContext::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'status' => 'error',
                    'code' => 401,
                    'message' => 'غير مصرح - يرجى تسجيل الدخول للوصول إلى هذا المورد.',
                ], 401);
            }
        });

        $exceptions->render(function (\Illuminate\Auth\Access\AuthorizationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'status' => 'error',
                    'code' => 403,
                    'message' => $e->getMessage() ?: 'ممنوع - ليس لديك الصلاحية لتنفيذ هذا الإجراء.',
                ], 403);
            }
        });

        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'status' => 'error',
                    'code' => 403,
                    'message' => $e->getMessage() ?: 'ممنوع - ليس لديك الصلاحية لتنفيذ هذا الإجراء.',
                ], 403);
            }
        });

        $exceptions->render(function (\Illuminate\Database\Eloquent\ModelNotFoundException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'status' => 'error',
                    'code' => 404,
                    'message' => 'السجل أو المورد المطلوب غير موجود.',
                ], 404);
            }
        });

        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'status' => 'error',
                    'code' => 404,
                    'message' => 'المسار أو المورد المطلوب غير موجود.',
                ], 404);
            }
        });

        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'status' => 'error',
                    'code' => 422,
                    'message' => $e->getMessage() ?: 'بيانات الإدخال غير صالحة.',
                    'errors' => $e->errors(),
                ], 422);
            }
        });

        $exceptions->render(function (\Illuminate\Http\Exceptions\ThrottleRequestsException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'status' => 'error',
                    'code' => 429,
                    'message' => 'تم تجاوز الحد المسموح للطلبات. يرجى الانتظار والمحاولة لاحقاً.',
                ], 429);
            }
        });

        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                if (! config('app.debug') && ! ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface)) {
                    return response()->json([
                        'status' => 'error',
                        'code' => 500,
                        'message' => 'حدث خطأ غير متوقع في الخادم. يرجى المحاولة لاحقاً.',
                    ], 500);
                }
            }
        });
    })->create();
