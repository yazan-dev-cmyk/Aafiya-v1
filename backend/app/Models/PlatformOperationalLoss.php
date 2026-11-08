<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use RuntimeException;

class PlatformOperationalLoss extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'platform_operational_losses';
    public $timestamps = false;

    protected $fillable = [
        'id',
        'assistant_id',
        'appointment_id',
        'loss_category',
        'amount',
        'currency',
        'reason',
        'metadata',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public static function boot(): void
    {
        parent::boot();

        static::updating(function () {
            throw new RuntimeException('PlatformOperationalLoss records are strictly immutable and cannot be updated.');
        });

        static::deleting(function () {
            throw new RuntimeException('PlatformOperationalLoss records are strictly immutable and cannot be deleted.');
        });
    }

    public function assistant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assistant_id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class, 'appointment_id');
    }
}