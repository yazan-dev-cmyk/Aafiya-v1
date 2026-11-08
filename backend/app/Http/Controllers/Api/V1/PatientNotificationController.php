<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\NotificationOutbox;
use App\Models\Patient;
use App\Services\NotificationOutboxService;
use Illuminate\Database\Eloquent\Builder;
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
     * - Only includes channel = 'in_app' and status = 'sent'.
     * - Uses trusted relationships ($user->patient, normalized phones) to filter records.
     * - Strict scoping: prioritizes appointment.patient_id; only falls back to phone for unlinked appointments.
     * - Never trusts client-supplied query parameters for ownership identification.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $patient = $user->patient;
        $allPhones = $this->extractNormalizedPhones($user->phone, $patient?->phone);

        if (empty($allPhones) && ! $patient) {
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
            ->where('status', NotificationOutbox::STATUS_SENT);

        $this->applyRecipientScope($query, $patient, $allPhones);

        $query->orderBy('created_at', 'desc');

        $notifications = $query->paginate(20);

        return response()->json($notifications);
    }

    /**
     * Return authoritative count of unread (unacknowledged) in-app notifications.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $patient = $user->patient;
        $allPhones = $this->extractNormalizedPhones($user->phone, $patient?->phone);

        if (empty($allPhones) && ! $patient) {
            return response()->json(['unread_count' => 0]);
        }

        $query = NotificationOutbox::query()
            ->where('channel', 'in_app')
            ->where('recipient_type', 'patient')
            ->where('status', NotificationOutbox::STATUS_SENT)
            ->whereNull('acknowledged_at');

        $this->applyRecipientScope($query, $patient, $allPhones);

        return response()->json([
            'unread_count' => $query->count(),
        ]);
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
     * Apply strict multi-tenant recipient authorization scoping to a notification query.
     */
    protected function applyRecipientScope(Builder $query, ?Patient $patient, array $allPhones): void
    {
        $query->where(function (Builder $sub) use ($patient, $allPhones) {
            if ($patient) {
                // Rule 1: Appointment has explicit patient_id matching this patient (including soft-deleted)
                $sub->whereHas('appointment', function (Builder $apptQ) use ($patient) {
                    $apptQ->withTrashed()->where('patient_id', $patient->id);
                });

                // Rule 2: Fallback for notifications matching patient phone
                if (! empty($allPhones)) {
                    $sub->orWhere(function (Builder $fallbackQ) use ($patient, $allPhones) {
                        $fallbackQ->whereIn('recipient_phone', $allPhones)
                            ->where(function (Builder $apptCheck) use ($patient) {
                                $apptCheck->whereNull('appointment_id')
                                    ->orWhereDoesntHave('appointment')
                                    ->orWhereHas('appointment', function (Builder $q) {
                                        $q->withTrashed()->whereNull('patient_id');
                                    })
                                    ->orWhereHas('appointment', function (Builder $q) use ($patient) {
                                        $q->withTrashed()->where('patient_id', $patient->id);
                                    });
                            })
                            ->where(function (Builder $payloadCheck) use ($patient) {
                                $payloadCheck->whereNull('payload->patient_id')
                                    ->orWhere('payload->patient_id', $patient->id);
                            });
                    });
                }
            } else {
                if (! empty($allPhones)) {
                    $sub->whereIn('recipient_phone', $allPhones)
                        ->where(function (Builder $apptCheck) {
                            $apptCheck->whereNull('appointment_id')
                                ->orWhereDoesntHave('appointment')
                                ->orWhereHas('appointment', function (Builder $q) {
                                    $q->withTrashed()->whereNull('patient_id');
                                });
                        })
                        ->whereNull('payload->patient_id');
                } else {
                    $sub->whereRaw('1 = 0');
                }
            }
        });
    }

    /**
     * Enforce strict ownership: ensure the outbox notification belongs to this patient user.
     */
    protected function authorizePatientOwnership($user, NotificationOutbox $outbox): void
    {
        if ($outbox->recipient_type !== 'patient') {
            abort(404, 'Notification not found.');
        }

        $patient = $user->patient;
        $allPhones = $this->extractNormalizedPhones($user->phone, $patient?->phone);

        $isOwner = false;

        // Rule 1: Explicit appointment patient_id match (including soft-deleted)
        if ($patient && $outbox->appointment_id) {
            $appointment = \App\Models\Appointment::withTrashed()->find($outbox->appointment_id);
            if ($appointment && (string) $appointment->patient_id === (string) $patient->id) {
                $payloadPatientId = $outbox->payload['patient_id'] ?? null;
                if ($payloadPatientId === null || (string) $payloadPatientId === (string) $patient->id) {
                    $isOwner = true;
                }
            }
        }

        // Rule 2: Phone match if appointment is null, does not exist, belongs to guest, or matches this patient
        if (! $isOwner && ! empty($allPhones)) {
            $normalizedRecipient = $this->outboxService->getPhoneVariants($outbox->recipient_phone);
            $phoneMatches = ! empty(array_intersect($normalizedRecipient, $allPhones));

            if ($phoneMatches) {
                $payloadPatientId = $outbox->payload['patient_id'] ?? null;
                $payloadValid = ($payloadPatientId === null) || ($patient && (string) $payloadPatientId === (string) $patient->id);

                if ($payloadValid) {
                    if (! $outbox->appointment_id) {
                        $isOwner = true;
                    } else {
                        $appointment = \App\Models\Appointment::withTrashed()->find($outbox->appointment_id);
                        if (! $appointment || $appointment->patient_id === null || ($patient && (string) $appointment->patient_id === (string) $patient->id)) {
                            $isOwner = true;
                        }
                    }
                }
            }
        }

        if (! $isOwner) {
            abort(403, 'غير مصرح: لا يمكنك الوصول إلى إشعارات تخص مريضاً آخر.');
        }
    }

    /**
     * Extract and normalize all unique phone variants for user and patient.
     *
     * @return string[]
     */
    protected function extractNormalizedPhones(?string ...$rawPhones): array
    {
        $variants = [];
        foreach ($rawPhones as $phone) {
            if ($phone !== null && trim($phone) !== '') {
                $variants = array_merge($variants, $this->outboxService->getPhoneVariants($phone));
            }
        }

        return array_values(array_unique(array_filter($variants)));
    }

    /**
     * Normalize an Algerian phone number into both local (0...) and international (+213...) formats.
     *
     * @return string[]
     */
    protected function normalizeAlgerianPhone(string $phone): array
    {
        return $this->outboxService->getPhoneVariants($phone);
    }
}
