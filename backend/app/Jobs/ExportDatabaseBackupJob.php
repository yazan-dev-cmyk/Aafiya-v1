<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\BackupExport;
use App\Services\BackupExportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class ExportDatabaseBackupJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 600; // 10 minutes timeout for database dump & encryption

    public function __construct(
        public string $exportId
    ) {
        $this->queue = 'backups';
    }

    public function failed(?\Throwable $exception): void
    {
        Log::error('EXPORT_DATABASE_BACKUP_JOB_FAILED: Backup export job failed', [
            'export_id' => $this->exportId,
            'exception' => $exception?->getMessage(),
        ]);

        $export = BackupExport::find($this->exportId);
        if ($export && $export->status !== BackupExport::STATUS_COMPLETED) {
            $export->update([
                'status' => BackupExport::STATUS_FAILED,
                'error_message' => 'فشلت عملية إنشاء النسخة الاحتياطية لأسباب تقنية. تم تسجيل الخطأ داخلياً.',
            ]);
        }
    }

    public function handle(): void
    {
        $export = BackupExport::find($this->exportId);
        if (! $export) {
            Log::warning('EXPORT_JOB_SKIPPED: Backup export record not found', ['export_id' => $this->exportId]);
            return;
        }

        $export->update(['status' => BackupExport::STATUS_PROCESSING]);

        $exportDir = storage_path('app/private/backups/exports/' . $export->id);
        if (! is_dir($exportDir)) {
            mkdir($exportDir, 0700, true);
        }

        $backupScript = file_exists(base_path('infrastructure/backup/backup.sh'))
            ? base_path('infrastructure/backup/backup.sh')
            : base_path('../infrastructure/backup/backup.sh');

        $verifyScript = file_exists(base_path('infrastructure/backup/verify-integrity.sh'))
            ? base_path('infrastructure/backup/verify-integrity.sh')
            : base_path('../infrastructure/backup/verify-integrity.sh');

        if (! file_exists($backupScript)) {
            $export->update([
                'status' => BackupExport::STATUS_FAILED,
                'error_message' => 'سكربت النسخ الاحتياطي غير موجود على الخادم.',
            ]);
            return;
        }

        $repoRoot = dirname(realpath($backupScript), 3);

        try {
            // Execute backup.sh with BACKUP_DIR pointed to the private export directory
            $env = array_merge($_SERVER, $_ENV, [
                'BACKUP_DIR' => $exportDir,
            ]);

            $process = new Process(['bash', $backupScript], $repoRoot, $env, null, 600);
            $process->run();

            if (! $process->isSuccessful()) {
                Log::error('BACKUP_SCRIPT_EXECUTION_FAILED', [
                    'export_id' => $export->id,
                    'exit_code' => $process->getExitCode(),
                    'error_output' => $process->getErrorOutput(),
                ]);

                $export->update([
                    'status' => BackupExport::STATUS_FAILED,
                    'error_message' => 'فشلت عملية استخراج البيانات والتشفير.',
                ]);
                return;
            }

            // Locate generated encrypted artifact
            $encFiles = glob($exportDir . '/*.sql.gz.enc');
            if (empty($encFiles)) {
                $export->update([
                    'status' => BackupExport::STATUS_FAILED,
                    'error_message' => 'لم يتم العثور على ملف النسخة المشفرة بعد اكتمال العملية.',
                ]);
                return;
            }

            $encFile = $encFiles[0];
            $baseName = basename($encFile, '.sql.gz.enc');
            $metaFile = $exportDir . '/' . $baseName . '.meta.json';

            // Verify integrity and envelope signature immediately
            $verifyProcess = new Process(['bash', $verifyScript, $encFile], $repoRoot, $env, null, 60);
            $verifyProcess->run();

            if (! $verifyProcess->isSuccessful()) {
                Log::error('BACKUP_VERIFICATION_AFTER_EXPORT_FAILED', [
                    'export_id' => $export->id,
                    'exit_code' => $verifyProcess->getExitCode(),
                    'error_output' => $verifyProcess->getErrorOutput(),
                ]);

                $export->update([
                    'status' => BackupExport::STATUS_FAILED,
                    'error_message' => 'فشل التحقق من صحة التوقيع الرقمي أو سلامة التشفير للملف المصدَّر.',
                ]);
                return;
            }

            // Successful generation and verification
            $export->update([
                'status' => BackupExport::STATUS_COMPLETED,
                'filename' => basename($encFile),
                'file_path' => $encFile,
                'meta_file_path' => file_exists($metaFile) ? $metaFile : null,
                'file_size_bytes' => filesize($encFile),
                'sha256_hash' => hash_file('sha256', $encFile),
                'expires_at' => now()->addHours(BackupExportService::EXPORT_RETENTION_HOURS),
                'error_message' => null,
            ]);

            Log::info('BACKUP_EXPORT_COMPLETED_SUCCESSFULLY', [
                'export_id' => $export->id,
                'filename' => basename($encFile),
                'size_bytes' => filesize($encFile),
                'expires_at' => now()->addHours(BackupExportService::EXPORT_RETENTION_HOURS)->toIso8601String(),
            ]);

        } catch (\Throwable $e) {
            Log::error('BACKUP_EXPORT_JOB_EXCEPTION', [
                'export_id' => $export->id,
                'error' => $e->getMessage(),
            ]);

            $export->update([
                'status' => BackupExport::STATUS_FAILED,
                'error_message' => 'حدث استثناء غير متوقع أثناء معالجة ملف النسخ الاحتياطي.',
            ]);
        }
    }
}
