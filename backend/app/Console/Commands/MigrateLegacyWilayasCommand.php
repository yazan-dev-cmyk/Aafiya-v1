<?php

namespace App\Console\Commands;

use App\Services\LegacyWilayaMigrationService;
use Illuminate\Console\Command;

class MigrateLegacyWilayasCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'master-data:migrate-legacy-wilayas
                            {--audit : Run audit only without mutating data}
                            {--rollback : Roll back backfilled wilaya_id references to null}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Audit, safely backfill, or rollback legacy Wilaya text values to authoritative Wilaya foreign keys.';

    /**
     * Execute the console command.
     */
    public function handle(LegacyWilayaMigrationService $service): int
    {
        if ($this->option('rollback')) {
            $this->warn('Rolling back legacy wilaya_id backfills...');
            $results = $service->rollback();
            foreach ($results as $table => $count) {
                $this->line("  - {$table}: {$count} rows cleared.");
            }
            $this->info('Rollback complete.');
            return self::SUCCESS;
        }

        $audit = $service->audit();

        $this->info('=== LEGACY WILAYA AUDIT REPORT ===');
        $this->table(
            ['Table', 'Total Rows', 'Mapped Rows', 'Unresolved Rows', 'Null/Empty Rows', 'Current FK Count'],
            collect($audit['tables'])->map(fn ($t) => [
                $t['table'],
                $t['total_records'],
                $t['mapped_records'],
                $t['unresolved_records'],
                $t['null_records'] + $t['empty_records'],
                $t['current_fk_populated'],
            ])
        );

        $summary = $audit['summary'];
        $this->line("Total legacy records: {$summary['total_legacy_records']}");
        $this->line("Total mapped records: {$summary['total_mapped_records']}");
        $this->line("Total unresolved:     {$summary['total_unresolved_records']}");
        $this->line("Total null/empty:     {$summary['total_null_records']}");
        $this->line("Distinct legacy vals: {$summary['total_distinct_values']}");

        if ($this->option('audit')) {
            return self::SUCCESS;
        }

        $this->info('Executing deterministic backfill...');
        $result = $service->migrate();

        $this->info('Migration completed successfully.');
        $this->table(
            ['Table', 'Updated Rows', 'Skipped Rows'],
            collect($result['results'])->map(fn ($r) => [
                $r['table'],
                $r['updated_rows'],
                $r['skipped_rows'],
            ])
        );

        return self::SUCCESS;
    }
}
