<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'user_id',
    'clinic_id',
    'doctor_id',
    'title',
    'content',
    'banner_image_url',
    'target_url',
    'placement',
    'target_role',
    'target_specialty',
    'target_wilaya',
    'target_wilaya_id',
    'is_welcome_offer',
    'status',
    'rejection_reason',
    'start_date',
    'end_date',
    'impressions_count',
    'clicks_count',
    'ticker_clicks_count',
    'starts_at',
    'ends_at',
    'priority',
])]
class Advertisement extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected static function booted(): void
    {
        static::creating(function (Advertisement $ad) {
            if (empty($ad->start_date)) {
                $ad->start_date = !empty($ad->starts_at)
                    ? \Illuminate\Support\Carbon::parse($ad->starts_at)->format('Y-m-d')
                    : now()->format('Y-m-d');
            }
            if (empty($ad->end_date)) {
                $ad->end_date = !empty($ad->ends_at)
                    ? \Illuminate\Support\Carbon::parse($ad->ends_at)->format('Y-m-d')
                    : now()->addYears(1)->format('Y-m-d');
            }
        });
    }

    protected function casts(): array
    {
        return [
            'is_welcome_offer' => 'boolean',
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'impressions_count' => 'integer',
            'clicks_count' => 'integer',
            'ticker_clicks_count' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'priority' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class, 'clinic_id');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }

    /**
     * Authoritative target Wilaya relationship.
     */
    public function targetWilaya(): BelongsTo
    {
        return $this->belongsTo(Wilaya::class, 'target_wilaya_id');
    }

    /**
     * Alias for targetWilaya relationship.
     */
    public function wilaya(): BelongsTo
    {
        return $this->targetWilaya();
    }

    public function placements(): HasMany
    {
        return $this->hasMany(AdvertisementPlacement::class, 'advertisement_id');
    }

    public function tickerClicks(): HasMany
    {
        return $this->hasMany(AdvertisementUserClick::class, 'advertisement_id');
    }

    public function isActive(): bool
    {
        $today = now()->format('Y-m-d');
        $start = $this->start_date ? $this->start_date->format('Y-m-d') : null;
        $end = $this->end_date ? $this->end_date->format('Y-m-d') : null;

        return $this->status === 'active'
            && ($start === null || $start <= $today)
            && ($end === null || $end >= $today);
    }

    public function isTickerActive(): bool
    {
        $now = now();
        $start = $this->starts_at;
        $end = $this->ends_at;

        return $this->status === 'active'
            && ($start === null || $start <= $now)
            && ($end === null || $end > $now);
    }
}
