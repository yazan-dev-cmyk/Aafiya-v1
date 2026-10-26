<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'user_id',
    'name',
    'commercial_register',
    'license_number',
    'phone',
    'email',
    'address',
    'wilaya',
    'wilaya_id',
    'commune_id',
    'latitude',
    'longitude',
    'google_maps_link',
    'quota_balance',
    'verification_status',
    'verified_at',
    'reviewed_by_id',
    'rejection_reason',
    'is_active',
])]
class BookingCenter extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    public const STATUS_PENDING = 'pending';
    public const STATUS_VERIFIED = 'verified';
    public const STATUS_REJECTED = 'rejected';

    public const VALID_STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_VERIFIED,
        self::STATUS_REJECTED,
    ];

    protected function casts(): array
    {
        return [
            'quota_balance' => 'integer',
            'is_active' => 'boolean',
            'verified_at' => 'datetime',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    /**
     * Get the Google Maps link (stored value, or dynamically generated from coordinates).
     */
    protected function googleMapsLink(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value ?: ($this->latitude !== null && $this->longitude !== null
                ? "https://maps.google.com/?q={$this->latitude},{$this->longitude}"
                : null)
        );
    }

    /**
     * Determine if the booking center is administratively verified AND operationally active.
     */
    public function isOperational(): bool
    {
        return $this->verification_status === self::STATUS_VERIFIED && (bool) $this->is_active;
    }

    /**
     * Authoritative Wilaya relationship.
     */
    public function wilaya(): BelongsTo
    {
        return $this->belongsTo(Wilaya::class, 'wilaya_id');
    }

    /**
     * Authoritative Commune relationship.
     */
    public function commune(): BelongsTo
    {
        return $this->belongsTo(Commune::class, 'commune_id');
    }

    /**
     * User account managing this booking center.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Platform administrative reviewer who processed the verification.
     */
    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_id');
    }

    /**
     * Appointments created through this booking center.
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'booking_center_id');
    }

    /**
     * Quota transactions ledger.
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(BookingTransaction::class, 'booking_center_id');
    }
}
