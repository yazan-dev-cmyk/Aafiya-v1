<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'patient_id',
    'medication_name',
    'dosage',
    'frequency',
    'start_date',
    'prescribed_by',
    'is_active',
    'notes',
])]
class PatientCurrentMedication extends Model
{
    use HasFactory, HasUuids;

    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'is_active' => 'boolean',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }
}
