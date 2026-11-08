<?php

namespace App\Services;

use App\Models\AssistantProgramLifecycleEvent;
use App\Models\SecurityAuditLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class AssistantProgramLifecycleService
{
    /**
     * Resolve the program lifecycle state at the given timestamp.
     */
    public function resolveStateAt(Carbon|string|null $timestamp = null): object
    {
        $targetUtc = $timestamp
            ? Carbon::parse($timestamp, 'Africa/Algiers')->setTimezone('UTC')
            : now()->setTimezone('UTC');

        $latestEvent = AssistantProgramLifecycleEvent::where('effective_at', '<=', $targetUtc)
            ->orderBy('effective_at', 'desc')
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$latestEvent) {
            return (object) [
                'state' => 'active',
                'effective_at' => null,
                'notice_deadline_at' => null,
                'reason' => 'Default active lifecycle state',
                'decision_reference' => 'DEC-ARP-04',
                'is_active' => true,
                'is_suspended' => false,
                'is_terminated' => false,
            ];
        }

        return (object) [
            'state' => $latestEvent->state,
            'effective_at' => $latestEvent->effective_at,
            'notice_deadline_at' => $latestEvent->notice_deadline_at,
            'reason' => $latestEvent->reason,
            'decision_reference' => $latestEvent->decision_reference,
            'is_active' => $latestEvent->state === 'active',
            'is_suspended' => $latestEvent->state === 'suspended',
            'is_terminated' => $latestEvent->state === 'terminated',
        ];
    }

    /**
     * Check if appointment confirmation is eligible for reward qualification under the program lifecycle rules.
     */
    public function isConfirmationEligible(Carbon|string|null $confirmedAt = null): bool
    {
        $timeUtc = $confirmedAt
            ? Carbon::parse($confirmedAt, 'Africa/Algiers')->setTimezone('UTC')
            : now()->setTimezone('UTC');

        $lifecycle = $this->resolveStateAt($confirmedAt);

        if ($lifecycle->state === 'suspended') {
            return false;
        }

        if ($lifecycle->state === 'terminated') {
            if ($lifecycle->notice_deadline_at) {
                $deadlineUtc = Carbon::parse($lifecycle->notice_deadline_at)->setTimezone('UTC');
                if ($timeUtc->gt($deadlineUtc)) {
                    return false;
                }
            } else {
                return false;
            }
        }

        return true;
    }

    /**
     * Get current lifecycle summary.
     */
    public function getCurrentLifecycle(): array
    {
        $state = $this->resolveStateAt(now('Africa/Algiers'));

        return [
            'state' => $state->state,
            'effective_since' => $state->effective_at ? Carbon::parse($state->effective_at)->setTimezone('Africa/Algiers')->toIso8601String() : null,
            'notice_deadline_at' => $state->notice_deadline_at ? Carbon::parse($state->notice_deadline_at)->setTimezone('Africa/Algiers')->toIso8601String() : null,
            'reason' => $state->reason,
            'decision_reference' => $state->decision_reference,
            'is_active' => $state->is_active,
            'is_suspended' => $state->is_suspended,
            'is_terminated' => $state->is_terminated,
        ];
    }

    /**
     * Transition program lifecycle to a new state (Active / Suspended / Terminated).
     */
    public function transitionState(
        string $targetState,
        Carbon|string $effectiveAt,
        User $actor,
        string $reason,
        Carbon|string|null $noticeDeadlineAt = null,
        ?string $decisionReference = null
    ): AssistantProgramLifecycleEvent {
        if (!in_array($targetState, ['active', 'suspended', 'terminated'], true)) {
            throw new InvalidArgumentException("الحالة المستهدفة '{$targetState}' غير معتمدة. الحالات المتاحة: active, suspended, terminated.");
        }

        if (empty(trim($reason))) {
            throw new InvalidArgumentException('سبب تغيير دورة حياة البرنامج إلزامي.');
        }

        $effectiveAtUtc = Carbon::parse($effectiveAt, 'Africa/Algiers')->setTimezone('UTC');
        $noticeDeadlineUtc = null;

        if ($targetState === 'terminated') {
            if (!$noticeDeadlineAt) {
                throw new InvalidArgumentException('تاريخ ووقت الإشعار النهائي (notice_deadline_at) إلزامي عند إنهاء البرنامج بموجب DEC-06.');
            }
            $noticeDeadlineUtc = Carbon::parse($noticeDeadlineAt, 'Africa/Algiers')->setTimezone('UTC');
            if ($noticeDeadlineUtc->lessThan($effectiveAtUtc)) {
                throw new InvalidArgumentException('موعد الإشعار النهائي يجب أن يكون لاحقاً أو مساوياً لوقت بدء السريان.');
            }
        }

        return DB::transaction(function () use ($targetState, $effectiveAtUtc, $noticeDeadlineUtc, $actor, $reason, $decisionReference) {
            $currentState = $this->resolveStateAt(now('Africa/Algiers'));
            if ($currentState->state === 'terminated') {
                throw new RuntimeException('لا يمكن إعادة تنشيط برنامج المكافآت بعد إنهائه نهائياً بموجب القرار المعتمد DEC-05.');
            }

            $event = AssistantProgramLifecycleEvent::create([
                'state' => $targetState,
                'effective_at' => $effectiveAtUtc,
                'notice_deadline_at' => $noticeDeadlineUtc,
                'reason' => trim($reason),
                'decision_reference' => $decisionReference,
                'authorized_by_id' => $actor->id,
            ]);

            SecurityAuditLog::create([
                'actor_id' => $actor->id,
                'actor_role' => $actor->roles->first()?->name ?? 'admin',
                'event_category' => 'assistant_rewards_admin',
                'action' => 'transition_reward_program_lifecycle',
                'resource_type' => 'AssistantProgramLifecycleEvent',
                'resource_id' => $event->id,
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'user_agent' => request()->userAgent() ?? 'CLI',
                'details' => [
                    'previous_state' => $currentState->state,
                    'new_state' => $targetState,
                    'effective_at' => Carbon::parse($effectiveAtUtc)->setTimezone('Africa/Algiers')->toDateTimeString(),
                    'notice_deadline_at' => $noticeDeadlineUtc ? Carbon::parse($noticeDeadlineUtc)->setTimezone('Africa/Algiers')->toDateTimeString() : null,
                    'reason' => $reason,
                    'decision_reference' => $decisionReference,
                ],
            ]);

            return $event;
        });
    }

    /**
     * Get paginated lifecycle history events.
     */
    public function getLifecycleHistory(int $perPage = 20): LengthAwarePaginator
    {
        return AssistantProgramLifecycleEvent::with('authorizer')
            ->orderBy('effective_at', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }
}