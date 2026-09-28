<?php

namespace App\Services;

use App\Models\Advertisement;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class AdvertisementService
{
    /**
     * Create a new advertisement campaign.
     *
     * @param array<string, mixed> $data
     */
    public function createAdvertisement(array $data, User $user): Advertisement
    {
        $isAdmin = $user->hasRole('admin');

        $status = $isAdmin ? ($data['status'] ?? 'active') : 'pending_approval';

        $startDate = Carbon::parse($data['start_date'] ?? now())->format('Y-m-d');
        $endDate = Carbon::parse($data['end_date'] ?? now()->addDays(30))->format('Y-m-d');

        if ($endDate < $startDate) {
            throw ValidationException::withMessages([
                'end_date' => ['تاريخ نهاية الحملة الإعلانية يجب أن يكون بعد تاريخ البداية.'],
            ]);
        }

        $doctor = $user->doctor;
        $doctorId = $data['doctor_id'] ?? ($doctor?->id);
        $clinicId = $data['clinic_id'] ?? null;

        return Advertisement::create([
            'user_id' => $user->id,
            'clinic_id' => $clinicId,
            'doctor_id' => $doctorId,
            'title' => $data['title'],
            'content' => $data['content'],
            'banner_image_url' => $data['banner_image_url'] ?? null,
            'target_url' => $data['target_url'] ?? null,
            'placement' => $data['placement'] ?? 'home_banner',
            'target_role' => $data['target_role'] ?? null,
            'target_specialty' => $data['target_specialty'] ?? null,
            'target_wilaya' => $data['target_wilaya'] ?? null,
            'is_welcome_offer' => (bool) ($data['is_welcome_offer'] ?? false),
            'status' => $status,
            'start_date' => $startDate,
            'end_date' => $endDate,
        ]);
    }

    /**
     * Update an existing advertisement campaign.
     *
     * @param array<string, mixed> $data
     */
    public function updateAdvertisement(Advertisement $ad, array $data, User $user): Advertisement
    {
        $isAdmin = $user->hasRole('admin');
        if ($ad->user_id !== $user->id && ! $isAdmin) {
            throw ValidationException::withMessages([
                'authorization' => ['غير مصرح لك بتعديل هذا الإعلان.'],
            ]);
        }

        if (isset($data['start_date']) || isset($data['end_date'])) {
            $startDate = Carbon::parse($data['start_date'] ?? $ad->start_date)->format('Y-m-d');
            $endDate = Carbon::parse($data['end_date'] ?? $ad->end_date)->format('Y-m-d');
            if ($endDate < $startDate) {
                throw ValidationException::withMessages([
                    'end_date' => ['تاريخ نهاية الحملة الإعلانية يجب أن يكون بعد تاريخ البداية.'],
                ]);
            }
            $data['start_date'] = $startDate;
            $data['end_date'] = $endDate;
        }

        // If regular user modifies an approved ad, require re-approval
        if (! $isAdmin && $ad->status === 'active') {
            $data['status'] = 'pending_approval';
        }

        $ad->update($data);

        return $ad->fresh();
    }

    /**
     * Admin review & approve/reject advertisement.
     */
    public function updateStatus(Advertisement $ad, string $status, User $adminUser, ?string $rejectionReason = null): Advertisement
    {
        if (! $adminUser->hasRole('admin')) {
            throw ValidationException::withMessages([
                'authorization' => ['اعتماد أو تغيير حالة الإعلانات مقتصر على المشرف العام (Admin).'],
            ]);
        }

        $ad->update([
            'status' => $status,
            'rejection_reason' => $status === 'rejected' ? $rejectionReason : null,
        ]);

        return $ad->fresh();
    }

    /**
     * Increment impressions atomically.
     */
    public function recordImpression(Advertisement $ad): void
    {
        $ad->increment('impressions_count');
    }

    /**
     * Increment clicks atomically.
     */
    public function recordClick(Advertisement $ad): void
    {
        $ad->increment('clicks_count');
    }

    /**
     * Get active advertisements targeted by parameters.
     *
     * @param array<string, mixed> $filters
     */
    public function getActiveAds(array $filters = []): Collection
    {
        $today = now()->format('Y-m-d');

        $query = Advertisement::with(['clinic', 'doctor.user'])
            ->where('status', 'active')
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today);

        if (! empty($filters['placement'])) {
            $query->where('placement', $filters['placement']);
        }

        if (! empty($filters['target_role'])) {
            $query->where(function ($q) use ($filters) {
                $q->whereNull('target_role')
                    ->orWhere('target_role', 'all')
                    ->orWhere('target_role', $filters['target_role']);
            });
        }

        if (! empty($filters['target_specialty'])) {
            $query->where(function ($q) use ($filters) {
                $q->whereNull('target_specialty')
                    ->orWhere('target_specialty', 'all')
                    ->orWhere('target_specialty', $filters['target_specialty']);
            });
        }

        if (! empty($filters['target_wilaya'])) {
            $query->where(function ($q) use ($filters) {
                $q->whereNull('target_wilaya')
                    ->orWhere('target_wilaya', $filters['target_wilaya']);
            });
        }

        return $query->orderBy('is_welcome_offer', 'desc')->latest()->get();
    }
}
