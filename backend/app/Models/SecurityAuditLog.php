<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use RuntimeException;

class SecurityAuditLog extends Model
{
    use HasFactory, HasUuids;

    public const UPDATED_AT = null;

    protected $fillable = [
        'actor_id',
        'actor_role',
        'actor_position',
        'event_category',
        'action',
        'resource_type',
        'resource_id',
        'access_reason',
        'ip_address',
        'user_agent',
        'request_id',
        'details',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'details' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Enforce immutable append-only invariant at Eloquent lifecycle.
     */
    protected static function booted(): void
    {
        static::updating(function () {
            throw new RuntimeException('سجلات الأمان الإدارية غير قابلة للتعديل نهائياً (Security Audit Logs are Immutable & Append-Only).');
        });

        static::deleting(function () {
            throw new RuntimeException('يحظر حذف سجلات الأمان الإدارية نهائياً (Security Audit Logs cannot be deleted).');
        });
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
