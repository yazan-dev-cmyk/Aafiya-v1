<?php

namespace App\Services;

use App\Models\ClinicalAccessLog;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ClinicalAccessLogService
{
    /**
     * Record an atomic, immutable clinical access audit log (P7 Section 1.2).
     */
    public function logAccess(
        User $actor,
        Patient $patient,
        string $resourceType,
        string $resourceId,
        string $action,
        string $accessReason,
        ?Request $request = null
    ): ClinicalAccessLog {
        $actorRole = $actor->roles->first()?->name ?? 'user';

        $actorPosition = null;
        if ($actor->doctor) {
            $actorPosition = 'doctor';
        } elseif ($actor->clinicAssistant) {
            $actorPosition = 'assistant';
        }

        $ipAddress = $request?->ip();
        $userAgent = $request?->userAgent();
        $requestId = $request?->header('X-Request-ID') ?? (string) Str::uuid();

        return ClinicalAccessLog::create([
            'actor_id' => $actor->id,
            'actor_role' => $actorRole,
            'actor_position' => $actorPosition,
            'patient_id' => $patient->id,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'action' => $action,
            'access_reason' => $accessReason,
            'ip_address' => $ipAddress ? substr($ipAddress, 0, 45) : null,
            'user_agent' => $userAgent ? substr($userAgent, 0, 500) : null,
            'request_id' => Str::isUuid($requestId) ? $requestId : (string) Str::uuid(),
            'created_at' => now(),
        ]);
    }

    /**
     * Retrieve audit logs filtered and scoped by authorization.
     *
     * @param array<string, mixed> $filters
     */
    public function getLogs(array $filters, User $user): LengthAwarePaginator
    {
        $query = ClinicalAccessLog::with(['actor', 'patient']);

        if ($user->hasRole('admin')) {
            // Global Admin: complete audit stream access
        } elseif ($user->hasRole('doctor')) {
            // Doctor: logs for their treated patients or logs where they are the actor
            $query->where(function ($q) use ($user) {
                $q->where('actor_id', $user->id)
                    ->orWhereHas('patient.clinicalVisits', function ($cvQ) use ($user) {
                        $cvQ->where('doctor_id', $user->doctor?->id);
                    });
            });
        } elseif ($user->hasRole('patient_registered') || $user->hasRole('patient_guest')) {
            // Patient: can inspect who viewed their own medical files
            $query->whereHas('patient', function ($pQ) use ($user) {
                $pQ->where('user_id', $user->id);
            });
        } else {
            throw ValidationException::withMessages([
                'authorization' => ['غير مصرح لك بالاطلاع على سجلات الرقابة الكلينيكية.'],
            ]);
        }

        if (! empty($filters['patient_id'])) {
            $query->where('patient_id', $filters['patient_id']);
        }

        if (! empty($filters['resource_type'])) {
            $query->where('resource_type', $filters['resource_type']);
        }

        if (! empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (! empty($filters['from_date'])) {
            $fromDate = $filters['from_date'];
            if (strlen($fromDate) === 10) {
                $fromDate .= ' 00:00:00';
            }
            $query->where('created_at', '>=', $fromDate);
        }

        if (! empty($filters['to_date'])) {
            $toDate = $filters['to_date'];
            if (strlen($toDate) === 10) {
                $toDate .= ' 23:59:59';
            }
            $query->where('created_at', '<=', $toDate);
        }

        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortOrder = strtolower($filters['sort_order'] ?? 'desc');

        return $query->orderBy($sortBy, $sortOrder)->paginate($filters['per_page'] ?? 25);
    }
}
