<?php

namespace App\Services;

use App\Models\BookingCenter;
use App\Models\BookingPackage;
use App\Models\BookingTransaction;
use App\Models\PackagePurchaseRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PackagePurchaseRequestService
{
    /**
     * Submit a new purchase request in pending status.
     * Captures immutable historical snapshots of package attributes.
     * Guarantees that no quota is added and no ledger transaction is created at this stage.
     *
     * @param array<string, mixed> $data
     */
    public function createRequest(
        BookingCenter $center,
        BookingPackage $package,
        array $data,
        User $creator
    ): PackagePurchaseRequest {
        if (! $package->is_active) {
            throw ValidationException::withMessages([
                'package_id' => ['الباقة المحددة غير نشطة حالياً ولا يمكن طلب شرائها.'],
            ]);
        }

        return DB::transaction(function () use ($center, $package, $data, $creator) {
            $reference = $this->generateRequestReference();

            return PackagePurchaseRequest::create([
                'request_reference' => $reference,
                'booking_center_id' => $center->id,
                'booking_package_id' => $package->id,
                'package_name' => $package->name,
                'package_code' => $package->package_code,
                'quota_units' => (int) $package->quota_units,
                'price_dzd' => (float) $package->price_dzd,
                'payment_method' => $data['payment_method'] ?? null,
                'transaction_reference' => $data['transaction_reference'] ?? null,
                'receipt_document_path' => $data['receipt_document_path'] ?? null,
                'status' => PackagePurchaseRequest::STATUS_PENDING,
                'notes' => $data['notes'] ?? null,
                'created_by_id' => $creator->id,
            ]);
        });
    }

    /**
     * Atomically approve a pending purchase request.
     * Adds quota units to BookingCenter and records exactly ONE ledger transaction.
     * Protected against double-approval, race conditions, and concurrent invocations via pessimistic locks.
     */
    public function approveRequest(PackagePurchaseRequest $request, User $reviewer): PackagePurchaseRequest
    {
        return DB::transaction(function () use ($request, $reviewer) {
            /** @var PackagePurchaseRequest $lockedRequest */
            $lockedRequest = PackagePurchaseRequest::where('id', $request->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedRequest->status !== PackagePurchaseRequest::STATUS_PENDING) {
                throw ValidationException::withMessages([
                    'status' => ['لا يمكن اعتماد هذا الطلب لأنه تمت معالجته مسبقاً.'],
                ]);
            }

            /** @var BookingCenter $lockedCenter */
            $lockedCenter = BookingCenter::where('id', $lockedRequest->booking_center_id)
                ->lockForUpdate()
                ->firstOrFail();

            $newBalance = $lockedCenter->quota_balance + $lockedRequest->quota_units;
            $lockedCenter->update(['quota_balance' => $newBalance]);

            $tx = BookingTransaction::create([
                'booking_center_id' => $lockedCenter->id,
                'booking_package_id' => $lockedRequest->booking_package_id,
                'transaction_type' => 'purchase',
                'units' => (int) $lockedRequest->quota_units,
                'balance_after' => $newBalance,
                'reference_note' => "اعتماد طلب شراء الباقة {$lockedRequest->request_reference}",
                'created_by_id' => $reviewer->id,
            ]);

            $lockedRequest->update([
                'status' => PackagePurchaseRequest::STATUS_APPROVED,
                'reviewed_by_id' => $reviewer->id,
                'reviewed_at' => now(),
                'booking_transaction_id' => $tx->id,
            ]);

            return $lockedRequest->load(['bookingCenter', 'bookingPackage', 'createdBy', 'reviewedBy', 'bookingTransaction']);
        });
    }

    /**
     * Atomically reject a pending purchase request with a documented reason.
     * Guarantees that quota_balance remains unchanged and no transaction is created.
     */
    public function rejectRequest(PackagePurchaseRequest $request, string $reason, User $reviewer): PackagePurchaseRequest
    {
        return DB::transaction(function () use ($request, $reason, $reviewer) {
            /** @var PackagePurchaseRequest $lockedRequest */
            $lockedRequest = PackagePurchaseRequest::where('id', $request->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedRequest->status !== PackagePurchaseRequest::STATUS_PENDING) {
                throw ValidationException::withMessages([
                    'status' => ['لا يمكن رفض هذا الطلب لأنه تمت معالجته مسبقاً.'],
                ]);
            }

            $lockedRequest->update([
                'status' => PackagePurchaseRequest::STATUS_REJECTED,
                'rejection_reason' => $reason,
                'reviewed_by_id' => $reviewer->id,
                'reviewed_at' => now(),
            ]);

            return $lockedRequest->load(['bookingCenter', 'bookingPackage', 'createdBy', 'reviewedBy']);
        });
    }

    /**
     * Generate a robust unique request reference sequence: REQ-PKG-YYYY-XXXX.
     */
    protected function generateRequestReference(): string
    {
        $year = date('Y');
        $prefix = "REQ-PKG-{$year}-";

        $references = PackagePurchaseRequest::where('request_reference', 'LIKE', "{$prefix}%")
            ->lockForUpdate()
            ->pluck('request_reference');

        $maxSeq = 0;
        foreach ($references as $ref) {
            $numPart = substr($ref, strlen($prefix));
            if (is_numeric($numPart)) {
                $seq = (int) $numPart;
                if ($seq > $maxSeq) {
                    $maxSeq = $seq;
                }
            }
        }

        $nextSeq = str_pad((string) ($maxSeq + 1), 4, '0', STR_PAD_LEFT);
        return "{$prefix}{$nextSeq}";
    }
}
