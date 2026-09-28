<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'diagnostic_order_id',
    'sample_barcode',
    'sample_type',
    'collected_at',
    'collected_by_id',
    'received_at',
    'received_by_id',
    'status',
    'rejection_reason',
])]
class LaboratorySample extends Model
{
    use HasFactory, HasUuids;

    protected function casts(): array
    {
        return [
            'collected_at' => 'datetime',
            'received_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(DiagnosticOrder::class, 'diagnostic_order_id');
    }

    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collected_by_id');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by_id');
    }
}
