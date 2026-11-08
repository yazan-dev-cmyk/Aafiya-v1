<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssistantPayoutProfile extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'assistant_payout_profiles';

    protected $fillable = [
        'id',
        'assistant_id',
        'version',
        'rip_number',
        'cheque_image_path',
        'status',
        'verified_by_id',
        'verified_at',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'verified_at' => 'datetime',
        ];
    }

    public function assistant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assistant_id');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by_id');
    }

    public function batchItems(): HasMany
    {
        return $this->hasMany(AssistantPayoutBatchItem::class, 'payout_profile_id');
    }
}