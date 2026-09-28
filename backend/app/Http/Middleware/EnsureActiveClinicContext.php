<?php

namespace App\Http\Middleware;

use App\Models\Clinic;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveClinicContext
{
    /**
     * Handle an incoming request.
     *
     * Resolves, validates, and binds the Active Clinic Context for authenticated doctors and doctor assistants.
     *
     * Invariants:
     * - Only applies to authenticated users with 'doctor' or 'doctor_assistant' role.
     * - Skips non-operational routes (clinics listing, onboarding status, auth profile).
     * - For doctor_assistant: strictly bound to single affiliated clinic; rejects mismatch with 403; fails closed if inactive.
     * - For doctors: validates X-Clinic-ID against doctor_clinic affiliations; multi-clinic requires header; single-clinic falls back.
     * - Fails closed (403) for non-affiliated clinics or suspended affiliations.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // Exempt routes that do not require an active clinic context
        if (
            $request->is('*doctor/clinics*') ||
            $request->is('*doctor/invitations*') ||
            $request->is('*doctors*') ||
            $request->is('*auth/*')
        ) {
            return $next($request);
        }

        // 1. Enforce single active clinic context for authenticated doctor_assistant
        if ($user->hasRole('doctor_assistant')) {
            $assistant = $user->clinicAssistant;

            if (! $assistant || ! $assistant->is_active || $assistant->trashed()) {
                return response()->json([
                    'status' => 'error',
                    'code' => 403,
                    'message' => 'غير مصرح: حساب المساعد غير نشط أو غير مرتبط بعيادة.',
                ], 403);
            }

            $clinic = $assistant->clinic;

            if (! $clinic || ! $clinic->is_active || $clinic->trashed()) {
                return response()->json([
                    'status' => 'error',
                    'code' => 403,
                    'message' => 'غير مصرح: العيادة المرتبطة بالمساعد غير نشطة.',
                ], 403);
            }

            // Extract Clinic ID if provided by client (header, input, query, or route parameter)
            $clinicId = $request->header('X-Clinic-ID') ??
                $request->input('clinic_id') ??
                $request->query('clinic_id') ??
                $request->route('clinicId') ??
                ($request->is('api/v1/clinics/*') ? $request->route('id') : null);

            if ($clinicId !== null) {
                // Validate UUID format
                if (! is_string($clinicId) || ! Str::isUuid($clinicId)) {
                    return response()->json([
                        'status' => 'error',
                        'code' => 422,
                        'message' => 'معرف العيادة (X-Clinic-ID) غير صالح.',
                    ], 422);
                }

                if ((string) $clinicId !== (string) $clinic->id) {
                    return response()->json([
                        'status' => 'error',
                        'code' => 403,
                        'message' => 'غير مصرح: المساعد غير مصرح له بالعمل على هذه العيادة.',
                    ], 403);
                }
            }

            // Bind active context into request attributes
            $request->attributes->set('active_clinic_id', $clinic->id);
            $request->attributes->set('active_clinic', $clinic);
            $request->attributes->set('doctor_position', 'assistant');

            return $next($request);
        }

        // 2. Enforce clinic context for authenticated doctors
        if (! $user->hasRole('doctor') || ! $user->doctor) {
            return $next($request);
        }

        $doctor = $user->doctor;

        // 1. Extract Clinic ID from header, input, query, or route parameter
        $clinicId = $request->header('X-Clinic-ID') ??
            $request->input('clinic_id') ??
            $request->query('clinic_id') ??
            $request->route('clinicId') ??
            ($request->is('api/v1/clinics/*') ? $request->route('id') : null);

        if ($clinicId !== null) {
            // Validate UUID format
            if (! is_string($clinicId) || ! Str::isUuid($clinicId)) {
                return response()->json([
                    'status' => 'error',
                    'code' => 422,
                    'message' => 'معرف العيادة (X-Clinic-ID) غير صالح.',
                ], 422);
            }

            // Verify membership
            $membership = $doctor->clinics()
                ->where('clinics.id', $clinicId)
                ->first();

            if (! $membership) {
                return response()->json([
                    'status' => 'error',
                    'code' => 403,
                    'message' => 'غير مصرح: الطبيب غير منتسب لهذه العيادة.',
                ], 403);
            }

            // Verify active membership status
            if (! ($membership->pivot->is_active ?? false)) {
                return response()->json([
                    'status' => 'error',
                    'code' => 403,
                    'message' => 'غير مصرح: تم تعليق حساب الطبيب في هذه العيادة.',
                ], 403);
            }

            // Bind active context into request attributes
            $request->attributes->set('active_clinic_id', $clinicId);
            $request->attributes->set('active_clinic', $membership);
            $request->attributes->set('doctor_position', $membership->pivot->position ?? 'doctor');
            $request->attributes->set('doctor_clinic_membership', $membership->pivot);

            return $next($request);
        }

        // 2. No X-Clinic-ID provided: evaluate affiliations for safe fallback or fail-closed
        $allAffiliations = $doctor->clinics()->get();

        // If doctor has no clinic affiliations at all, allow to proceed without active clinic context
        if ($allAffiliations->isEmpty()) {
            return $next($request);
        }

        // If doctor has affiliations but all affiliations are suspended: FAIL CLOSED
        $activeAffiliations = $allAffiliations->where('pivot.is_active', true);

        if ($activeAffiliations->isEmpty()) {
            return response()->json([
                'status' => 'error',
                'code' => 403,
                'message' => 'غير مصرح: لا توجد عيادة نشطة مرتبطة بهذا الطبيب.',
            ], 403);
        }

        // If doctor has multiple affiliations (ambiguous operational context): FAIL CLOSED
        if ($allAffiliations->count() > 1) {
            return response()->json([
                'status' => 'error',
                'code' => 403,
                'message' => 'يجب تحديد سياق العيادة النشطة عبر الترويسة (X-Clinic-ID).',
            ], 403);
        }

        // Single active clinic fallback for backward compatibility
        $singleClinic = $activeAffiliations->first();
        $request->attributes->set('active_clinic_id', $singleClinic->id);
        $request->attributes->set('active_clinic', $singleClinic);
        $request->attributes->set('doctor_position', $singleClinic->pivot->position ?? 'doctor');
        $request->attributes->set('doctor_clinic_membership', $singleClinic->pivot);

        return $next($request);
    }
}
