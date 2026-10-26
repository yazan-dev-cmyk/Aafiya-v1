<?php

namespace App\Services;

use App\Models\BookingCenter;
use App\Models\BookingPackage;
use App\Models\BookingTransaction;
use App\Models\PackagePurchaseRequest;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PackagePurchaseRequestService
{
    public function __construct(
        protected GoogleDriveService $googleDriveService
    ) {}

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

        // Rule 1: Free package can be granted ONLY ONCE per booking center
        if ((float) $package->price_dzd <= 0.0) {
            $alreadyClaimed = PackagePurchaseRequest::where('booking_center_id', $center->id)
                ->where(function ($q) use ($package) {
                    $q->where('booking_package_id', $package->id)
                      ->orWhere('price_dzd', '<=', 0);
                })
                ->whereIn('status', [PackagePurchaseRequest::STATUS_PENDING, PackagePurchaseRequest::STATUS_APPROVED])
                ->exists();

            if ($alreadyClaimed) {
                throw ValidationException::withMessages([
                    'package_id' => ['لقد استفاد مركز الحجز من الباقة المجانية مسبقاً، ولا يمكن الحصول عليها أكثر من مرة.'],
                ]);
            }
        }

        // Rule 2: Payment receipt is strictly mandatory for paid packages
        if ((float) $package->price_dzd > 0.0) {
            $hasFile = isset($data['receipt_file']) && $data['receipt_file'] instanceof UploadedFile;
            $hasPath = ! empty($data['receipt_document_path']);

            if (! $hasFile && ! $hasPath) {
                throw ValidationException::withMessages([
                    'receipt_file' => ['إرفاق إثبات الدفع (وصل التحويل عبر بريدي موب) إلزامي عند شراء باقة مدفوعة.'],
                ]);
            }
        }

        return DB::transaction(function () use ($center, $package, $data, $creator) {
            $reference = $this->generateRequestReference();

            $receiptPath = $data['receipt_document_path'] ?? null;
            if (isset($data['receipt_file']) && $data['receipt_file'] instanceof UploadedFile) {
                $ext = $data['receipt_file']->getClientOriginalExtension() ?: 'pdf';
                $cleanCenterCode = preg_replace('/[^a-zA-Z0-9_\-]/', '', $center->code ?: 'BC');
                $customName = "receipt_{$cleanCenterCode}_{$reference}.{$ext}";
                
                $upload = $this->googleDriveService->uploadReceipt($data['receipt_file'], $customName);
                if (($upload['storage'] ?? '') === 'local' && !empty($upload['storage_path'])) {
                    $receiptPath = "local:{$upload['storage_path']}:{$upload['name']}";
                } else {
                    $receiptPath = "gdrive:{$upload['file_id']}:{$upload['name']}";
                }
            }

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
                'receipt_document_path' => $receiptPath,
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
