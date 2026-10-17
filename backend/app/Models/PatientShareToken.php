<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'patient_id',
    'token_hash',
    'scope',
    'pin_hash',
    'status',
    'failed_attempts',
    'max_attempts',
    'locked_until',
    'access_count',
    'last_accessed_at',
    'expires_at',
    'revoked_at',
    'revoked_by_id',
])]
class PatientShareToken extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'patient_share_tokens';

    protected function casts(): array
    {
        return [
            'failed_attempts' => 'integer',
            'max_attempts' => 'integer',
            'access_count' => 'integer',
            'locked_until' => 'datetime',
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
            'last_accessed_at' => 'datetime',
        ];
    }

    protected $hidden = [
        'pin_hash',
        'token_hash',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function revokedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by_id');
    }

    public function isRevoked(): bool
    {
        return $this->status === 'revoked' || $this->revoked_at !== null;
    }

    public function isExpired(): bool
    {
        return now()->isAfter($this->expires_at);
    }

    public function isLocked(): bool
    {
        return $this->locked_until !== null && now()->isBefore($this->locked_until);
    }

    public function isActive(): bool
    {
        return ! $this->isRevoked() && ! $this->isExpired() && ! $this->isLocked();
    }
}
