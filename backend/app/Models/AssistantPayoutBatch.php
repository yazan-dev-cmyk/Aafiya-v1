<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssistantPayoutBatch extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'assistant_payout_batches';

    protected $fillable = [
        'id',
        'batch_number',
        'period_start',
        'period_end',
        'payout_cycle',
        'status',
        'applied_threshold_dzd',
        'total_recipients',
        'total_amount',
        'generated_by_id',
        'confirmed_by_id',
        'confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'applied_threshold_dzd' => 'decimal:2',
            'total_recipients' => 'integer',
            'total_amount' => 'decimal:2',
            'confirmed_at' => 'datetime',
        ];
    }

    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by_id');
    }

    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(AssistantPayoutBatchItem::class, 'batch_id');
    }
}
