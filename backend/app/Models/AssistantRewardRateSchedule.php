<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssistantRewardRateSchedule extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'assistant_reward_rate_schedules';

    protected $fillable = [
        'rate_amount',
        'currency',
        'effective_from',
        'status',
        'decision_reference',
        'notes',
        'created_by_id',
        'cancelled_by_id',
        'cancelled_at',
        'cancellation_reason',
    ];

    protected $casts = [
        'rate_amount' => 'decimal:2',
        'effective_from' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by_id');
    }

    public function rewards(): HasMany
    {
        return $this->hasMany(AssistantReward::class, 'rate_schedule_id');
    }
}