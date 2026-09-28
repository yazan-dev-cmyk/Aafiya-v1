<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'request_reference',
    'booking_center_id',
    'booking_package_id',
    'package_name',
    'package_code',
    'quota_units',
    'price_dzd',
    'payment_method',
    'transaction_reference',
    'receipt_document_path',
    'status',
    'notes',
    'reviewed_by_id',
    'reviewed_at',
    'rejection_reason',
    'booking_transaction_id',
    'created_by_id',
])]
class PackagePurchaseRequest extends Model
{
    use HasFactory, HasUuids;

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    public const VALID_STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_APPROVED,
        self::STATUS_REJECTED,
    ];

    protected function casts(): array
    {
        return [
            'quota_units' => 'integer',
            'price_dzd' => 'decimal:2',
            'reviewed_at' => 'datetime',
        ];
    }

    /**
     * Booking Center that requested the package purchase.
     */
    public function bookingCenter(): BelongsTo
    {
        return $this->belongsTo(BookingCenter::class, 'booking_center_id');
    }

    /**
     * Booking Package from catalog.
     */
    public function bookingPackage(): BelongsTo
    {
        return $this->belongsTo(BookingPackage::class, 'booking_package_id');
    }

    /**
     * User account who submitted the purchase request.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * Platform Admin or authorized Assistant who reviewed the request.
     */
    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_id');
    }

    /**
     * Booking ledger transaction generated upon approval.
     */
    public function bookingTransaction(): BelongsTo
    {
        return $this->belongsTo(BookingTransaction::class, 'booking_transaction_id');
    }
}
