<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Clinic\CreateDoctorInvitationRequest;
use App\Http\Requests\Clinic\DoctorLookupRequest;
use App\Models\Clinic;
use App\Services\ClinicDoctorInvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClinicDoctorInvitationController extends Controller
{
    public function __construct(
        protected ClinicDoctorInvitationService $invitationService
    ) {}

    /**
     * Look up an existing doctor by email.
     * Accessible only by Clinic Director.
     */
    public function lookup(DoctorLookupRequest $request, string $clinicId): JsonResponse
    {
        $clinic = Clinic::findOrFail($clinicId);

        $result = $this->invitationService->lookupDoctorByEmail(
            $request->user(),
            $clinic,
            $request->input('email')
        );

        return response()->json([
            'status' => 'success',
            'data' => $result,
        ], 200);
    }

    /**
     * Send an invitation to an existing doctor to join the clinic staff.
     */
    public function store(CreateDoctorInvitationRequest $request, string $clinicId): JsonResponse
    {
        $clinic = Clinic::findOrFail($clinicId);

        $invitation = $this->invitationService->sendInvitation(
            $request->user(),
            $clinic,
            $request->input('doctor_id'),
            $request->input('notes')
        );

        return response()->json([
            'status' => 'success',
            'message' => __('invitation.sent'),
            'data' => [
                'id' => $invitation->id,
                'clinic_id' => $invitation->clinic_id,
                'doctor_id' => $invitation->doctor_id,
                'position' => $invitation->position,
                'status' => $invitation->status,
                'notes' => $invitation->notes,
                'expires_at' => $invitation->expires_at?->toISOString(),
                'created_at' => $invitation->created_at?->toISOString(),
            ],
        ], 201);
    }

    /**
     * List all invitations sent by the clinic.
     * Accessible only by Clinic Director.
     */
    public function clinicInvitations(Request $request, string $clinicId): JsonResponse
    {
        $clinic = Clinic::findOrFail($clinicId);

        $invitations = $this->invitationService->listClinicInvitations($request->user(), $clinic);

        return response()->json([
            'status' => 'success',
            'data' => $invitations->map(fn ($inv) => [
                'id' => $inv->id,
                'doctor_id' => $inv->doctor_id,
                'doctor_name' => $inv->doctor?->user?->name,
                'doctor_email' => $inv->doctor?->user?->email,
                'doctor_specialty' => $inv->doctor?->specialty,
                'position' => $inv->position,
                'status' => $inv->status,
                'notes' => $inv->notes,
                'expires_at' => $inv->expires_at?->toISOString(),
                'created_at' => $inv->created_at?->toISOString(),
                'responded_at' => $inv->responded_at?->toISOString(),
            ])->values(),
        ], 200);
    }

    /**
     * Cancel a pending invitation by the clinic director.
     */
    public function cancel(Request $request, string $clinicId, string $invitationId): JsonResponse
    {
        $clinic = Clinic::findOrFail($clinicId);

        $invitation = $this->invitationService->cancelInvitation(
            $request->user(),
            $clinic,
            $invitationId
        );

        return response()->json([
            'status' => 'success',
            'message' => __('invitation.cancelled'),
            'data' => [
                'id' => $invitation->id,
                'status' => $invitation->status,
            ],
        ], 200);
    }

    /**
     * List all invitations received by the authenticated doctor.
     */
    public function myInvitations(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user || ! $user->hasRole('doctor') || ! $user->doctor) {
            abort(403, 'غير مصرح: يجب أن يكون المستخدم طبيباً مسجلاً.');
        }

        $invitations = $this->invitationService->listDoctorInvitations($user->doctor);

        return response()->json([
            'status' => 'success',
            'data' => $invitations->map(fn ($inv) => [
                'id' => $inv->id,
                'clinic' => $inv->clinic ? [
                    'id' => $inv->clinic->id,
                    'name' => $inv->clinic->name,
                    'wilaya' => $inv->clinic->wilaya,
                    'address' => $inv->clinic->address,
                    'phone' => $inv->clinic->phone,
                ] : null,
                'position' => $inv->position,
                'status' => $inv->status,
                'notes' => $inv->notes,
                'expires_at' => $inv->expires_at?->toISOString(),
                'created_at' => $inv->created_at?->toISOString(),
                'responded_at' => $inv->responded_at?->toISOString(),
            ])->values(),
        ], 200);
    }

    /**
     * Accept a clinic invitation.
     */
    public function accept(Request $request, string $invitationId): JsonResponse
    {
        $user = $request->user();

        if (! $user || ! $user->hasRole('doctor') || ! $user->doctor) {
            abort(403, 'غير مصرح: يجب أن يكون المستخدم طبيباً مسجلاً.');
        }

        $invitation = $this->invitationService->acceptInvitation($user, $invitationId);

        return response()->json([
            'status' => 'success',
            'message' => __('invitation.accepted'),
            'data' => [
                'id' => $invitation->id,
                'clinic_id' => $invitation->clinic_id,
                'status' => $invitation->status,
                'responded_at' => $invitation->responded_at?->toISOString(),
            ],
        ], 200);
    }

    /**
     * Reject a clinic invitation.
     */
    public function reject(Request $request, string $invitationId): JsonResponse
    {
        $user = $request->user();

        if (! $user || ! $user->hasRole('doctor') || ! $user->doctor) {
            abort(403, 'غير مصرح: يجب أن يكون المستخدم طبيباً مسجلاً.');
        }

        $invitation = $this->invitationService->rejectInvitation($user, $invitationId);

        return response()->json([
            'status' => 'success',
            'message' => __('invitation.rejected'),
            'data' => [
                'id' => $invitation->id,
                'clinic_id' => $invitation->clinic_id,
                'status' => $invitation->status,
                'responded_at' => $invitation->responded_at?->toISOString(),
            ],
        ], 200);
    }
}
