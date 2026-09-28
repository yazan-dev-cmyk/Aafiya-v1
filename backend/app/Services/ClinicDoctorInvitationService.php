<?php

namespace App\Services;

use App\Models\Clinic;
use App\Models\ClinicDoctorInvitation;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ClinicDoctorInvitationService
{
    /**
     * Look up an existing registered doctor by email for invitation.
     *
     * Strict privacy rules apply: Only basic identity and specialty are exposed.
     * Other clinic affiliations or confidential details are never returned.
     */
    public function lookupDoctorByEmail(User $director, Clinic $clinic, string $email): array
    {
        $this->authorizeClinicDirector($director, $clinic);

        $targetUser = User::where('email', $email)
            ->where('is_active', true)
            ->whereHas('doctor')
            ->first();

        if (! $targetUser || ! $targetUser->doctor) {
            abort(404, __('invitation.not_found'));
        }

        $doctor = $targetUser->doctor;

        $existingPivot = $doctor->clinics()->where('clinics.id', $clinic->id)->first()?->pivot;
        $isMember = $existingPivot !== null;
        $isActiveMember = $existingPivot && (bool) ($existingPivot->is_active ?? false);
        $isSuspended = $existingPivot && ! (bool) ($existingPivot->is_active ?? false);

        $hasPendingInvite = ClinicDoctorInvitation::where('clinic_id', $clinic->id)
            ->where('doctor_id', $doctor->id)
            ->where('status', ClinicDoctorInvitation::STATUS_PENDING)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->exists();

        return [
            'id' => $doctor->id,
            'full_name' => $targetUser->name,
            'specialty' => $doctor->specialty,
            'license_number' => $doctor->license_number,
            'is_verified' => (bool) $doctor->is_verified,
            'is_already_member' => $isMember,
            'is_active_member' => $isActiveMember,
            'is_suspended_member' => $isSuspended,
            'has_pending_invitation' => $hasPendingInvite,
        ];
    }

    /**
     * Dispatch an invitation to an existing doctor to join the clinic.
     */
    public function sendInvitation(User $director, Clinic $clinic, string $doctorId, ?string $notes = null): ClinicDoctorInvitation
    {
        $this->authorizeClinicDirector($director, $clinic);

        $doctor = Doctor::with('user')->findOrFail($doctorId);

        if (! $doctor->user || ! $doctor->user->is_active) {
            abort(404, __('invitation.not_found'));
        }

        if (! (bool) $doctor->is_verified) {
            abort(422, __('invitation.unverified_doctor'));
        }

        // Self-invitation prevention: Director cannot invite themselves as employed doctor
        if ($doctor->user_id === $director->id) {
            abort(422, __('invitation.unauthorized'));
        }

        // Membership check: Doctor cannot be invited if already an active member or suspended
        $existingPivot = $doctor->clinics()->where('clinics.id', $clinic->id)->first()?->pivot;
        if ($existingPivot) {
            if ((bool) ($existingPivot->is_active ?? false)) {
                abort(409, __('invitation.already_member'));
            } else {
                abort(409, __('invitation.suspended_member'));
            }
        }

        // Duplicate pending invitation check
        $pendingExists = ClinicDoctorInvitation::where('clinic_id', $clinic->id)
            ->where('doctor_id', $doctor->id)
            ->where('status', ClinicDoctorInvitation::STATUS_PENDING)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->exists();

        if ($pendingExists) {
            abort(409, __('invitation.already_pending'));
        }

        return ClinicDoctorInvitation::create([
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'invited_by_id' => $director->id,
            'position' => 'doctor',
            'status' => ClinicDoctorInvitation::STATUS_PENDING,
            'notes' => $notes,
            'expires_at' => now()->addDays(14),
        ]);
    }

    /**
     * List invitations received by the authenticated doctor.
     */
    public function listDoctorInvitations(Doctor $doctor): Collection
    {
        $invitations = ClinicDoctorInvitation::where('doctor_id', $doctor->id)
            ->with(['clinic:id,name,wilaya,address,phone'])
            ->orderBy('created_at', 'desc')
            ->get();

        // Lazy expiration handling
        foreach ($invitations as $invitation) {
            if ($invitation->status === ClinicDoctorInvitation::STATUS_PENDING &&
                $invitation->expires_at &&
                $invitation->expires_at->isPast()) {
                $invitation->update(['status' => ClinicDoctorInvitation::STATUS_EXPIRED]);
                $invitation->status = ClinicDoctorInvitation::STATUS_EXPIRED;
            }
        }

        return $invitations;
    }

    /**
     * List all invitations sent by a specific clinic.
     * Accessible only by Clinic Director.
     */
    public function listClinicInvitations(User $director, Clinic $clinic)
    {
        $this->authorizeClinicDirector($director, $clinic);

        $invitations = ClinicDoctorInvitation::where('clinic_id', $clinic->id)
            ->with(['doctor.user'])
            ->orderBy('created_at', 'desc')
            ->get();

        foreach ($invitations as $invitation) {
            if ($invitation->status === ClinicDoctorInvitation::STATUS_PENDING &&
                $invitation->expires_at &&
                $invitation->expires_at->isPast()) {
                $invitation->update(['status' => ClinicDoctorInvitation::STATUS_EXPIRED]);
                $invitation->status = ClinicDoctorInvitation::STATUS_EXPIRED;
            }
        }

        return $invitations;
    }

    /**
     * Accept an invitation (transaction-safe, atomic membership activation).
     */
    public function acceptInvitation(User $doctorUser, string $invitationId): ClinicDoctorInvitation
    {
        return DB::transaction(function () use ($doctorUser, $invitationId) {
            $invitation = ClinicDoctorInvitation::where('id', $invitationId)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $doctorUser->doctor || $invitation->doctor_id !== $doctorUser->doctor->id) {
                abort(403, __('invitation.unauthorized'));
            }

            if ($invitation->status === ClinicDoctorInvitation::STATUS_ACCEPTED) {
                abort(422, __('invitation.already_accepted'));
            }

            if ($invitation->status !== ClinicDoctorInvitation::STATUS_PENDING) {
                abort(422, __('invitation.expired'));
            }

            if ($invitation->expires_at && $invitation->expires_at->isPast()) {
                $invitation->update(['status' => ClinicDoctorInvitation::STATUS_EXPIRED]);
                abort(422, __('invitation.expired'));
            }

            $clinic = Clinic::findOrFail($invitation->clinic_id);

            // Re-verify existing membership state
            $existingMembership = DoctorClinic::where('doctor_id', $invitation->doctor_id)
                ->where('clinic_id', $invitation->clinic_id)
                ->first();

            if ($existingMembership) {
                if ((bool) ($existingMembership->is_active ?? false)) {
                    $invitation->update([
                        'status' => ClinicDoctorInvitation::STATUS_ACCEPTED,
                        'responded_at' => now(),
                    ]);

                    return $invitation;
                }

                $existingMembership->update([
                    'position' => $invitation->position ?? 'doctor',
                    'is_active' => true,
                    'joined_at' => now(),
                ]);
            } else {
                DoctorClinic::create([
                    'doctor_id' => $invitation->doctor_id,
                    'clinic_id' => $invitation->clinic_id,
                    'position' => $invitation->position ?? 'doctor',
                    'is_primary' => false,
                    'is_active' => true,
                    'joined_at' => now(),
                ]);
            }

            $invitation->update([
                'status' => ClinicDoctorInvitation::STATUS_ACCEPTED,
                'responded_at' => now(),
            ]);

            return $invitation;
        });
    }

    /**
     * Reject an invitation.
     */
    public function rejectInvitation(User $doctorUser, string $invitationId): ClinicDoctorInvitation
    {
        return DB::transaction(function () use ($doctorUser, $invitationId) {
            $invitation = ClinicDoctorInvitation::where('id', $invitationId)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $doctorUser->doctor || $invitation->doctor_id !== $doctorUser->doctor->id) {
                abort(403, __('invitation.unauthorized'));
            }

            if ($invitation->status !== ClinicDoctorInvitation::STATUS_PENDING) {
                abort(422, __('invitation.cannot_cancel_resolved'));
            }

            $invitation->update([
                'status' => ClinicDoctorInvitation::STATUS_REJECTED,
                'responded_at' => now(),
            ]);

            return $invitation;
        });
    }

    /**
     * Cancel an invitation by the clinic director.
     */
    public function cancelInvitation(User $director, Clinic $clinic, string $invitationId): ClinicDoctorInvitation
    {
        $this->authorizeClinicDirector($director, $clinic);

        $invitation = ClinicDoctorInvitation::where('id', $invitationId)
            ->where('clinic_id', $clinic->id)
            ->firstOrFail();

        if ($invitation->status !== ClinicDoctorInvitation::STATUS_PENDING) {
            abort(422, __('invitation.cannot_cancel_resolved'));
        }

        $invitation->update([
            'status' => ClinicDoctorInvitation::STATUS_CANCELLED,
            'responded_at' => now(),
        ]);

        return $invitation;
    }

    /**
     * Validate that the user is the active Director of the specified clinic.
     */
    protected function authorizeClinicDirector(User $user, Clinic $clinic): void
    {
        if (! $user->hasRole('doctor') || ! $user->doctor) {
            abort(403, 'غير مصرح: يجب أن يكون المستخدم طبيباً مسجلاً.');
        }

        if (! $user->doctor->isDirectorOf($clinic->id)) {
            abort(403, 'غير مصرح: هذه العملية مخصصة لمدير هذه العيادة فقط.');
        }

        if (! $user->doctor->isDoctorActiveInClinic($clinic->id)) {
            abort(403, 'غير مصرح: حساب مدير العيادة غير نشط في هذه العيادة.');
        }
    }
}
