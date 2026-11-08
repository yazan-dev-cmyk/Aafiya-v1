<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssistantRewardBalance extends Model
{
    use HasFactory;

    protected $table = 'assistant_reward_balances';
    protected $primaryKey = 'assistant_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'assistant_id',
        'current_balance',
        'total_earned',
        'total_reversed',
        'total_deducted',
        'total_paid',
        'total_relieved',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'current_balance' => 'decimal:2',
            'total_earned' => 'decimal:2',
            'total_reversed' => 'decimal:2',
            'total_deducted' => 'decimal:2',
            'total_paid' => 'decimal:2',
            'total_relieved' => 'decimal:2',
            'version' => 'integer',
        ];
    }

    public function assistant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assistant_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(AssistantRewardTransaction::class, 'assistant_id', 'assistant_id');
    }

    public function unabsorbedDebts(): HasMany
    {
        return $this->hasMany(AssistantUnabsorbedDebt::class, 'assistant_id', 'assistant_id');
    }
}
