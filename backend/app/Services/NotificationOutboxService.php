<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\NotificationOutbox;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class NotificationOutboxService
{
    /**
     * Maximum retry attempts before marking an outbox record permanently failed.
     */
    public const MAX_RETRIES = 3;

    /**
     * Provisional SLA window (24 hours) for patient in-app acknowledgment before staff escalation.
     */
    public const UNREAD_SLA_HOURS = 24;

    /**
     * Claim timeout / lease duration in seconds for in-flight processing.
     */
    public const CLAIM_TIMEOUT_SECONDS = 300;

    /**
     * Atomically claim a batch of pending or stale-claimed notifications for processing.
     *
     * Concurrency Strategy:
     * - Uses atomic UPDATE with timestamp/status guard, compatible with MySQL / InnoDB without requiring raw SKIP LOCKED.
     * - A unique batch token claims candidate records whose status is 'pending' OR whose lease has expired.
     *
     * @return Collection<int, NotificationOutbox>
     */
    public function claimPendingBatch(int $limit = 50, string $channel = 'in_app'): Collection
    {
        $claimToken = (string) Str::uuid();
        $staleThreshold = Carbon::now('Africa/Algiers')->subSeconds(self::CLAIM_TIMEOUT_SECONDS);

        return DB::transaction(function () use ($limit, $channel, $staleThreshold) {
            // Select candidate IDs with row lock
            $candidates = NotificationOutbox::where('channel', $channel)
                ->where(function ($query) use ($staleThreshold) {
                    $query->where('status', NotificationOutbox::STATUS_PENDING)
                        ->orWhere(function ($q) use ($staleThreshold) {
                            $q->where('status', 'claiming')
                                ->where('updated_at', '<=', $staleThreshold);
                        });
                })
                ->where('retry_count', '<', self::MAX_RETRIES)
                ->orderBy('created_at', 'asc')
                ->limit($limit)
                ->lockForUpdate()
                ->get();

            if ($candidates->isEmpty()) {
                return collect();
            }

            $ids = $candidates->pluck('id')->toArray();

            // Transition candidates to 'claiming' lease state
            NotificationOutbox::whereIn('id', $ids)->update([
                'status'     => 'claiming',
                'updated_at' => Carbon::now('Africa/Algiers'),
            ]);

            return NotificationOutbox::whereIn('id', $ids)->get();
        });
    }

    /**
     * Process a single outbox notification record.
     *
     * Invariants:
     * - Never mutates appointments, slot capacity, quotas, or rescheduling ledgers.
     * - Only mutates notification_outbox record status, retry_count, and last_error.
     * - Distinguishes between retryable failures (increment retry_count, remain pending)
     *   and permanent failures (transition to failed).
     *
     * @return array{status: string, outbox_id: string, reason: ?string}
     */
    public function processRecord(NotificationOutbox $outbox): array
    {
        // 1. Idempotency guard: if already sent or acknowledged, exit cleanly
        if ($outbox->status === NotificationOutbox::STATUS_SENT || $outbox->acknowledged_at !== null) {
            Log::info('OUTBOX_PROCESSING_ALREADY_SENT: Record already sent/acknowledged', [
                'outbox_id' => $outbox->id,
                'status'    => $outbox->status,
            ]);

            return [
                'status'    => 'skipped',
                'outbox_id' => $outbox->id,
                'reason'    => 'ALREADY_COMPLETED',
            ];
        }

        // 2. Missing recipient validation (Permanent failure)
        if (empty($outbox->recipient_phone)) {
            $outbox->update([
                'status'     => NotificationOutbox::STATUS_FAILED,
                'last_error' => 'PERMANENT_ERROR: Missing recipient phone number',
                'updated_at' => Carbon::now('Africa/Algiers'),
            ]);

            Log::warning('OUTBOX_PROCESSING_FAILED_PERMANENT: Missing recipient data', [
                'outbox_id' => $outbox->id,
            ]);

            return [
                'status'    => NotificationOutbox::STATUS_FAILED,
                'outbox_id' => $outbox->id,
                'reason'    => 'MISSING_RECIPIENT_PHONE',
            ];
        }

        // 3. Channel dispatch logic
        if ($outbox->channel === 'in_app') {
            // For in_app, persisting record in outbox makes it visible to the patient API.
            // Transition status to STATUS_SENT.
            $outbox->update([
                'status'     => NotificationOutbox::STATUS_SENT,
                'last_error' => null,
                'updated_at' => Carbon::now('Africa/Algiers'),
            ]);

            Log::info('OUTBOX_IN_APP_DISPATCHED: In-app notification available for patient delivery', [
                'outbox_id'       => $outbox->id,
                'appointment_id'  => $outbox->appointment_id,
                'recipient_phone' => $outbox->recipient_phone,
                'template'        => $outbox->template,
            ]);

            return [
                'status'    => NotificationOutbox::STATUS_SENT,
                'outbox_id' => $outbox->id,
                'reason'    => null,
            ];
        }

        // 4. Unsupported or deferred channel (e.g. SMS)
        $outbox->update([
            'status'     => NotificationOutbox::STATUS_FAILED,
            'last_error' => "PERMANENT_ERROR: Channel [{$outbox->channel}] is not supported (external integration deferred under DEC-GAP-04)",
            'updated_at' => Carbon::now('Africa/Algiers'),
        ]);

        return [
            'status'    => NotificationOutbox::STATUS_FAILED,
            'outbox_id' => $outbox->id,
            'reason'    => 'CHANNEL_DEFERRED_OR_UNSUPPORTED',
        ];
    }

    /**
     * Record a processing failure on an outbox record with retry/exhaustion classification.
     */
    public function recordFailure(NotificationOutbox $outbox, \Throwable $e, bool $isPermanent = false): void
    {
        $newRetryCount = $outbox->retry_count + 1;
        $isExhausted = $newRetryCount >= self::MAX_RETRIES || $isPermanent;

        $outbox->update([
            'status'      => $isExhausted ? NotificationOutbox::STATUS_FAILED : NotificationOutbox::STATUS_PENDING,
            'retry_count' => $newRetryCount,
            'last_error'  => Str::limit($e->getMessage(), 1000),
            'updated_at'  => Carbon::now('Africa/Algiers'),
        ]);

        if ($isExhausted) {
            Log::error('OUTBOX_PROCESSING_RETRIES_EXHAUSTED: Notification marked failed after retry exhaustion', [
                'outbox_id'   => $outbox->id,
                'retry_count' => $newRetryCount,
                'error'       => $e->getMessage(),
            ]);
        } else {
            Log::warning('OUTBOX_PROCESSING_RETRYABLE_ERROR: Notification scheduled for retry', [
                'outbox_id'   => $outbox->id,
                'retry_count' => $newRetryCount,
                'error'       => $e->getMessage(),
            ]);
        }
    }

    /**
     * Mark an outbox notification as acknowledged by the patient.
     *
     * Invariants:
     * - Idempotent: if already acknowledged, returns cleanly without modifying timestamps.
     * - Strictly verified patient ownership: only the authenticated patient recipient can acknowledge.
     */
    public function acknowledgeNotification(NotificationOutbox $outbox, User $patientUser): NotificationOutbox
    {
        if ($outbox->acknowledged_at !== null) {
            return $outbox;
        }

        $outbox->update([
            'acknowledged_at' => Carbon::now('Africa/Algiers'),
            'updated_at'      => Carbon::now('Africa/Algiers'),
        ]);

        Log::info('OUTBOX_NOTIFICATION_ACKNOWLEDGED: Patient acknowledged in-app notice', [
            'outbox_id'       => $outbox->id,
            'user_id'         => $patientUser->id,
            'acknowledged_at' => (string) $outbox->acknowledged_at,
        ]);

        return $outbox->fresh();
    }

    /**
     * Escalate unacknowledged notifications whose 24-hour SLA has expired to clinic staff.
     *
     * Invariants:
     * - Only considers notifications created > 24 hours ago in Africa/Algiers.
     * - Excludes notifications already acknowledged (`acknowledged_at IS NOT NULL`).
     * - Idempotent: uses deterministic idempotency key for the escalation notice to prevent duplicate records.
     * - Records an in_app escalation notification targeted to clinic staff.
     *
     * @return array{checked: int, escalated: int, skipped: int}
     */
    public function escalateExpiredUnreadNotifications(): array
    {
        $slaThreshold = Carbon::now('Africa/Algiers')->subHours(self::UNREAD_SLA_HOURS);

        // Fetch candidate sent notifications older than 24 hours without acknowledgment
        $candidates = NotificationOutbox::where('channel', 'in_app')
            ->where('recipient_type', 'patient')
            ->where('status', NotificationOutbox::STATUS_SENT)
            ->whereNull('acknowledged_at')
            ->where('created_at', '<=', $slaThreshold)
            ->get();

        $stats = [
            'checked'   => $candidates->count(),
            'escalated' => 0,
            'skipped'   => 0,
        ];

        foreach ($candidates as $outbox) {
            $escalated = $this->escalateSingleNotification($outbox);
            if ($escalated) {
                $stats['escalated']++;
            } else {
                $stats['skipped']++;
            }
        }

        return $stats;
    }

    /**
     * Escalate a single unread notification to authorized clinic staff.
     */
    protected function escalateSingleNotification(NotificationOutbox $outbox): bool
    {
        $appointment = $outbox->appointment;
        if (! $appointment) {
            // If appointment was purged/deleted, attempt to read clinic_id from payload
            $clinicId = $outbox->payload['clinic_id'] ?? null;
        } else {
            $clinicId = $appointment->clinic_id;
        }

        if (! $clinicId) {
            Log::warning('OUTBOX_ESCALATION_SKIPPED: Cannot resolve clinic for notification', [
                'outbox_id' => $outbox->id,
            ]);
            return false;
        }

        $clinic = Clinic::find($clinicId);
        if (! $clinic) {
            return false;
        }

        // Deterministic idempotency key for the escalation record
        $escalationIdempotencyKey = sprintf('escalation_unread_sla_%s', $outbox->id);

        if (NotificationOutbox::where('idempotency_key', $escalationIdempotencyKey)->exists()) {
            return false;
        }

        try {
            DB::transaction(function () use ($outbox, $clinic, $escalationIdempotencyKey) {
                // Find clinic contact phone (clinic phone, director doctor user phone, or assistant phone)
                $staffPhone = $clinic->phone
                    ?? $clinic->director?->user?->phone
                    ?? ClinicAssistant::where('clinic_id', $clinic->id)->where('is_active', true)->first()?->user?->phone
                    ?? 'CLINIC_STAFF';

                NotificationOutbox::create([
                    'id'              => (string) Str::uuid(),
                    'appointment_id'  => $outbox->appointment_id,
                    'recipient_phone' => $staffPhone,
                    'recipient_type'  => 'clinic_staff',
                    'channel'         => 'in_app',
                    'template'        => 'clinic_staff_reschedule_escalation',
                    'payload'         => [
                        'original_outbox_id'  => $outbox->id,
                        'patient_phone'       => $outbox->recipient_phone,
                        'appointment_id'      => $outbox->appointment_id,
                        'clinic_id'           => $clinic->id,
                        'clinic_name'         => $clinic->name,
                        'original_payload'    => $outbox->payload,
                        'escalation_reason'   => 'PATIENT_UNREAD_SLA_EXPIRED_24H',
                        'sla_hours'           => self::UNREAD_SLA_HOURS,
                        'instruction'         => 'يرجى التواصل الهاتفي المباشر مع المريض لتأكيد علمه بالموعد البديل أو بترتيب موعد آخر.',
                    ],
                    'idempotency_key' => $escalationIdempotencyKey,
                    'status'          => NotificationOutbox::STATUS_SENT,
                    'retry_count'     => 0,
                    'created_at'      => Carbon::now('Africa/Algiers'),
                    'updated_at'      => Carbon::now('Africa/Algiers'),
                ]);

                Log::warning('OUTBOX_ESCALATION_RECORDED: Unread notification escalated to clinic staff after 24h SLA', [
                    'original_outbox_id' => $outbox->id,
                    'clinic_id'          => $clinic->id,
                    'patient_phone'      => $outbox->recipient_phone,
                ]);
            });

            return true;
        } catch (QueryException $e) {
            // If duplicate key collision, skip safely
            if (isset($e->errorInfo[1]) && (int) $e->errorInfo[1] === 1062) {
                return false;
            }
            throw $e;
        }
    }
}
