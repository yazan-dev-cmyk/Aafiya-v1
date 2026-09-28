<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'diagnostic_order_id',
    'modality',
    'study_instance_uid',
    'image_urls_json',
    'findings',
    'impression',
    'recommendations',
    'status',
    'reported_by_id',
    'reported_at',
])]
class RadiologyReport extends Model
{
    use HasFactory, HasUuids;

    protected function casts(): array
    {
        return [
            'image_urls_json' => 'array',
            'reported_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(DiagnosticOrder::class, 'diagnostic_order_id');
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by_id');
    }

    public function isFinalized(): bool
    {
        return $this->status === 'finalized';
    }
}
