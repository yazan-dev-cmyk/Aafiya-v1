<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Clinic extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'clinics';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'address',
        'wilaya',
        'wilaya_id',
        'phone',
        'director_doctor_id',
        'max_patients_per_slot',
        'slot_duration_min',
        'is_active',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'max_patients_per_slot' => 'integer',
            'slot_duration_min' => 'integer',
        ];
    }

    /**
     * The authoritative Wilaya of the clinic.
     */
    public function wilaya(): BelongsTo
    {
        return $this->belongsTo(Wilaya::class, 'wilaya_id');
    }

    /**
     * The official Director Doctor of the clinic.
     */
    public function director(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'director_doctor_id');
    }

    /**
     * All affiliated doctors (both director and employed).
     */
    public function doctors(): BelongsToMany
    {
        return $this->belongsToMany(Doctor::class, 'doctor_clinic', 'clinic_id', 'doctor_id')
            ->withPivot(['id', 'position', 'is_primary', 'is_active', 'joined_at'])
            ->withTimestamps();
    }

    /**
     * All assistants employed by this clinic.
     */
    public function assistants(): HasMany
    {
        return $this->hasMany(ClinicAssistant::class, 'clinic_id');
    }

    /**
     * Appointments scheduled at this clinic.
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'clinic_id');
    }

    /**
     * Clinical visits held at this clinic.
     */
    public function clinicalVisits(): HasMany
    {
        return $this->hasMany(ClinicalVisit::class, 'clinic_id')->orderBy('visit_date', 'desc');
    }

    /**
     * Prescriptions issued at this clinic.
     */
    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class, 'clinic_id')->orderBy('issue_date', 'desc');
    }

    /**
     * Diagnostic orders issued from this clinic.
     */
    public function diagnosticOrders(): HasMany
    {
        return $this->hasMany(DiagnosticOrder::class, 'clinic_id')->orderBy('ordered_at', 'desc');
    }

    /**
     * Advertisements sponsored by this clinic.
     */
    public function advertisements(): HasMany
    {
        return $this->hasMany(Advertisement::class, 'clinic_id');
    }

    /**
     * Invitations sent by this clinic to doctors.
     */
    public function doctorInvitations(): HasMany
    {
        return $this->hasMany(ClinicDoctorInvitation::class, 'clinic_id');
    }
}
