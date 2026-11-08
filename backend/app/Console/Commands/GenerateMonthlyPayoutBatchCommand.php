<?php

namespace App\Console\Commands;

use App\Services\AssistantPayoutService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class GenerateMonthlyPayoutBatchCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'rewards:generate-payout-batch 
                            {--start= : Period start date (YYYY-MM-DD)} 
                            {--end= : Period end date (YYYY-MM-DD)}
                            {--threshold= : Minimum payout threshold in DZD}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate monthly payout batch evaluated strictly against Net Cash Payout (Pnet >= threshold)';

    /**
     * Execute the console command.
     */
    public function handle(AssistantPayoutService $payoutService): int
    {
        $startDate = $this->option('start')
            ? Carbon::parse($this->option('start'), 'Africa/Algiers')->toDateString()
            : now('Africa/Algiers')->subMonth()->startOfMonth()->toDateString();

        $endDate = $this->option('end')
            ? Carbon::parse($this->option('end'), 'Africa/Algiers')->toDateString()
            : now('Africa/Algiers')->subMonth()->endOfMonth()->toDateString();

        $threshold = $this->option('threshold')
            ? (float) $this->option('threshold')
            : AssistantPayoutService::PAYOUT_THRESHOLD;

        $this->info("Generating payout batch for period: {$startDate} to {$endDate} (Threshold: {$threshold} DZD evaluated on Pnet)...");

        $batch = $payoutService->generateMonthlyBatch($startDate, $endDate, null, $threshold);

        if (!$batch) {
            $this->info("No eligible assistants reached the {$threshold} DZD Pnet threshold with active RIP profiles. No batch generated.");
            return self::SUCCESS;
        }

        $this->info("Successfully generated batch #{$batch->batch_number} with {$batch->total_recipients} recipients and total amount {$batch->total_amount} DZD.");
        return self::SUCCESS;
    }
}
