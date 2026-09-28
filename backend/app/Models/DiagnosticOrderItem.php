<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'diagnostic_order_id',
    'test_name',
    'test_code',
    'status',
    'result_value',
    'reference_range',
    'unit',
    'interpretation',
    'notes',
])]
class DiagnosticOrderItem extends Model
{
    use HasFactory, HasUuids;

    public function order(): BelongsTo
    {
        return $this->belongsTo(DiagnosticOrder::class, 'diagnostic_order_id');
    }

    public function isFinalized(): bool
    {
        return $this->status === 'finalized';
    }
}
