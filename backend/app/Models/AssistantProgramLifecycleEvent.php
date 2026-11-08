<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssistantProgramLifecycleEvent extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'assistant_program_lifecycle_events';

    protected $fillable = [
        'state',
        'effective_at',
        'notice_deadline_at',
        'reason',
        'decision_reference',
        'authorized_by_id',
    ];

    protected $casts = [
        'effective_at' => 'datetime',
        'notice_deadline_at' => 'datetime',
    ];

    public function authorizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'authorized_by_id');
    }
}