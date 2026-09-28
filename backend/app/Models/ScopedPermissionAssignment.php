<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScopedPermissionAssignment extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'scoped_permission_assignments';

    protected $fillable = [
        'user_id',
        'permission_id',
        'scope_type',
        'scope_id',
        'granted_by_id',
        'is_active',
        'revoked_by_id',
        'revoked_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'revoked_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function permission(): BelongsTo
    {
        return $this->belongsTo(Permission::class, 'permission_id');
    }

    public function grantedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'granted_by_id');
    }

    public function revokedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by_id');
    }

    /**
     * Scope query to only active permission assignments.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope query for a specific user and operational scope.
     */
    public function scopeForUserAndScope(Builder $query, string $userId, string $scopeType, string $scopeId): Builder
    {
        return $query->where('user_id', $userId)
            ->where('scope_type', $scopeType)
            ->where('scope_id', $scopeId);
    }
}
