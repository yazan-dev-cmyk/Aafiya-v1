<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\NotificationOutbox;
use App\Services\NotificationOutboxService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientNotificationController extends Controller
{
    public function __construct(
        protected NotificationOutboxService $outboxService
    ) {}

    /**
     * List in-app notifications belonging strictly to the authenticated patient.
     *
     * Invariants:
     * - Only allows authenticated users with patient profile or patient_registered role.
     * - Uses trusted relationships ($user->patient, $user->phone) to filter records.
     * - Never trusts client-supplied query parameters for ownership identification.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $patient = $user->patient;
        $userPhone = $user->phone;
        $patientPhone = $patient?->phone;

        $phones = array_filter(array_unique([$userPhone, $patientPhone]));

        if (empty($phones) && ! $patient) {
            return response()->json([
                'data' => [],
                'meta' => [
                    'total' => 0,
                ],
            ]);
        }

        // Query outbox notifications where recipient matches authenticated patient
        $query = NotificationOutbox::query()
            ->where('channel', 'in_app')
            ->where('recipient_type', 'patient')
            ->where(function ($q) use ($phones, $patient) {
                if (! empty($phones)) {
                    $q->whereIn('recipient_phone', $phones);
                }
                if ($patient) {
                    $q->orWhereHas('appointment', function ($apptQ) use ($patient) {
                        $apptQ->where('patient_id', $patient->id);
                    });
                }
            })
            ->orderBy('created_at', 'desc');

        $notifications = $query->paginate(20);

        return response()->json($notifications);
    }

    /**
     * View details of a specific in-app notification with strict patient ownership check.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        /** @var NotificationOutbox $outbox */
        $outbox = NotificationOutbox::findOrFail($id);

        $this->authorizePatientOwnership($user, $outbox);

        return response()->json([
            'data' => $outbox,
        ]);
    }

    /**
     * Acknowledge receipt/reading of an in-app notification idempotently.
     */
    public function acknowledge(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        /** @var NotificationOutbox $outbox */
        $outbox = NotificationOutbox::findOrFail($id);

        $this->authorizePatientOwnership($user, $outbox);

        $updated = $this->outboxService->acknowledgeNotification($outbox, $user);

        return response()->json([
            'message' => 'تم تأكيد استلام الإشعار بنجاح.',
            'data'    => $updated,
        ]);
    }

    /**
     * Enforce strict ownership: ensure the outbox notification belongs to this patient user.
     */
    protected function authorizePatientOwnership($user, NotificationOutbox $outbox): void
    {
        $patient = $user->patient;
        $userPhone = $user->phone;
        $patientPhone = $patient?->phone;

        $phones = array_filter(array_unique([$userPhone, $patientPhone]));

        $phoneMatches = in_array($outbox->recipient_phone, $phones, true);
        $patientIdMatches = false;

        if ($patient && $outbox->appointment_id) {
            $appointment = $outbox->appointment;
            if ($appointment && (string) $appointment->patient_id === (string) $patient->id) {
                $patientIdMatches = true;
            }
        }

        if (! $phoneMatches && ! $patientIdMatches) {
            abort(403, 'غير مصرح: لا يمكنك الوصول إلى إشعارات تخص مريضاً آخر.');
        }
    }
}
