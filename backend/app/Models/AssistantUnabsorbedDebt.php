<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssistantUnabsorbedDebt extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'assistant_unabsorbed_debts';

    protected $fillable = [
        'id',
        'assistant_id',
        'transaction_id',
        'initial_debt_dzd',
        'settled_offset_dzd',
        'remaining_debt_dzd',
        'debt_status',
        'genesis_reason',
    ];

    protected function casts(): array
    {
        return [
            'initial_debt_dzd' => 'decimal:2',
            'settled_offset_dzd' => 'decimal:2',
            'remaining_debt_dzd' => 'decimal:2',
        ];
    }

    public function assistant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assistant_id');
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(AssistantRewardTransaction::class, 'transaction_id');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(AssistantRewardAllocation::class, 'debt_id');
    }
}
