<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\DoctorVacation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * RescheduleVacationAppointmentsJob
 *
 * Serves as the explicit asynchronous integration boundary for TASK-DWH-06.
 * Dispatched immediately after DoctorVacation registration commits (DEC-VAC-01).
 *
 * NOTE FOR TASK-DWH-06:
 * This job accepts the stable doctor_vacation_id string, reloads and verifies
 * vacation state, and delegates to the future VacationRescheduleEngine.
 */
class RescheduleVacationAppointmentsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 120;
    public array $backoff = [5, 15, 30];

    public function __construct(
        public string $doctorVacationId
    ) {}

    public function failed(?\Throwable $exception): void
    {
        Log::error('RESCHEDULE_VACATION_JOB_EXHAUSTED: Vacation rescheduling job failed after retry exhaustion', [
            'vacation_id' => $this->doctorVacationId,
            'exception'   => $exception?->getMessage(),
        ]);
    }

    public function handle(): void
    {
        /** @var DoctorVacation|null $vacation */
        $vacation = DoctorVacation::find($this->doctorVacationId);

        if (! $vacation) {
            Log::warning('RESCHEDULE_VACATION_JOB_ABORTED: Vacation record not found', [
                'vacation_id' => $this->doctorVacationId,
            ]);
            return;
        }

        if (! $vacation->isEffective()) {
            Log::info('RESCHEDULE_VACATION_JOB_SKIPPED: Vacation is no longer effective', [
                'vacation_id' => $this->doctorVacationId,
                'status'      => $vacation->status,
            ]);
            return;
        }

        Log::info('RESCHEDULE_VACATION_JOB_EXECUTING: Invoking VacationRescheduleEngine', [
            'vacation_id'     => $vacation->id,
            'doctor_id'       => $vacation->doctor_id,
            'vacation_start'  => (string) $vacation->vacation_start,
            'vacation_end'    => (string) $vacation->vacation_end,
        ]);

        app(\App\Services\VacationRescheduleEngine::class)->processVacationRescheduling($vacation);
    }
}
