<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'booking_center_id',
    'appointment_id',
    'booking_package_id',
    'transaction_type',
    'units',
    'balance_after',
    'reference_note',
    'created_by_id',
])]
class BookingTransaction extends Model
{
    use HasFactory, HasUuids;

    protected function casts(): array
    {
        return [
            'units' => 'integer',
            'balance_after' => 'integer',
        ];
    }

    /**
     * Booking center owning this transaction.
     */
    public function bookingCenter(): BelongsTo
    {
        return $this->belongsTo(BookingCenter::class, 'booking_center_id');
    }

    /**
     * Appointment linked to this transaction if confirmation/refund.
     */
    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class, 'appointment_id');
    }

    /**
     * Package linked to this transaction if purchase.
     */
    public function package(): BelongsTo
    {
        return $this->belongsTo(BookingPackage::class, 'booking_package_id');
    }

    /**
     * User who triggered this transaction.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}
