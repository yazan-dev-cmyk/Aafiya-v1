<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'order_reference',
    'secure_token',
    'patient_id',
    'doctor_id',
    'clinic_id',
    'clinical_visit_id',
    'diagnostic_center_id',
    'order_type',
    'clinical_indication',
    'priority',
    'status',
    'ordered_at',
])]
class DiagnosticOrder extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected static function booted(): void
    {
        static::creating(function (DiagnosticOrder $order) {
            if (empty($order->secure_token)) {
                $order->secure_token = \Illuminate\Support\Str::random(64);
            }
        });
    }

    protected function casts(): array
    {
        return [
            'ordered_at' => 'datetime',
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

    public function clinicalVisit(): BelongsTo
    {
        return $this->belongsTo(ClinicalVisit::class, 'clinical_visit_id');
    }

    public function diagnosticCenter(): BelongsTo
    {
        return $this->belongsTo(DiagnosticCenter::class, 'diagnostic_center_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(DiagnosticOrderItem::class, 'diagnostic_order_id');
    }

    public function samples(): HasMany
    {
        return $this->hasMany(LaboratorySample::class, 'diagnostic_order_id');
    }

    public function radiologyReport(): HasOne
    {
        return $this->hasOne(RadiologyReport::class, 'diagnostic_order_id');
    }

    public function isFinalized(): bool
    {
        return $this->status === 'finalized';
    }
}
