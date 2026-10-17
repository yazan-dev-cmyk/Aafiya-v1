<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Services\BookingService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ExpirePastPendingAppointmentsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'aafiya:expire-past-pending-appointments
                            {--dry-run : Simulate expiration without modifying appointments, counters, or history}
                            {--date= : Filter candidate appointment records by their appointment_date (YYYY-MM-DD)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically expire past pending appointments whose slot interval has ended under DEC-GAP-02.';

    /**
     * Execute the console command.
     */
    public function handle(BookingService $bookingService): int
    {
        $isDryRun = (bool) $this->option('dry-run');
        $dateFilter = $this->option('date');

        $now = Carbon::now('Africa/Algiers');

        if ($dateFilter !== null) {
            if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFilter)) {
                $this->error("Invalid --date format [{$dateFilter}]. Must be YYYY-MM-DD.");
                return self::FAILURE;
            }

            try {
                $parsedDate = Carbon::createFromFormat('Y-m-d', $dateFilter, 'Africa/Algiers')->startOfDay();
            } catch (\Throwable $e) {
                $this->error("Invalid calendar date [{$dateFilter}]: {$e->getMessage()}");
                return self::FAILURE;
            }

            // Safety guard: The option is a record-date filter, NOT an evaluation clock.
            // Do not permit filtering future dates to prevent any risk of evaluating future records.
            if ($parsedDate->greaterThan($now->copy()->startOfDay())) {
                $this->error("The --date filter [{$dateFilter}] cannot be in the future (DEC-GAP-02 evaluation guard).");
                return self::FAILURE;
            }
        }

        $this->info(sprintf(
            'Starting automatic pending appointment expiration [%s%s] evaluated at %s...',
            $isDryRun ? 'DRY-RUN, ' : '',
            $dateFilter ? "date-filter={$dateFilter}" : 'all-candidate-dates',
            $now->toIso8601String()
        ));

        // Candidate query: only 'pending' status records whose appointment_date is <= today in Africa/Algiers
        $todayDate = $now->format('Y-m-d');

        $query = Appointment::query()
            ->where('status', 'pending')
            ->where('appointment_date', '<=', $todayDate);

        if ($dateFilter !== null) {
            $query->where('appointment_date', $dateFilter);
        }

        $totalChecked = 0;
        $totalExpired = 0;
        $totalSkipped = 0;
        $totalErrors = 0;

        $query->orderBy('id')->chunkById(100, function ($appointments) use (
            $bookingService,
            $now,
            $isDryRun,
            &$totalChecked,
            &$totalExpired,
            &$totalSkipped,
            &$totalErrors
        ) {
            foreach ($appointments as $appointment) {
                $totalChecked++;

                $apptDate = $appointment->appointment_date ? Carbon::parse($appointment->appointment_date)->format('Y-m-d') : null;
                $timeSlot = $appointment->time_slot;

                if (! $apptDate || ! $timeSlot) {
                    $this->warn("Skipping appointment [{$appointment->id}]: malformed date or slot.");
                    $totalSkipped++;
                    continue;
                }

                // Verify slot_end <= now('Africa/Algiers')
                try {
                    $slotStart = Carbon::createFromFormat('Y-m-d H:i', "{$apptDate} {$timeSlot}", 'Africa/Algiers');
                    $slotEnd = $slotStart->copy()->addHour();
                } catch (\Throwable $e) {
                    $this->warn("Skipping appointment [{$appointment->id}]: invalid time parsing for '{$apptDate} {$timeSlot}'.");
                    Log::warning('EXPIRE_PENDING_APPOINTMENT_INVALID_TIME_FORMAT', [
                        'appointment_id' => $appointment->id,
                        'appointment_date' => $apptDate,
                        'time_slot' => $timeSlot,
                        'error' => $e->getMessage(),
                    ]);
                    $totalSkipped++;
                    continue;
                }

                if ($now->lessThan($slotEnd)) {
                    // Slot interval has not yet ended
                    $totalSkipped++;
                    continue;
                }

                if ($isDryRun) {
                    $this->line("  [DRY-RUN] Would expire appointment [{$appointment->id}] ({$apptDate} {$timeSlot}, creator: {$appointment->created_by_id})");
                    $totalExpired++;
                    continue;
                }

                try {
                    $success = $bookingService->expirePendingAppointment($appointment, $now);
                    if ($success) {
                        $totalExpired++;
                    } else {
                        $totalSkipped++;
                    }
                } catch (\Throwable $e) {
                    $totalErrors++;
                    $this->error("Failed to expire appointment [{$appointment->id}]: {$e->getMessage()}");
                    Log::error('EXPIRE_PENDING_APPOINTMENT_RECORD_ERROR', [
                        'appointment_id' => $appointment->id,
                        'error'          => $e->getMessage(),
                        'trace'          => $e->getTraceAsString(),
                    ]);
                }
            }
        });

        $this->info(sprintf(
            'Finished expiration run: Checked: %d | %s: %d | Skipped: %d | Errors: %d',
            $totalChecked,
            $isDryRun ? 'Would Expire' : 'Expired',
            $totalExpired,
            $totalSkipped,
            $totalErrors
        ));

        return $totalErrors === 0 ? self::SUCCESS : self::FAILURE;
    }
}
