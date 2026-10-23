<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use RuntimeException;

class UserConsent extends Model
{
    use HasFactory, HasUuids;

    // Append-only log: no updated_at column
    public const UPDATED_AT = null;

    protected $table = 'user_consents';

    protected $fillable = [
        'user_id',
        'subject_id',
        'consent_type',
        'document_version',
        'is_granted',
        'ip_address',
        'user_agent',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'is_granted' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Enforce immutable append-only invariant at Eloquent lifecycle.
     */
    protected static function booted(): void
    {
        static::updating(function () {
            throw new RuntimeException('سجلات الموافقة والامتثال غير قابلة للتعديل نهائياً (User Consents are Immutable & Append-Only).');
        });

        static::deleting(function () {
            throw new RuntimeException('يحظر حذف سجلات الموافقة والامتثال نهائياً لضمان حجية الإثبات (User Consents cannot be deleted).');
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
