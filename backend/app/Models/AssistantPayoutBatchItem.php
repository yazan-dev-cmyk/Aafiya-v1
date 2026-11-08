<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssistantPayoutBatchItem extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'assistant_payout_batch_items';

    protected $fillable = [
        'id',
        'batch_id',
        'assistant_id',
        'payout_profile_id',
        'amount',
        'gross_amount',
        'debt_offset_amount',
        'net_amount',
        'returned_amount',
        'return_count',
        'status',
        'settlement_category',
        'rejection_reason',
        'transfer_reference',
        'transferred_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'gross_amount' => 'decimal:2',
            'debt_offset_amount' => 'decimal:2',
            'net_amount' => 'decimal:2',
            'returned_amount' => 'decimal:2',
            'return_count' => 'integer',
            'transferred_at' => 'datetime',
        ];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(AssistantPayoutBatch::class, 'batch_id');
    }

    public function assistant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assistant_id');
    }

    public function payoutProfile(): BelongsTo
    {
        return $this->belongsTo(AssistantPayoutProfile::class, 'payout_profile_id');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(AssistantRewardAllocation::class, 'batch_item_id');
    }

    public function bounceIncidents(): HasMany
    {
        return $this->hasMany(PayoutBounceIncident::class, 'batch_item_id');
    }

    public function getRemainingRefundableAmountAttribute(): float
    {
        $net = (float) ($this->net_amount > 0 ? $this->net_amount : $this->amount);
        $returned = (float) ($this->returned_amount ?? 0.00);
        return max(0.00, round($net - $returned, 2));
    }
}

