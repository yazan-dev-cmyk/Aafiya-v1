<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BackupExport;
use App\Models\SecurityAuditLog;
use App\Services\BackupExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BackupExportController extends Controller
{
    public function __construct(
        protected BackupExportService $backupExportService
    ) {}

    /**
     * Resolve session identifier consistently for both stateful and Sanctum token requests.
     */
    protected function resolveSessionId(Request $request): string
    {
        if ($request->hasSession() && $request->session()->isStarted()) {
            return $request->session()->getId();
        }

        $token = $request->bearerToken();
        if ($token) {
            return hash('sha256', $token);
        }

        return 'session_' . ($request->user()?->id ?? 'guest');
    }

    /**
     * Request a 5-minute single-use step-up authentication token with password re-confirmation.
     */
    public function createStepUpToken(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'يجب تسجيل الدخول.'], 401);
        }

        // Active export check before requiring password verification
        $activeExport = $this->backupExportService->hasActiveExport();
        if ($activeExport) {
            return response()->json([
                'message' => "توجد عملية تصدير نسخة احتياطية جارية حالياً (المعرف: {$activeExport->id}). يرجى الانتظار حتى اكتمالها أو فشلها قبل إنشاء طلب جديد.",
                'active_export_id' => $activeExport->id,
            ], 409);
        }

        $request->validate([
            'password' => 'required|string',
        ]);

        $sessionId = $this->resolveSessionId($request);
        $result = $this->backupExportService->verifyPasswordAndGenerateToken($user, $request->password, $sessionId);

        return response()->json([
            'status' => 'success',
            'message' => 'تم التحقق من كلمة المرور وإصدار رمز المصادقة المتقدم بنجاح.',
            'data' => $result,
        ]);
    }

    /**
     * Initiate asynchronous encrypted backup export using validated step-up token.
     */
    public function initiateExport(Request $request): JsonResponse
    {
        $request->validate([
            'step_up_token' => 'required|string',
        ]);

        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'يجب تسجيل الدخول.'], 401);
        }

        $sessionId = $this->resolveSessionId($request);
        $export = $this->backupExportService->initiateExport($user, $request->step_up_token, $sessionId);

        return response()->json([
            'status' => 'success',
            'message' => 'تم جدولة تصدير النسخة الاحتياطية بنجاح كعملية خلفية مؤمنة.',
            'data' => [
                'id' => $export->id,
                'status' => $export->status,
                'created_at' => $export->created_at?->toIso8601String(),
            ],
        ], 202);
    }

    /**
     * List recent backup exports with status, expiry, and integrity metadata.
     */
    public function listExports(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $this->backupExportService->canExport($user)) {
            return response()->json(['message' => 'غير مصرح لك باستعراض سجلات النسخ الاحتياطي.'], 403);
        }

        // Proactively clean expired artifacts
        $this->backupExportService->cleanExpiredExports();

        $exports = BackupExport::orderBy('created_at', 'desc')
            ->take(30)
            ->get()
            ->map(function (BackupExport $exp) {
                return [
                    'id' => $exp->id,
                    'status' => $exp->status,
                    'filename' => $exp->filename,
                    'file_size_bytes' => $exp->file_size_bytes,
                    'sha256_hash' => $exp->sha256_hash,
                    'error_message' => $exp->error_message,
                    'expires_at' => $exp->expires_at?->toIso8601String(),
                    'is_expired' => $exp->isExpired(),
                    'downloaded_at' => $exp->downloaded_at?->toIso8601String(),
                    'created_at' => $exp->created_at?->toIso8601String(),
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $exports,
        ]);
    }

    /**
     * Show status of a specific backup export.
     */
    public function showExport(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $this->backupExportService->canExport($user)) {
            return response()->json(['message' => 'غير مصرح لك بالوصول لهذا السجل.'], 403);
        }

        $export = BackupExport::findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $export->id,
                'status' => $export->status,
                'filename' => $export->filename,
                'file_size_bytes' => $export->file_size_bytes,
                'sha256_hash' => $export->sha256_hash,
                'error_message' => $export->error_message,
                'expires_at' => $export->expires_at?->toIso8601String(),
                'is_expired' => $export->isExpired(),
                'downloaded_at' => $export->downloaded_at?->toIso8601String(),
                'created_at' => $export->created_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Securely download completed encrypted backup artifact.
     */
    public function downloadExport(Request $request, string $id): BinaryFileResponse|JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $this->backupExportService->canExport($user)) {
            return response()->json(['message' => 'غير مصرح لك بتنزيل ملف النسخة الاحتياطية.'], 403);
        }

        $export = BackupExport::findOrFail($id);

        if ($export->status !== BackupExport::STATUS_COMPLETED) {
            return response()->json(['message' => 'ملف النسخة الاحتياطية غير جاهز أو فشلت معالجته.'], 400);
        }

        if ($export->isExpired()) {
            return response()->json(['message' => 'انتهت صلاحية تحميل هذا الملف المصدَّر (مدة الصلاحية ساعة واحدة).'], 410);
        }

        if (! $export->file_path || ! file_exists($export->file_path)) {
            return response()->json(['message' => 'الملف المطلوب غير موجود على الخادم.'], 404);
        }

        // Audit Trail of Secure Download
        try {
            SecurityAuditLog::create([
                'actor_id' => $user->id,
                'actor_role' => $user->roles()->first()?->name ?? 'admin',
                'actor_position' => 'Platform Administration',
                'event_category' => 'BACKUP_INFRASTRUCTURE',
                'action' => 'DOWNLOAD_BACKUP_EXPORT',
                'resource_type' => 'BackupExport',
                'resource_id' => $export->id,
                'access_reason' => 'Authorized administrative encrypted backup download',
                'ip_address' => $request->ip() ?? '127.0.0.1',
                'user_agent' => $request->userAgent() ?? 'System/Browser',
                'request_id' => $request->header('X-Request-ID') ?? (string) Str::uuid(),
                'details' => [
                    'export_id' => $export->id,
                    'filename' => $export->filename,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::warning('SECURITY_AUDIT_FALLBACK: Failed to write to security_audit_logs for backup download', [
                'error' => $e->getMessage(),
                'export_id' => $export->id,
                'user_id' => $user->id,
            ]);
        }

        $export->update(['downloaded_at' => now()]);

        return response()->download(
            $export->file_path,
            $export->filename ?? ('aafiya_backup_' . $export->id . '.sql.gz.enc'),
            [
                'Content-Type' => 'application/octet-stream',
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'no-store, no-cache, must-revalidate, private',
            ]
        );
    }
}
