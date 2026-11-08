<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use RuntimeException;

class AssistantRewardTransaction extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'assistant_reward_transactions';
    public $timestamps = false;

    protected $fillable = [
        'id',
        'assistant_id',
        'transaction_type',
        'direction',
        'amount',
        'balance_before',
        'balance_after',
        'reference_type',
        'reference_id',
        'idempotency_key',
        'notes',
        'created_by',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'balance_before' => 'decimal:2',
            'balance_after' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    public static function boot(): void
    {
        parent::boot();

        static::updating(function () {
            throw new RuntimeException('AssistantRewardTransaction records are strictly immutable and cannot be updated.');
        });

        static::deleting(function () {
            throw new RuntimeException('AssistantRewardTransaction records are strictly immutable and cannot be deleted.');
        });
    }

    public function assistant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assistant_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}