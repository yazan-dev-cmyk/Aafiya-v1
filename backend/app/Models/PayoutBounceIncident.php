<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayoutBounceIncident extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'payout_bounce_incidents';

    protected $fillable = [
        'id',
        'batch_item_id',
        'batch_id',
        'assistant_id',
        'transaction_id',
        'returned_amount_dzd',
        'currency',
        'incident_status',
        'postal_reference',
        'return_reason',
        'idempotency_key',
        'payload_hash',
        'verified_by_id',
        'verified_at',
    ];

    protected function casts(): array
    {
        return [
            'returned_amount_dzd' => 'decimal:2',
            'verified_at' => 'datetime',
        ];
    }

    public function getReturnedAmountAttribute(): float
    {
        return (float) $this->returned_amount_dzd;
    }

    public function batchItem(): BelongsTo
    {
        return $this->belongsTo(AssistantPayoutBatchItem::class, 'batch_item_id');
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(AssistantPayoutBatch::class, 'batch_id');
    }

    public function assistant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assistant_id');
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(AssistantRewardTransaction::class, 'transaction_id');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by_id');
    }
}
