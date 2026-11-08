<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssistantRewardAllocation extends Model
{
    use HasFactory, HasUuids;

    public $timestamps = false;

    protected $table = 'assistant_reward_allocations';

    protected $fillable = [
        'id',
        'reward_id',
        'batch_item_id',
        'debt_id',
        'debt_transaction_id',
        'allocation_type',
        'amount',
        'idempotency_key',
        'actor_id',
        'system_actor',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    public function reward(): BelongsTo
    {
        return $this->belongsTo(AssistantReward::class, 'reward_id');
    }

    public function batchItem(): BelongsTo
    {
        return $this->belongsTo(AssistantPayoutBatchItem::class, 'batch_item_id');
    }

    public function debt(): BelongsTo
    {
        return $this->belongsTo(AssistantUnabsorbedDebt::class, 'debt_id');
    }

    public function debtTransaction(): BelongsTo
    {
        return $this->belongsTo(AssistantRewardTransaction::class, 'debt_transaction_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
