<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\NotificationOutbox;
use App\Services\NotificationOutboxService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class DispatchNotificationOutboxJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Bounded retry attempts consistent with system queue configuration.
     */
    public int $tries = 3;

    /**
     * Bounded timeout in seconds.
     */
    public int $timeout = 60;

    /**
     * Exponential / delayed backoff in seconds.
     */
    public array $backoff = [10, 30, 60];

    public function __construct(
        public string $outboxId
    ) {}

    public function failed(?\Throwable $exception): void
    {
        Log::error('DISPATCH_NOTIFICATION_JOB_EXHAUSTED: Outbox dispatch job failed after retry exhaustion', [
            'outbox_id'  => $this->outboxId,
            'exception'  => $exception?->getMessage(),
        ]);

        $outbox = NotificationOutbox::find($this->outboxId);
        if ($outbox && $outbox->status !== NotificationOutbox::STATUS_FAILED) {
            $outbox->update([
                'status'     => NotificationOutbox::STATUS_FAILED,
                'last_error' => 'QUEUE_JOB_EXHAUSTED: ' . ($exception?->getMessage() ?? 'Unknown error'),
            ]);
        }
    }

    public function handle(NotificationOutboxService $outboxService): void
    {
        /** @var NotificationOutbox|null $outbox */
        $outbox = NotificationOutbox::find($this->outboxId);

        if (! $outbox) {
            Log::warning('DISPATCH_NOTIFICATION_JOB_ABORTED: Outbox record not found', [
                'outbox_id' => $this->outboxId,
            ]);
            return;
        }

        // Idempotency: if already completed, exit cleanly
        if ($outbox->status === NotificationOutbox::STATUS_SENT || $outbox->acknowledged_at !== null) {
            return;
        }

        try {
            $outboxService->processRecord($outbox);
        } catch (\Throwable $e) {
            $outboxService->recordFailure($outbox, $e);
            throw $e;
        }
    }
}
