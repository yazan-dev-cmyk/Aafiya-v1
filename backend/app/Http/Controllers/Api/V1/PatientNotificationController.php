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
                // Rule 1: Appointment has explicit patient_id matching this patient
                $sub->whereHas('appointment', function (Builder $apptQ) use ($patient) {
                    $apptQ->where('patient_id', $patient->id);
                });

                // Rule 2: Fallback for appointments where patient_id is null or outbox has no appointment
                if (! empty($allPhones)) {
                    $sub->orWhere(function (Builder $fallbackQ) use ($allPhones) {
                        $fallbackQ->whereIn('recipient_phone', $allPhones)
                            ->where(function (Builder $apptCheck) {
                                $apptCheck->whereNull('appointment_id')
                                    ->orWhereHas('appointment', function (Builder $q) {
                                        $q->whereNull('patient_id');
                                    });
                            });
                    });
                }
            } else {
                if (! empty($allPhones)) {
                    $sub->whereIn('recipient_phone', $allPhones)
                        ->where(function (Builder $apptCheck) {
                            $apptCheck->whereNull('appointment_id')
                                ->orWhereHas('appointment', function (Builder $q) {
                                    $q->whereNull('patient_id');
                                });
                        });
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

        // Rule 1: Explicit appointment patient_id match
        if ($patient && $outbox->appointment_id) {
            $appointment = $outbox->appointment;
            if ($appointment && (string) $appointment->patient_id === (string) $patient->id) {
                $isOwner = true;
            }
        }

        // Rule 2: Phone match ONLY if appointment has NO patient_id or outbox has no appointment
        if (! $isOwner && ! empty($allPhones)) {
            $normalizedRecipient = $this->normalizeAlgerianPhone($outbox->recipient_phone);
            $phoneMatches = ! empty(array_intersect($normalizedRecipient, $allPhones));

            if ($phoneMatches) {
                if (! $outbox->appointment_id) {
                    $isOwner = true;
                } else {
                    $appointment = $outbox->appointment;
                    if ($appointment && $appointment->patient_id === null) {
                        $isOwner = true;
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
                $variants = array_merge($variants, $this->normalizeAlgerianPhone($phone));
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
        $raw = trim($phone);
        $clean = preg_replace('/[^\d+]/', '', $raw);

        if (empty($clean)) {
            return [];
        }

        $results = [$raw, $clean];

        if (str_starts_with($clean, '00213')) {
            $clean = '+' . substr($clean, 2);
        }

        if (str_starts_with($clean, '+213')) {
            $national = '0' . substr($clean, 4);
            $results[] = $clean;
            $results[] = $national;
        } elseif (str_starts_with($clean, '213') && strlen($clean) === 12) {
            $national = '0' . substr($clean, 3);
            $results[] = '+' . $clean;
            $results[] = $national;
        } elseif (str_starts_with($clean, '0') && strlen($clean) === 10) {
            $international = '+213' . substr($clean, 1);
            $results[] = $clean;
            $results[] = $international;
        } elseif (strlen($clean) === 9 && in_array($clean[0], ['5', '6', '7'], true)) {
            $results[] = '0' . $clean;
            $results[] = '+213' . $clean;
        }

        return array_values(array_unique($results));
    }
}
