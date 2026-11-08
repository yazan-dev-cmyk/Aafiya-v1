<?php

namespace App\Console\Commands;

use App\Models\AdvertisementUserClick;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class PruneAdvertisementClicks extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ads:prune-clicks {--days=90 : Retention threshold in days}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Prune raw advertisement click telemetry older than 90 days without altering aggregate counters';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = (int) $this->option('days');
        if ($days <= 0) {
            $days = 90;
        }

        $cutoff = now()->subDays($days)->toDateTimeString();
        $this->info("Pruning advertisement click records older than {$days} days (before {$cutoff})...");

        $totalPruned = 0;
        $batchSize = 1000;

        do {
            $deleted = AdvertisementUserClick::where('clicked_at', '<', $cutoff)
                ->limit($batchSize)
                ->delete();

            $totalPruned += $deleted;
            $this->comment("Pruned {$deleted} records in batch (Total: {$totalPruned})...");
        } while ($deleted === $batchSize);

        $this->info("Successfully pruned {$totalPruned} historical click records.");
        Log::info("ADS_PRUNE_CLICKS: Pruned {$totalPruned} records older than {$days} days.");

        return Command::SUCCESS;
    }
}
