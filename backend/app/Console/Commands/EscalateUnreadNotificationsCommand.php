<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\NotificationOutboxService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class EscalateUnreadNotificationsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'aafiya:escalate-unread-notifications';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Escalate unread in-app patient notifications older than 24h SLA to clinic staff (DEC-GAP-04).';

    /**
     * Execute the console command.
     */
    public function handle(NotificationOutboxService $service): int
    {
        $this->info('Starting evaluation of expired unread notifications for clinic escalation...');

        $stats = $service->escalateExpiredUnreadNotifications();

        $this->info(sprintf(
            'Escalation evaluation complete: Checked: %d, Escalated: %d, Skipped: %d',
            $stats['checked'],
            $stats['escalated'],
            $stats['skipped']
        ));

        Log::info('OUTBOX_ESCALATION_COMMAND_COMPLETED', $stats);

        return self::SUCCESS;
    }
}
