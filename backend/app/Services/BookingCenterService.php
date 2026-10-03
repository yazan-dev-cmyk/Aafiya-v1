<?php

namespace App\Services;

use App\Models\BookingCenter;
use App\Models\User;
use App\Services\LegacyWilayaMigrationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BookingCenterService
{
    public function __construct(
        protected ?LegacyWilayaMigrationService $wilayaResolver = null
    ) {
        $this->wilayaResolver = $this->wilayaResolver ?? app(LegacyWilayaMigrationService::class);
    }

    /**
     * Atomically provision a Booking Center for a user.
     * Guarantees 1:1 invariant between User and BookingCenter.
     *
     * @param array<string, mixed> $data
     * @param User $user
     * @return BookingCenter
     * @throws ValidationException
     */
    public function provisionCenter(array $data, User $user): BookingCenter
    {
        if ($user->bookingCenter()->exists()) {
            throw ValidationException::withMessages([
                'user' => ['المستخدم يملك حساب مركز حجز بالفعل.'],
            ]);
        }

        $wilayaStr = $data['wilaya'] ?? 'الجزائر العاصمة';
        $wilayaId = $data['wilaya_id'] ?? ($wilayaStr !== null ? $this->wilayaResolver->resolveWilaya($wilayaStr)?->id : null);

        return BookingCenter::create([
            'user_id'             => $user->id,
            'name'                => $data['name'],
            'commercial_register' => $data['commercial_register'] ?? null,
            'license_number'      => $data['license_number'] ?? null,
            'phone'               => $data['phone'] ?? $user->phone,
            'email'               => $data['email'] ?? $user->email,
            'address'             => $data['address'] ?? 'الجزائر',
            'wilaya'              => $wilayaStr,
            'wilaya_id'           => $wilayaId,
            'quota_balance'       => 0,
            'verification_status' => BookingCenter::STATUS_PENDING,
            'is_active'           => false,
        ]);
    }

    /**
     * Atomically approve a pending Booking Center.
     * Transitions state from pending to verified, activates operations, and records the reviewer.
     *
     * @param BookingCenter $center
     * @param User $reviewer
     * @return BookingCenter
     * @throws ValidationException
     */
    public function approveCenter(BookingCenter $center, User $reviewer): BookingCenter
    {
        return DB::transaction(function () use ($center, $reviewer) {
            /** @var BookingCenter $lockedCenter */
            $lockedCenter = BookingCenter::where('id', $center->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedCenter->verification_status !== BookingCenter::STATUS_PENDING) {
                throw ValidationException::withMessages([
                    'status' => ['لا يمكن اعتماد مركز الحجز لأنه ليس في حالة انتظار المراجعة.'],
                ]);
            }

            $lockedCenter->update([
                'verification_status' => BookingCenter::STATUS_VERIFIED,
                'verified_at'         => now(),
                'reviewed_by_id'      => $reviewer->id,
                'rejection_reason'    => null,
                'is_active'           => true,
            ]);

            return $lockedCenter->fresh(['user', 'reviewedBy']);
        });
    }

    /**
     * Atomically reject a pending Booking Center with a documented reason.
     * Transitions state from pending to rejected, leaves is_active = false, and records the reviewer.
     *
     * @param BookingCenter $center
     * @param string $reason
     * @param User $reviewer
     * @return BookingCenter
     * @throws ValidationException
     */
    public function rejectCenter(BookingCenter $center, string $reason, User $reviewer): BookingCenter
    {
        $trimmedReason = trim($reason);
        if ($trimmedReason === '') {
            throw ValidationException::withMessages([
                'rejection_reason' => ['يجب توضيح سبب رفض مركز الحجز.'],
            ]);
        }

        return DB::transaction(function () use ($center, $trimmedReason, $reviewer) {
            /** @var BookingCenter $lockedCenter */
            $lockedCenter = BookingCenter::where('id', $center->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedCenter->verification_status !== BookingCenter::STATUS_PENDING) {
                throw ValidationException::withMessages([
                    'status' => ['لا يمكن رفض مركز الحجز لأنه ليس في حالة انتظار المراجعة.'],
                ]);
            }

            $lockedCenter->update([
                'verification_status' => BookingCenter::STATUS_REJECTED,
                'verified_at'         => null,
                'reviewed_by_id'      => $reviewer->id,
                'rejection_reason'    => $trimmedReason,
                'is_active'           => false,
            ]);

            return $lockedCenter->fresh(['user', 'reviewedBy']);
        });
    }

    /**
     * Atomically resubmit a rejected Booking Center back to pending review.
     *
     * @param BookingCenter $center
     * @param array<string, mixed> $data
     * @param User $user
     * @return BookingCenter
     * @throws ValidationException
     */
    public function resubmitCenter(BookingCenter $center, array $data, User $user): BookingCenter
    {
        if ($center->user_id !== $user->id && ! $user->hasRole('admin')) {
            throw ValidationException::withMessages([
                'auth' => ['غير مصرح لك بإعادة تقديم هذا الطلب.'],
            ]);
        }

        return DB::transaction(function () use ($center, $data) {
            /** @var BookingCenter $lockedCenter */
            $lockedCenter = BookingCenter::where('id', $center->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedCenter->verification_status !== BookingCenter::STATUS_REJECTED) {
                throw ValidationException::withMessages([
                    'status' => ['يمكن إعادة التقديم فقط لمراكز الحجز المرفوضة.'],
                ]);
            }

            $updateData = [
                'verification_status' => BookingCenter::STATUS_PENDING,
                'verified_at'         => null,
                'reviewed_by_id'      => null,
                'rejection_reason'    => null,
                'is_active'           => false,
            ];

            if (isset($data['name']) && trim($data['name']) !== '') {
                $updateData['name'] = $data['name'];
            }
            if (isset($data['commercial_register'])) {
                $updateData['commercial_register'] = $data['commercial_register'];
            }
            if (isset($data['phone'])) {
                $updateData['phone'] = $data['phone'];
            }
            if (isset($data['wilaya'])) {
                $wilayaStr = $data['wilaya'];
                $updateData['wilaya'] = $wilayaStr;
                $updateData['wilaya_id'] = $data['wilaya_id'] ?? ($wilayaStr !== null ? $this->wilayaResolver->resolveWilaya($wilayaStr)?->id : null);
            } elseif (isset($data['wilaya_id'])) {
                $updateData['wilaya_id'] = $data['wilaya_id'];
            }
            if (isset($data['address'])) {
                $updateData['address'] = $data['address'];
            }

            $lockedCenter->update($updateData);

            return $lockedCenter->fresh(['user', 'reviewedBy']);
        });
    }
}
