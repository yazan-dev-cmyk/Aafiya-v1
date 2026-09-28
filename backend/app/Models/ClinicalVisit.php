<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'visit_reference',
    'patient_id',
    'doctor_id',
    'clinic_id',
    'appointment_id',
    'visit_date',
    'chief_complaint',
    'vital_signs_json',
    'physical_examination',
    'diagnosis',
    'clinical_notes',
    'status',
    'finalized_at',
    'finalized_by_id',
])]
class ClinicalVisit extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected function casts(): array
    {
        return [
            'visit_date' => 'date:Y-m-d',
            'vital_signs_json' => 'array',
            'finalized_at' => 'datetime',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class, 'clinic_id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class, 'appointment_id');
    }

    public function finalizedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalized_by_id');
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class, 'clinical_visit_id');
    }

    public function diagnosticOrders(): HasMany
    {
        return $this->hasMany(DiagnosticOrder::class, 'clinical_visit_id');
    }

    public function isFinalized(): bool
    {
        return $this->status === 'finalized';
    }
}
