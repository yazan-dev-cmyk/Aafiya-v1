<?php

namespace App\Services;

use App\Models\AssistantRewardRateSchedule;
use App\Models\SecurityAuditLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class AssistantRewardRateService
{
    public const BASELINE_RATE_DZD = 10.00;

    /**
     * Resolve the effective rate amount at the given confirmation timestamp in Africa/Algiers timezone.
     */
    public function getEffectiveRateAt(Carbon|string|null $confirmedAt = null): float
    {
        $schedule = $this->getEffectiveScheduleAt($confirmedAt);
        return $schedule ? (float) $schedule->rate_amount : self::BASELINE_RATE_DZD;
    }

    /**
     * Resolve the effective schedule model at the given confirmation timestamp.
     */
    public function getEffectiveScheduleAt(Carbon|string|null $confirmedAt = null): ?AssistantRewardRateSchedule
    {
        $timestampUtc = $confirmedAt
            ? Carbon::parse($confirmedAt, 'Africa/Algiers')->setTimezone('UTC')
            : now()->setTimezone('UTC');

        return AssistantRewardRateSchedule::where('status', '!=', 'cancelled')
            ->where('effective_from', '<=', $timestampUtc)
            ->orderBy('effective_from', 'desc')
            ->orderBy('created_at', 'desc')
            ->first();
    }

    /**
     * Get the current active rate configuration.
     */
    /**
     * Synchronize and transition schedules to 'active', 'superseded', or 'scheduled'
     * based on current wall-clock time.
     */
    public function syncScheduleStatuses(): void
    {
        $nowUtc = now()->setTimezone('UTC');

        // 1. Identify the single active schedule (latest non-cancelled schedule with effective_from <= now)
        $activeSchedule = AssistantRewardRateSchedule::where('status', '!=', 'cancelled')
            ->where('effective_from', '<=', $nowUtc)
            ->orderBy('effective_from', 'desc')
            ->orderBy('created_at', 'desc')
            ->first();

        if ($activeSchedule && $activeSchedule->status !== 'active') {
            $activeSchedule->update(['status' => 'active']);
        }

        // 2. Mark any older non-cancelled schedules earlier than the active schedule as 'superseded'
        if ($activeSchedule) {
            AssistantRewardRateSchedule::where('status', '!=', 'cancelled')
                ->where('id', '!=', $activeSchedule->id)
                ->where('effective_from', '<=', $activeSchedule->effective_from)
                ->where('status', '!=', 'superseded')
                ->update(['status' => 'superseded']);
        }

        // 3. Ensure any non-cancelled schedules with effective_from > now() remain 'scheduled'
        AssistantRewardRateSchedule::where('status', '!=', 'cancelled')
            ->where('effective_from', '>', $nowUtc)
            ->where('status', '!=', 'scheduled')
            ->update(['status' => 'scheduled']);
    }

    public function getCurrentRate(): array
    {
        $this->syncScheduleStatuses();
        $schedule = $this->getEffectiveScheduleAt(now('Africa/Algiers'));

        return [
            'amount' => $schedule ? (float) $schedule->rate_amount : self::BASELINE_RATE_DZD,
            'currency' => 'DZD',
            'effective_since' => $schedule ? Carbon::parse($schedule->effective_from)->setTimezone('Africa/Algiers')->toIso8601String() : null,
            'effective_from' => $schedule ? Carbon::parse($schedule->effective_from)->setTimezone('Africa/Algiers')->toIso8601String() : null,
            'source' => $schedule ? 'schedule' : 'default',
            'decision_reference' => $schedule?->decision_reference ?? 'DEC-ARP-01',
            'schedule_id' => $schedule?->id,
            'is_custom_schedule' => $schedule !== null,
        ];
    }

    /**
     * Schedule a new reward rate with a prospective effective datetime.
     */
    public function scheduleRate(
        float $rateAmount,
        Carbon|string $effectiveFrom,
        User $actor,
        ?string $decisionReference = null,
        ?string $notes = null
    ): AssistantRewardRateSchedule {
        if ($rateAmount <= 0) {
            throw new InvalidArgumentException('قيمة المكافأة يجب أن تكون أكبر من الصفر.');
        }

        $effectiveFromUtc = Carbon::parse($effectiveFrom, 'Africa/Algiers')->setTimezone('UTC');
        $nowUtc = now()->setTimezone('UTC');

        if ($effectiveFromUtc->lessThanOrEqualTo($nowUtc)) {
            throw new InvalidArgumentException('تاريخ ووقت سريان المكافأة الجديدة يجب أن يكون مستقبلياً.');
        }

        return DB::transaction(function () use ($rateAmount, $effectiveFromUtc, $actor, $decisionReference, $notes) {
            $conflict = AssistantRewardRateSchedule::where('effective_from', $effectiveFromUtc)
                ->whereIn('status', ['scheduled', 'active'])
                ->lockForUpdate()
                ->first();

            if ($conflict) {
                $conflictAlgiers = Carbon::parse($effectiveFromUtc)->setTimezone('Africa/Algiers');
                throw new RuntimeException("يوجد تغيير مجدول مسبقاً بنفس تاريخ ووقت السريان ({$conflictAlgiers->toDateTimeString()}).");
            }

            $schedule = AssistantRewardRateSchedule::create([
                'rate_amount' => $rateAmount,
                'currency' => 'DZD',
                'effective_from' => $effectiveFromUtc,
                'status' => 'scheduled',
                'decision_reference' => $decisionReference,
                'notes' => $notes,
                'created_by_id' => $actor->id,
            ]);

            SecurityAuditLog::create([
                'actor_id' => $actor->id,
                'actor_role' => $actor->roles->first()?->name ?? 'admin',
                'event_category' => 'assistant_rewards_admin',
                'action' => 'schedule_reward_rate',
                'resource_type' => 'AssistantRewardRateSchedule',
                'resource_id' => $schedule->id,
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'user_agent' => request()->userAgent() ?? 'CLI',
                'details' => [
                    'rate_amount' => $rateAmount,
                    'effective_from' => Carbon::parse($effectiveFromUtc)->setTimezone('Africa/Algiers')->toDateTimeString(),
                    'decision_reference' => $decisionReference,
                    'notes' => $notes,
                ],
            ]);

            return $schedule;
        });
    }

    /**
     * Cancel a scheduled rate change before it becomes effective.
     */
    public function cancelScheduledRate(
        string $scheduleId,
        string $reason,
        User $actor
    ): AssistantRewardRateSchedule {
        return DB::transaction(function () use ($scheduleId, $reason, $actor) {
            $schedule = AssistantRewardRateSchedule::where('id', $scheduleId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($schedule->status !== 'scheduled') {
                throw new RuntimeException("لا يمكن إلغاء جدول بحالة '{$schedule->status}'. يُسمح فقط بإلغاء التغييرات المجدولة.");
            }

            $effectiveFromUtc = Carbon::parse($schedule->effective_from)->setTimezone('UTC');
            if ($effectiveFromUtc->lessThanOrEqualTo(now()->setTimezone('UTC'))) {
                throw new RuntimeException('لا يمكن إلغاء هذا التغيير لأن تاريخ سريانه قد حل بالفعل وأصبح قيد التطبيق.');
            }

            $schedule->update([
                'status' => 'cancelled',
                'cancelled_by_id' => $actor->id,
                'cancelled_at' => now()->setTimezone('UTC'),
                'cancellation_reason' => $reason,
            ]);

            SecurityAuditLog::create([
                'actor_id' => $actor->id,
                'actor_role' => $actor->roles->first()?->name ?? 'admin',
                'event_category' => 'assistant_rewards_admin',
                'action' => 'cancel_scheduled_reward_rate',
                'resource_type' => 'AssistantRewardRateSchedule',
                'resource_id' => $schedule->id,
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'user_agent' => request()->userAgent() ?? 'CLI',
                'details' => [
                    'rate_amount' => (float) $schedule->rate_amount,
                    'effective_from' => Carbon::parse($schedule->effective_from)->setTimezone('Africa/Algiers')->toDateTimeString(),
                    'reason' => $reason,
                ],
            ]);

            return $schedule;
        });
    }

    /**
     * Get paginated rates history and scheduled queue.
     */
    public function getRatesHistory(int $perPage = 20, ?string $status = null): LengthAwarePaginator
    {
        $this->syncScheduleStatuses();

        $query = AssistantRewardRateSchedule::with(['creator', 'canceller'])
            ->orderBy('effective_from', 'desc')
            ->orderBy('created_at', 'desc');

        if ($status) {
            $query->where('status', $status);
        }

        return $query->paginate($perPage);
    }
}