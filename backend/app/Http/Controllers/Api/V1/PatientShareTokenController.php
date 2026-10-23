<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SharedPatientMedicalRecordResource;
use App\Models\Patient;
use App\Models\PatientShareToken;
use App\Models\SecurityAuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PatientShareTokenController extends Controller
{
    /**
     * Create an all_emr patient medical record share with mandatory PIN (DEC-P05-01, DEC-P05-03).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $patient = $user->patient;
        if (! $patient) {
            return response()->json([
                'status' => 'error',
                'code' => 404,
                'message' => 'الملف الطبي للمريض غير موجود.',
            ], 404);
        }

        // Validate scope: DEC-P05-01 enforces all_emr only and explicitly rejects single_report
        $scopeInput = $request->input('scope');
        if ($scopeInput === 'single_report') {
            throw ValidationException::withMessages([
                'scope' => ['نطاق المشاركة "single_report" غير مدعوم في هذا الإصدار (V1). يدعم النظام مشاركة الملف الطبي الموحد (all_emr) فقط وفق القرار DEC-P05-01.'],
            ]);
        }

        $validated = $request->validate([
            'scope' => ['required', 'string', 'in:all_emr'],
            'duration' => ['required', 'string', 'in:24h,7d,30d'],
            'pin' => ['required', 'string', 'regex:/^[0-9]{4,8}$/'],
        ], [
            'scope.in' => 'نطاق المشاركة المعتمد هو الملف الطبي الموحد (all_emr) فقط.',
            'duration.in' => 'مدة الصلاحية المسموح بها هي: 24h, 7d, 30d.',
            'pin.required' => 'رمز الحماية PIN إلزامي لإنشاء رابط المشاركة وفق القرار DEC-P05-03.',
            'pin.regex' => 'يجب أن يتكون رمز الحماية PIN من 4 إلى 8 أرقام فقط.',
        ]);

        $hours = match ($validated['duration']) {
            '24h' => 24,
            '7d' => 24 * 7,
            '30d' => 24 * 30,
            default => 24,
        };

        $expiresAt = now()->addHours($hours);

        // High-entropy unpredictable bearer credential (64 chars)
        $rawToken = 'pst_' . Str::random(60);
        $tokenHash = hash('sha256', $rawToken);
        $pinHash = Hash::make($validated['pin']);

        $share = PatientShareToken::create([
            'patient_id' => $patient->id,
            'token_hash' => $tokenHash,
            'scope' => 'all_emr',
            'pin_hash' => $pinHash,
            'status' => 'active',
            'failed_attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => $expiresAt,
        ]);

        $frontendUrl = $this->resolveFrontendUrl($request);
        $shareUrl = "{$frontendUrl}/records/view#token={$rawToken}";

        return response()->json([
            'message' => 'تم إنشاء رابط المشاركة الآمن والمشفر بنجاح.',
            'data' => [
                'id' => $share->id,
                'token' => $rawToken,
                'scope' => 'all_emr',
                'duration' => $validated['duration'],
                'expires_at' => $expiresAt->toIso8601String(),
                'share_url' => $shareUrl,
                'has_pin' => true,
                'status' => 'active',
            ],
        ], 201);
    }

    /**
     * List active and historical shares owned by the authenticated patient.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $patient = $user->patient;
        if (! $patient) {
            return response()->json([
                'status' => 'error',
                'code' => 404,
                'message' => 'الملف الطبي للمريض غير موجود.',
            ], 404);
        }

        $shares = PatientShareToken::where('patient_id', $patient->id)
            ->select([
                'id',
                'scope',
                'status',
                'failed_attempts',
                'access_count',
                'last_accessed_at',
                'expires_at',
                'revoked_at',
                'created_at',
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $shares,
        ]);
    }

    /**
     * Immediately revoke an active share token by its patient owner (DEC-P05-02).
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $patient = $user->patient;
        if (! $patient) {
            return response()->json([
                'status' => 'error',
                'code' => 404,
                'message' => 'الملف الطبي للمريض غير موجود.',
            ], 404);
        }

        return DB::transaction(function () use ($id, $patient, $user) {
            $share = PatientShareToken::where('id', $id)
                ->where('patient_id', $patient->id)
                ->lockForUpdate()
                ->first();

            if (! $share) {
                return response()->json([
                    'status' => 'error',
                    'code' => 404,
                    'message' => 'رمز المشاركة غير موجود أو لا يتبع للمريض المصرح.',
                ], 404);
            }

            if ($share->isRevoked()) {
                return response()->json([
                    'message' => 'تم إلغاء رابط المشاركة مسبقاً.',
                    'data' => [
                        'id' => $share->id,
                        'status' => 'revoked',
                        'revoked_at' => $share->revoked_at?->toIso8601String(),
                    ],
                ], 200);
            }

            $share->update([
                'status' => 'revoked',
                'revoked_at' => now(),
                'revoked_by_id' => $user->id,
            ]);

            return response()->json([
                'message' => 'تم إلغاء رابط المشاركة بنجاح وإيقاف صلاحية الوصول فورياً.',
                'data' => [
                    'id' => $share->id,
                    'status' => 'revoked',
                    'revoked_at' => $share->revoked_at->toIso8601String(),
                ],
            ], 200);
        });
    }

    /**
     * Public resolution of a shared medical record with mandatory PIN verification (DEC-P05-03, DEC-P05-04).
     */
    public function resolve(Request $request, ?string $token = null): JsonResponse
    {
        $rawToken = $request->input('token', $token);
        if (! $rawToken) {
            return response()->json([
                'status' => 'error',
                'code' => 422,
                'message' => 'رمز المشاركة token مطلوب.',
            ], 422);
        }

        $validated = $request->validate([
            'pin' => ['required', 'string', 'regex:/^[0-9]{4,8}$/'],
        ], [
            'pin.required' => 'رمز الحماية PIN مطلوب للتحقق من الصلاحية.',
            'pin.regex' => 'يجب أن يتكون رمز الحماية PIN من 4 إلى 8 أرقام فقط.',
        ]);

        $tokenHash = hash('sha256', $rawToken);

        return DB::transaction(function () use ($tokenHash, $validated) {
            $share = PatientShareToken::where('token_hash', $tokenHash)
                ->lockForUpdate()
                ->first();

            if (! $share) {
                SecurityAuditLog::create([
                    'actor_id' => null,
                    'actor_role' => 'public_share_recipient',
                    'event_category' => 'PATIENT_EMR_SHARE',
                    'action' => 'RESOLVE_TOKEN_NOT_FOUND',
                    'resource_type' => 'PatientShareToken',
                    'resource_id' => null,
                    'ip_address' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                    'details' => ['outcome' => 'not_found'],
                ]);

                return response()->json([
                    'status' => 'error',
                    'code' => 404,
                    'message' => 'رابط المشاركة غير صالح أو غير موجود.',
                ], 404);
            }

            // DEC-P05-02: Check immediate revocation status
            if ($share->isRevoked()) {
                SecurityAuditLog::create([
                    'actor_id' => null,
                    'actor_role' => 'public_share_recipient',
                    'event_category' => 'PATIENT_EMR_SHARE',
                    'action' => 'RESOLVE_TOKEN_REVOKED',
                    'resource_type' => 'PatientShareToken',
                    'resource_id' => $share->id,
                    'ip_address' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                    'details' => ['patient_id' => $share->patient_id, 'outcome' => 'revoked'],
                ]);

                return response()->json([
                    'status' => 'error',
                    'code' => 410,
                    'message' => 'تم إلغاء رابط المشاركة من قِبل المريض، ولم يعد صالحاً للاستخدام.',
                ], 410);
            }

            // Check expiration
            if ($share->isExpired()) {
                if ($share->status !== 'expired') {
                    $share->update(['status' => 'expired']);
                }

                SecurityAuditLog::create([
                    'actor_id' => null,
                    'actor_role' => 'public_share_recipient',
                    'event_category' => 'PATIENT_EMR_SHARE',
                    'action' => 'RESOLVE_TOKEN_EXPIRED',
                    'resource_type' => 'PatientShareToken',
                    'resource_id' => $share->id,
                    'ip_address' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                    'details' => ['patient_id' => $share->patient_id, 'outcome' => 'expired'],
                ]);

                return response()->json([
                    'status' => 'error',
                    'code' => 410,
                    'message' => 'انتهت صلاحية رابط المشاركة المحدد. يرجى طلب رابط جديد من المريض.',
                ], 410);
            }

            // Check temporary lockout
            if ($share->locked_until !== null && now()->gte($share->locked_until)) {
                // Lockout period has elapsed: reset failed counter and clear lockout for new attempt cycle
                $share->update([
                    'locked_until' => null,
                    'failed_attempts' => 0,
                    'status' => 'active',
                ]);
            } elseif ($share->isLocked()) {
                SecurityAuditLog::create([
                    'actor_id' => null,
                    'actor_role' => 'public_share_recipient',
                    'event_category' => 'PATIENT_EMR_SHARE',
                    'action' => 'RESOLVE_TOKEN_LOCKED',
                    'resource_type' => 'PatientShareToken',
                    'resource_id' => $share->id,
                    'ip_address' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                    'details' => ['patient_id' => $share->patient_id, 'outcome' => 'locked'],
                ]);

                return response()->json([
                    'status' => 'error',
                    'code' => 423,
                    'message' => 'تم قفل الرابط مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى الانتظار والمحاولة لاحقاً.',
                ], 423);
            }

            // DEC-P05-03: Verify PIN
            if (! Hash::check($validated['pin'], $share->pin_hash)) {
                $newFailedAttempts = $share->failed_attempts + 1;
                $updateData = ['failed_attempts' => $newFailedAttempts];

                if ($newFailedAttempts >= $share->max_attempts) {
                    $updateData['locked_until'] = now()->addMinutes(15);
                    $updateData['status'] = 'locked';
                }

                $share->update($updateData);

                $remaining = max(0, $share->max_attempts - $newFailedAttempts);

                SecurityAuditLog::create([
                    'actor_id' => null,
                    'actor_role' => 'public_share_recipient',
                    'event_category' => 'PATIENT_EMR_SHARE',
                    'action' => 'RESOLVE_TOKEN_FAILED_PIN',
                    'resource_type' => 'PatientShareToken',
                    'resource_id' => $share->id,
                    'ip_address' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                    'details' => [
                        'patient_id' => $share->patient_id,
                        'outcome' => 'invalid_pin',
                        'failed_attempts' => $newFailedAttempts,
                        'remaining_attempts' => $remaining,
                    ],
                ]);

                return response()->json([
                    'status' => 'error',
                    'code' => 403,
                    'message' => 'رمز الحماية PIN غير صحيح.',
                    'remaining_attempts' => $remaining,
                ], 403);
            }

            // PIN verified successfully: reset failed counter and update access telemetry
            $share->update([
                'failed_attempts' => 0,
                'locked_until' => null,
                'status' => 'active',
                'access_count' => $share->access_count + 1,
                'last_accessed_at' => now(),
            ]);

            // DEC-LEGAL: Record verified access audit event
            SecurityAuditLog::create([
                'actor_id' => null,
                'actor_role' => 'public_share_recipient',
                'event_category' => 'PATIENT_EMR_SHARE',
                'action' => 'RESOLVE_TOKEN_SUCCESS',
                'resource_type' => 'PatientShareToken',
                'resource_id' => $share->id,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'details' => [
                    'patient_id' => $share->patient_id,
                    'scope' => $share->scope,
                    'access_count' => $share->access_count,
                ],
            ]);

            // Retrieve verified clinical relationships
            $patient = Patient::with(['allergies', 'chronicConditions', 'currentMedications'])
                ->find($share->patient_id);

            if (! $patient) {
                return response()->json([
                    'status' => 'error',
                    'code' => 404,
                    'message' => 'السجل الطبي للمريض غير موجود.',
                ], 404);
            }

            // DEC-P05-04: Strict data minimization via dedicated sharing resource
            return response()->json(
                new SharedPatientMedicalRecordResource(
                    $patient,
                    now()->toIso8601String(),
                    $share->expires_at->toIso8601String()
                ),
                200
            );
        });
    }

    /**
     * Reject GET access that bypasses PIN, while providing clear status semantics for revoked/expired tokens.
     */
    public function viewSharedRecord(string $token): JsonResponse
    {
        $tokenHash = hash('sha256', $token);
        $share = PatientShareToken::where('token_hash', $tokenHash)->first();

        if ($share) {
            if ($share->isRevoked()) {
                return response()->json([
                    'status' => 'error',
                    'code' => 410,
                    'message' => 'تم إلغاء رابط المشاركة من قِبل المريض، ولم يعد صالحاً للاستخدام.',
                ], 410);
            }

            if ($share->isExpired()) {
                return response()->json([
                    'status' => 'error',
                    'code' => 410,
                    'message' => 'انتهت صلاحية رابط المشاركة المحدد. يرجى طلب رابط جديد من المريض.',
                ], 410);
            }
        }

        // Mandatory PIN gating: Raw GET requests never expose clinical data (DEC-P05-03)
        return response()->json([
            'status' => 'error',
            'code' => 422,
            'message' => 'رمز الحماية PIN مطلوب للوصول إلى السجل الطبي المشفر. يرجى إرسال طلب POST مع رمز PIN إلى مسار التحقق /api/v1/shared-records/resolve.',
            'require_pin' => true,
        ], 422);
    }

    /**
     * Resolve the canonical public frontend URL for shared medical records.
     * Guaranteed never to emit localhost in production environments.
     */
    protected function resolveFrontendUrl(Request $request): string
    {
        $configured = config('app.frontend_url');
        if (! empty($configured) && $configured !== 'http://localhost:3000') {
            return rtrim((string) $configured, '/');
        }

        $envFrontend = env('FRONTEND_URL');
        if (! empty($envFrontend) && $envFrontend !== 'http://localhost:3000') {
            return rtrim((string) $envFrontend, '/');
        }

        // Check Railway service link variable if present
        $railwayV1Url = env('RAILWAY_SERVICE_AAFIYA_V1_URL');
        if (! empty($railwayV1Url)) {
            return 'https://' . rtrim((string) $railwayV1Url, '/');
        }

        // Check request Origin if from allowed CORS origins
        $origin = $request->header('Origin') ?: $request->header('Referer');
        if (! empty($origin)) {
            $parsed = parse_url($origin);
            if (isset($parsed['scheme'], $parsed['host'])) {
                $host = strtolower($parsed['host']);
                $port = isset($parsed['port']) ? ':' . $parsed['port'] : '';
                if ($host === 'aafiya.site' || $host === 'www.aafiya.site') {
                    return $parsed['scheme'] . '://' . $parsed['host'] . $port;
                }
                if (app()->environment(['local', 'testing']) && ($host === 'localhost' || $host === '127.0.0.1')) {
                    return $parsed['scheme'] . '://' . $parsed['host'] . $port;
                }
            }
        }

        // If local development or testing environment, allow localhost:3000
        if (app()->environment(['local', 'testing'])) {
            return 'http://localhost:3000';
        }

        // Production default
        return 'https://aafiya.site';
    }
}

