<?php

namespace App\Services;

use App\Models\AssistantPayoutProfile;
use App\Models\SecurityAuditLog;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AssistantPayoutProfileService
{
    /**
     * Submit a new RIP profile for an assistant with private cheque image upload.
     */
    public function submitProfile(User $assistant, string $ripNumber, UploadedFile $chequeFile): AssistantPayoutProfile
    {
        // 20-digit numeric RIP validation
        $cleanRip = trim($ripNumber);
        if (!preg_match('/^\d{20}$/', $cleanRip)) {
            throw new InvalidArgumentException('RIP number must be exactly 20 numeric digits.');
        }

        // Store cheque in private storage
        $path = $chequeFile->store('private/cheques', 'local');

        return DB::transaction(function () use ($assistant, $cleanRip, $path) {
            // Lock existing profiles to prevent race conditions during version creation
            AssistantPayoutProfile::where('assistant_id', $assistant->id)
                ->lockForUpdate()
                ->get();

            // Suspend payout eligibility immediately by superseding any existing active profile
            AssistantPayoutProfile::where('assistant_id', $assistant->id)
                ->where('status', 'active')
                ->update(['status' => 'superseded']);

            $nextVersion = ((int) AssistantPayoutProfile::where('assistant_id', $assistant->id)->max('version')) + 1;

            return AssistantPayoutProfile::create([
                'assistant_id' => $assistant->id,
                'version' => $nextVersion,
                'rip_number' => $cleanRip,
                'cheque_image_path' => $path,
                'status' => 'pending_verification',
            ]);
        });
    }

    /**
     * Admin review and verification of submitted profile.
     */
    public function verifyProfile(AssistantPayoutProfile $profile, User $verifier, bool $approved, ?string $rejectionReason = null): AssistantPayoutProfile
    {
        if (!$verifier->hasRole('admin') && !$verifier->hasRole('admin_assistant')) {
            throw new AuthorizationException('Forbidden: Unauthorized to verify payout profiles.');
        }

        return DB::transaction(function () use ($profile, $verifier, $approved, $rejectionReason) {
            /** @var AssistantPayoutProfile $lockedProfile */
            $lockedProfile = AssistantPayoutProfile::where('id', $profile->id)->lockForUpdate()->firstOrFail();

            if ($approved) {
                // Supersede any existing active profile for this assistant
                AssistantPayoutProfile::where('assistant_id', $lockedProfile->assistant_id)
                    ->where('status', 'active')
                    ->where('id', '!=', $lockedProfile->id)
                    ->update(['status' => 'superseded']);

                $lockedProfile->update([
                    'status' => 'active',
                    'verified_by_id' => $verifier->id,
                    'verified_at' => now(),
                    'rejection_reason' => null,
                ]);
            } else {
                $lockedProfile->update([
                    'status' => 'rejected',
                    'verified_by_id' => $verifier->id,
                    'verified_at' => now(),
                    'rejection_reason' => $rejectionReason ?? 'Profile rejected by platform administration.',
                ]);
            }

            SecurityAuditLog::create([
                'actor_id' => $verifier->id,
                'actor_role' => $verifier->roles->first()?->name ?? 'admin',
                'event_category' => 'assistant_rewards_admin',
                'action' => $approved ? 'verify_payout_profile' : 'reject_payout_profile',
                'resource_type' => 'AssistantPayoutProfile',
                'resource_id' => $lockedProfile->id,
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'user_agent' => request()->userAgent() ?? 'CLI',
                'details' => [
                    'assistant_id' => $lockedProfile->assistant_id,
                    'version' => $lockedProfile->version,
                    'approved' => $approved,
                    'rejection_reason' => $approved ? null : ($rejectionReason ?? 'Profile rejected by platform administration.'),
                ],
            ]);

            return $lockedProfile;
        });
    }

    /**
     * Authorize and stream private cheque document for inline viewing.
     */
    public function streamCheque(AssistantPayoutProfile $profile, User $viewer): BinaryFileResponse
    {
        // Authorization: owner assistant or admin / authorized reviewer
        $isOwner = $viewer->id === $profile->assistant_id;
        $isAdmin = $viewer->hasRole('admin') || ($viewer->hasRole('admin_assistant') && $viewer->has4DAccess('platform.rewards.view_cheque_document', null, ['scope_type' => 'platform']));

        if (!$isOwner && !$isAdmin) {
            throw new AuthorizationException('Forbidden: Unauthorized to view this cheque document.');
        }

        if (!Storage::disk('local')->exists($profile->cheque_image_path)) {
            abort(404, 'Cheque document file not found.');
        }

        // Record security audit log for viewing sensitive financial document
        SecurityAuditLog::create([
            'actor_id' => $viewer->id,
            'actor_role' => $viewer->roles->first()?->name ?? 'user',
            'event_category' => 'financial_document_access',
            'action' => 'view_cheque_document',
            'resource_type' => 'AssistantPayoutProfile',
            'resource_id' => $profile->id,
            'ip_address' => request()->ip() ?? '127.0.0.1',
            'user_agent' => request()->userAgent() ?? 'CLI',
            'details' => [
                'assistant_id' => $profile->assistant_id,
                'version' => $profile->version,
            ],
        ]);

        $fullPath = Storage::disk('local')->path($profile->cheque_image_path);
        return response()->file($fullPath, ['X-Content-Type-Options' => 'nosniff']);
    }

    /**
     * Authorize and download private crossed-cheque document.
     * Compliant with Decision D-01 (Option B):
     * - Requires platform.rewards.download_cheque_document or admin
     * - Document served from private storage
     * - Recorded in SecurityAuditLog
     * - Appropriate attachment headers
     */
    public function downloadCheque(AssistantPayoutProfile $profile, User $downloader): BinaryFileResponse
    {
        $canDownload = $downloader->hasRole('admin') || ($downloader->hasRole('admin_assistant') && $downloader->has4DAccess('platform.rewards.download_cheque_document', null, ['scope_type' => 'platform']));

        if (!$canDownload) {
            throw new AuthorizationException('Forbidden: Unauthorized to download crossed-cheque documents.');
        }

        if (!Storage::disk('local')->exists($profile->cheque_image_path)) {
            abort(404, 'Cheque document file not found.');
        }

        SecurityAuditLog::create([
            'actor_id' => $downloader->id,
            'actor_role' => $downloader->roles->first()?->name ?? 'admin',
            'event_category' => 'financial_document_access',
            'action' => 'download_cheque_document',
            'resource_type' => 'AssistantPayoutProfile',
            'resource_id' => $profile->id,
            'ip_address' => request()->ip() ?? '127.0.0.1',
            'user_agent' => request()->userAgent() ?? 'CLI',
            'details' => [
                'assistant_id' => $profile->assistant_id,
                'version' => $profile->version,
            ],
        ]);

        $fullPath = Storage::disk('local')->path($profile->cheque_image_path);
        $extension = pathinfo($fullPath, PATHINFO_EXTENSION) ?: 'jpg';
        $filename = "cheque_profile_{$profile->id}_v{$profile->version}.{$extension}";

        return response()->download($fullPath, $filename, [
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Reveal full unmasked RIP to authorized administrative user.
     * Compliant with Decision D-03:
     * - Requires platform.rewards.view_full_rip or admin
     * - Recorded in SecurityAuditLog
     */
    public function revealFullRip(AssistantPayoutProfile $profile, User $actor): string
    {
        $canViewFullRip = $actor->hasRole('admin') || ($actor->hasRole('admin_assistant') && $actor->has4DAccess('platform.rewards.view_full_rip', null, ['scope_type' => 'platform']));

        if (!$canViewFullRip) {
            throw new AuthorizationException('Forbidden: Unauthorized to disclose full RIP numbers.');
        }

        SecurityAuditLog::create([
            'actor_id' => $actor->id,
            'actor_role' => $actor->roles->first()?->name ?? 'admin',
            'event_category' => 'financial_document_access',
            'action' => 'view_full_rip',
            'resource_type' => 'AssistantPayoutProfile',
            'resource_id' => $profile->id,
            'ip_address' => request()->ip() ?? '127.0.0.1',
            'user_agent' => request()->userAgent() ?? 'CLI',
            'details' => [
                'assistant_id' => $profile->assistant_id,
                'version' => $profile->version,
            ],
        ]);

        return $profile->rip_number;
    }
}