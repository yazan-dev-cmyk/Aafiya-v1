<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ClinicEscalationResource;
use App\Models\Clinic;
use App\Models\NotificationOutbox;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ClinicNotificationController extends Controller
{
    /**
     * Resolve clinic context and enforce strict fail-closed 4D authorization.
     */
    protected function resolveAndAuthorizeClinic(Request $request): string
    {
        $clinicId = $request->header('X-Clinic-ID')
            ?? $request->input('clinic_id')
            ?? $request->attributes->get('active_clinic_id');

        if (! $clinicId) {
            abort(400, 'X-Clinic-ID header or clinic_id parameter is required.');
        }

        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        if ($user->hasRole('admin')) {
            $exists = Clinic::where('id', $clinicId)->where('is_active', true)->exists();
            if (! $exists) {
                abort(404, 'العيادة المحددة غير موجودة أو غير نشطة.');
            }
            return (string) $clinicId;
        }

        if (! $user->hasClinicAccess('booking.manage_queue', (string) $clinicId)) {
            abort(403, 'غير مصرح: لا تملك صلاحية إدارة طابور العيادة المحددة.');
        }

        return (string) $clinicId;
    }

    /**
     * List escalation notifications strictly scoped to the authorized clinic.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $clinicId = $this->resolveAndAuthorizeClinic($request);

        $status = $request->input('status', 'pending'); // 'pending' | 'acknowledged' | 'all'

        $query = NotificationOutbox::query()
            ->where('recipient_type', 'clinic_staff')
            ->where('template', 'clinic_staff_reschedule_escalation')
            ->whereHas('appointment', function ($q) use ($clinicId) {
                $q->where('clinic_id', $clinicId);
            })
            ->with([
                'appointment.patient.user',
                'appointment.doctor.user',
                'appointment.clinic',
            ]);

        if ($status === 'pending') {
            $query->whereNull('acknowledged_at');
        } elseif ($status === 'acknowledged') {
            $query->whereNotNull('acknowledged_at');
        }

        $query->orderBy('created_at', 'desc');

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $escalations = $query->paginate($perPage);

        return ClinicEscalationResource::collection($escalations);
    }

    /**
     * Atomically acknowledge an escalation record, marking it closed from the queue.
     */
    public function acknowledge(Request $request, string $id): JsonResponse
    {
        $clinicId = $this->resolveAndAuthorizeClinic($request);

        $outbox = NotificationOutbox::query()
            ->where('id', $id)
            ->where('recipient_type', 'clinic_staff')
            ->where('template', 'clinic_staff_reschedule_escalation')
            ->whereHas('appointment', function ($q) use ($clinicId) {
                $q->where('clinic_id', $clinicId);
            })
            ->with([
                'appointment.patient.user',
                'appointment.doctor.user',
                'appointment.clinic',
            ])
            ->first();

        if (! $outbox) {
            abort(404, 'سجل التصعيد غير موجود أو لا يتبع لهذه العيادة.');
        }

        if ($outbox->acknowledged_at !== null) {
            return response()->json([
                'message' => 'تم إقرار هذا التصعيد مسبقاً.',
                'data' => new ClinicEscalationResource($outbox),
            ]);
        }

        $outbox->update([
            'acknowledged_at' => Carbon::now('Africa/Algiers'),
        ]);

        return response()->json([
            'message' => 'تم إقرار التصعيد وإغلاقه من طابور المتابعة بنجاح.',
            'data' => new ClinicEscalationResource($outbox->fresh([
                'appointment.patient.user',
                'appointment.doctor.user',
                'appointment.clinic',
            ])),
        ]);
    }
}
