<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssistantReward extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'assistant_rewards';

    protected $fillable = [
        'id',
        'appointment_id',
        'assistant_id',
        'clinic_id',
        'clinic_assistant_id',
        'amount',
        'rate_schedule_id',
        'confirmed_at',
        'earning_period',
        'settlement_status',
        'paid_amount_dzd',
        'offset_amount_dzd',
        'cancellation_status',
        'payout_batch_item_id',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_amount_dzd' => 'decimal:2',
            'offset_amount_dzd' => 'decimal:2',
            'confirmed_at' => 'datetime',
        ];
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class, 'appointment_id');
    }

    public function assistant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assistant_id');
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class, 'clinic_id');
    }

    public function clinicAssistant(): BelongsTo
    {
        return $this->belongsTo(ClinicAssistant::class, 'clinic_assistant_id');
    }

    public function payoutBatchItem(): BelongsTo
    {
        return $this->belongsTo(AssistantPayoutBatchItem::class, 'payout_batch_item_id');
    }

    public function rateSchedule(): BelongsTo
    {
        return $this->belongsTo(AssistantRewardRateSchedule::class, 'rate_schedule_id');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(AssistantRewardAllocation::class, 'reward_id');
    }

    public function getOutstandingAmountAttribute(): float
    {
        $amount = (float) $this->amount;
        $paid = (float) ($this->paid_amount_dzd ?? 0.00);
        $offset = (float) ($this->offset_amount_dzd ?? 0.00);

        return max(0.00, round($amount - $paid - $offset, 2));
    }
}