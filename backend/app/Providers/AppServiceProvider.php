<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('auth.login', function (Request $request) {
            $key = ($request->input('email') ?: 'guest') . '|' . $request->ip();

            return Limit::perMinute(5)->by($key)->response(function () {
                return response()->json([
                    'status' => 'error',
                    'code' => 429,
                    'message' => 'تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول (5 محاولات/دقيقة). يرجى الانتظار والمحاولة لاحقاً.',
                ], 429);
            });
        });

        RateLimiter::for('auth.register', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip())->response(function () {
                return response()->json([
                    'status' => 'error',
                    'code' => 429,
                    'message' => 'تم تجاوز الحد المسموح لإنشاء الحسابات (3 حسابات/دقيقة).',
                ], 429);
            });
        });

        RateLimiter::for('qr.verify', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip())->response(function () {
                return response()->json([
                    'status' => 'error',
                    'code' => 429,
                    'message' => 'تم تجاوز معدل الاستعلام عن رموز التحقق (30 طلب/دقيقة).',
                ], 429);
            });
        });

        RateLimiter::for('ads.click', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip())->response(function () {
                return response()->json([
                    'status' => 'error',
                    'code' => 429,
                    'message' => 'تم تجاوز المعدل المسموح لتسجيل النقرات الإعلانية.',
                ], 429);
            });
        });

        RateLimiter::for('api.general', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });
    }
}
