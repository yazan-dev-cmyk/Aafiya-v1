<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
])]
class Advertisement extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected function casts(): array
    {
        return [
            'is_welcome_offer' => 'boolean',
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'impressions_count' => 'integer',
            'clicks_count' => 'integer',
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

    public function isActive(): bool
    {
        $today = now()->format('Y-m-d');
        $start = $this->start_date ? $this->start_date->format('Y-m-d') : null;
        $end = $this->end_date ? $this->end_date->format('Y-m-d') : null;

        return $this->status === 'active'
            && ($start === null || $start <= $today)
            && ($end === null || $end >= $today);
    }
}
