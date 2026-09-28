<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use RuntimeException;

#[Fillable([
    'actor_id',
    'actor_role',
    'actor_position',
    'patient_id',
    'resource_type',
    'resource_id',
    'action',
    'access_reason',
    'ip_address',
    'user_agent',
    'request_id',
    'created_at',
])]
class ClinicalAccessLog extends Model
{
    use HasFactory, HasUuids;

    // Append-only log: no updated_at column
    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    /**
     * Enforce immutable append-only invariant at the Eloquent model lifecycle.
     */
    protected static function booted(): void
    {
        static::updating(function () {
            throw new RuntimeException('سجلات الرقابة الطبية غير قابلة للتعديل نهائياً (Clinical Access Logs are Append-Only & Immutable).');
        });

        static::deleting(function () {
            throw new RuntimeException('يحظر حذف سجلات الرقابة الطبية نهائياً (Clinical Access Logs cannot be deleted).');
        });
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }
}
