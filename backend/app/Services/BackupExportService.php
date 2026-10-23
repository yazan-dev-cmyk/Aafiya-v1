<?php

declare(strict_types=1);

namespace App\Services;

use App\Jobs\ExportDatabaseBackupJob;
use App\Models\BackupExport;
use App\Models\SecurityAuditLog;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BackupExportService
{
    public const STEP_UP_TOKEN_TTL_MINUTES = 5;
    public const EXPORT_RETENTION_HOURS = 1;
    public const STALE_TIMEOUT_MINUTES = 15;

    /**
     * Verify if user possesses required administrative authority to export backups.
     */
    public function canExport(User $user): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->hasRole('admin_assistant') && $user->has4DAccess('platform.export_backup')) {
            return true;
        }

        return false;
    }

    /**
     * Reconcile stale pending or processing exports older than the threshold to failed status.
     */
    public function markStaleExportsAsFailed(int $staleMinutes = self::STALE_TIMEOUT_MINUTES): int
    {
        try {
            $staleExports = BackupExport::whereIn('status', [BackupExport::STATUS_PENDING, BackupExport::STATUS_PROCESSING])
                ->where('created_at', '<', now()->subMinutes($staleMinutes))
                ->get();

            $count = 0;
            foreach ($staleExports as $export) {
                $export->update([
                    'status' => BackupExport::STATUS_FAILED,
                    'error_message' => 'انتهت مهلة معالجة النسخة الاحتياطية (تجاوزت 15 دقيقة دون استجابة من معالج المهام الخلفي).',
                ]);
                $count++;

                Log::warning('BACKUP_EXPORT_STALE_RECONCILED: Stale export marked as failed', [
                    'export_id' => $export->id,
                    'stale_since' => $export->created_at?->toIso8601String(),
                ]);
            }

            return $count;
        } catch (\Illuminate\Database\QueryException $e) {
            Log::warning('BACKUP_EXPORT_STALE_RECONCILE_FAILED: Query failed', ['error' => $e->getMessage()]);
            return 0;
        }
    }

    /**
     * Check whether an active (pending or processing) export is currently in progress.
     */
    public function hasActiveExport(): ?BackupExport
    {
        try {
            $this->markStaleExportsAsFailed();

            return BackupExport::whereIn('status', [BackupExport::STATUS_PENDING, BackupExport::STATUS_PROCESSING])
                ->latest('created_at')
                ->first();
        } catch (\Illuminate\Database\QueryException $e) {
            Log::warning('BACKUP_EXPORT_DB_QUERY_WARNING: Database query failed during active export check', [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Step-Up Authentication: Verify password and issue a single-use 5-minute token bound to the session.
     *
     * @return array{token: string, expires_at: string}
     */
    public function verifyPasswordAndGenerateToken(User $user, string $password, string $sessionId): array
    {
        if (! $this->canExport($user)) {
            throw new AuthorizationException('غير مصرح لك بتصدير النسخ الاحتياطية للنظام.');
        }

        // Active export check before password verification
        $activeExport = $this->hasActiveExport();
        if ($activeExport) {
            throw ValidationException::withMessages([
                'export' => ["توجد عملية تصدير جارية حالياً (المعرف: {$activeExport->id}). يرجى الانتظار حتى اكتمالها أو فشلها قبل طلب تصدير جديد."],
            ]);
        }

        if (! Hash::check($password, $user->password)) {
            Log::warning('BACKUP_EXPORT_STEP_UP_FAILED: Invalid password confirmation attempt', [
                'user_id' => $user->id,
                'session_prefix' => substr($sessionId, 0, 8) . '...',
            ]);
            throw ValidationException::withMessages([
                'password' => ['كلمة المرور الحالية غير صحيحة.'],
            ]);
        }

        $token = Str::random(64);
        $expiresAt = now()->addMinutes(self::STEP_UP_TOKEN_TTL_MINUTES);

        Cache::put("backup_export_stepup:{$token}", [
            'user_id' => $user->id,
            'session_id' => $sessionId,
            'created_at' => now()->timestamp,
        ], $expiresAt);

        Log::info('BACKUP_EXPORT_STEP_UP_GRANTED: Step-up token generated for backup export', [
            'user_id' => $user->id,
            'session_id' => substr($sessionId, 0, 8) . '...',
            'expires_at' => $expiresAt->toIso8601String(),
        ]);

        return [
            'token' => $token,
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    /**
     * Consume step-up token and initiate asynchronous database backup export.
     */
    public function initiateExport(User $user, string $stepUpToken, string $sessionId): BackupExport
    {
        if (! $this->canExport($user)) {
            throw new AuthorizationException('غير مصرح لك بتصدير النسخ الاحتياطية للنظام.');
        }

        // Acquire 10-second atomic lock to prevent concurrent initiation race conditions
        $lock = Cache::lock('backup_export_initiation_lock', 10);
        if (! $lock->get()) {
            throw ValidationException::withMessages([
                'export' => ['عملية طلب تصدير أخرى قيد المعالجة الآن. يرجى الانتظار بضع ثوانٍ.'],
            ]);
        }

        try {
            // Guard against duplicate active exports
            $activeExport = $this->hasActiveExport();
            if ($activeExport) {
                throw ValidationException::withMessages([
                    'export' => ["توجد عملية تصدير جارية حالياً (المعرف: {$activeExport->id}). يرجى الانتظار حتى اكتمالها أو فشلها قبل طلب تصدير جديد."],
                ]);
            }

            $cacheKey = "backup_export_stepup:{$stepUpToken}";
            /** @var array{user_id: string, session_id: string, created_at: int}|null $cachedData */
            $cachedData = Cache::pull($cacheKey);

            if (! $cachedData) {
                throw ValidationException::withMessages([
                    'step_up_token' => ['رمز التحقق المتقدم غير صالح أو انتهت صلاحيته (صلاحية الرمز 5 دقائق ولمرة واحدة).'],
                ]);
            }

            if ($cachedData['user_id'] !== $user->id || $cachedData['session_id'] !== $sessionId) {
                Log::warning('BACKUP_EXPORT_SECURITY_ALERT: Step-up token session mismatch', [
                    'expected_user' => $cachedData['user_id'],
                    'actual_user' => $user->id,
                    'session_match' => ($cachedData['session_id'] === $sessionId),
                ]);
                throw new AuthorizationException('جلسة العمل غير متطابقة مع رمز التحقق المتقدم.');
            }

            $export = BackupExport::create([
                'user_id' => $user->id,
                'session_id' => $sessionId,
                'status' => BackupExport::STATUS_PENDING,
            ]);

            // Administrative Platform Security Audit Trail
            try {
                SecurityAuditLog::create([
                    'actor_id' => $user->id,
                    'actor_role' => $user->roles()->first()?->name ?? 'admin',
                    'actor_position' => 'Platform Administration',
                    'event_category' => 'BACKUP_INFRASTRUCTURE',
                    'action' => 'INITIATE_BACKUP_EXPORT',
                    'resource_type' => 'BackupExport',
                    'resource_id' => $export->id,
                    'access_reason' => 'Authorized administrative encrypted backup export',
                    'ip_address' => request()->ip() ?? '127.0.0.1',
                    'user_agent' => request()->userAgent() ?? 'System/API',
                    'request_id' => request()->header('X-Request-ID') ?? (string) Str::uuid(),
                    'details' => [
                        'export_id' => $export->id,
                        'session_id' => substr($sessionId, 0, 8) . '...',
                    ],
                ]);
            } catch (\Throwable $e) {
                Log::warning('SECURITY_AUDIT_FALLBACK: Failed to write to security_audit_logs, falling back to application log', [
                    'error' => $e->getMessage(),
                    'action' => 'INITIATE_BACKUP_EXPORT',
                    'actor_id' => $user->id,
                    'export_id' => $export->id,
                ]);
            }

            // Dispatch background worker job strictly on dedicated backups queue
            ExportDatabaseBackupJob::dispatch($export->id)->onQueue('backups');

            return $export;
        } finally {
            $lock->release();
        }
    }

    /**
     * Clean expired backup exports and remove underlying storage artifacts.
     */
    public function cleanExpiredExports(): int
    {
        $expiredExports = BackupExport::where('status', BackupExport::STATUS_COMPLETED)
            ->where('expires_at', '<', now())
            ->get();

        $cleanedCount = 0;
        foreach ($expiredExports as $export) {
            if ($export->file_path && file_exists($export->file_path)) {
                @unlink($export->file_path);
            }
            if ($export->meta_file_path && file_exists($export->meta_file_path)) {
                @unlink($export->meta_file_path);
            }
            $shaFile = $export->file_path ? ($export->file_path . '.sha256') : null;
            if ($shaFile && file_exists($shaFile)) {
                @unlink($shaFile);
            }

            // If parent export directory is empty, remove it
            if ($export->file_path) {
                $dir = dirname($export->file_path);
                if (is_dir($dir) && count(scandir($dir) ?: []) <= 2) {
                    @rmdir($dir);
                }
            }

            $export->update([
                'status' => BackupExport::STATUS_EXPIRED,
            ]);
            $cleanedCount++;
        }

        return $cleanedCount;
    }
}
