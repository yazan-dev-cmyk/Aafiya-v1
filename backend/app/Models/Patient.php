<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'user_id',
    'mrn',
    'first_name',
    'last_name',
    'gender',
    'date_of_birth',
    'blood_group',
    'phone',
    'email',
    'national_id',
    'address',
    'wilaya',
    'wilaya_id',
    'is_active',
])]
class Patient extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date:Y-m-d',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Authoritative Wilaya relationship.
     */
    public function wilaya(): BelongsTo
    {
        return $this->belongsTo(Wilaya::class, 'wilaya_id');
    }

    /**
     * User account if patient is a registered user.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Emergency contacts.
     */
    public function emergencyContacts(): HasMany
    {
        return $this->hasMany(EmergencyContact::class, 'patient_id');
    }

    /**
     * Documented allergies.
     */
    public function allergies(): HasMany
    {
        return $this->hasMany(PatientAllergy::class, 'patient_id');
    }

    /**
     * Documented chronic conditions.
     */
    public function chronicConditions(): HasMany
    {
        return $this->hasMany(PatientChronicCondition::class, 'patient_id');
    }

    /**
     * Current medications.
     */
    public function currentMedications(): HasMany
    {
        return $this->hasMany(PatientCurrentMedication::class, 'patient_id');
    }

    /**
     * Clinical visits history.
     */
    public function clinicalVisits(): HasMany
    {
        return $this->hasMany(ClinicalVisit::class, 'patient_id')->orderBy('visit_date', 'desc');
    }

    /**
     * Scheduled appointments.
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'patient_id');
    }

    /**
     * Prescriptions issued to this patient.
     */
    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class, 'patient_id')->orderBy('issue_date', 'desc');
    }

    /**
     * Diagnostic orders issued for this patient.
     */
    public function diagnosticOrders(): HasMany
    {
        return $this->hasMany(DiagnosticOrder::class, 'patient_id')->orderBy('ordered_at', 'desc');
    }

    /**
     * Audit logs of clinical access to this patient's records.
     */
    public function clinicalAccessLogs(): HasMany
    {
        return $this->hasMany(ClinicalAccessLog::class, 'patient_id')->orderBy('created_at', 'desc');
    }

    /**
     * Full name attribute.
     */
    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
