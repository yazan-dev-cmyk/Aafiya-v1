<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Doctor extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'doctors';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'specialty',
        'specialty_id',
        'license_number',
        'bio',
        'is_verified',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'specialty_id' => 'integer',
            'is_verified' => 'boolean',
        ];
    }

    /**
     * The medical specialty assigned to this doctor.
     */
    public function medicalSpecialty(): BelongsTo
    {
        return $this->belongsTo(MedicalSpecialty::class, 'specialty_id');
    }

    /**
     * The underlying user account.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * The clinics where the doctor is affiliated.
     */
    public function clinics(): BelongsToMany
    {
        return $this->belongsToMany(Clinic::class, 'doctor_clinic', 'doctor_id', 'clinic_id')
            ->withPivot(['id', 'position', 'is_primary', 'is_active', 'joined_at'])
            ->withTimestamps();
    }

    /**
     * The clinics where this doctor is the official Director.
     */
    public function directedClinics(): HasMany
    {
        return $this->hasMany(Clinic::class, 'director_doctor_id');
    }

    /**
     * Get the doctor's position in a specific clinic.
     */
    public function getPositionInClinic(string $clinicId): ?string
    {
        $pivot = $this->clinics()->where('clinics.id', $clinicId)->first()?->pivot;

        return $pivot?->position;
    }

    /**
     * Check if doctor is active in a specific clinic.
     */
    public function isDoctorActiveInClinic(string $clinicId): bool
    {
        $pivot = $this->clinics()->where('clinics.id', $clinicId)->first()?->pivot;

        return (bool) ($pivot?->is_active ?? false);
    }

    /**
     * Check if doctor is director in a specific clinic.
     */
    public function isDirectorOf(string $clinicId): bool
    {
        return $this->getPositionInClinic($clinicId) === 'director';
    }

    /**
     * Appointments assigned to this doctor.
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'doctor_id');
    }

    /**
     * Clinical visits conducted by this doctor.
     */
    public function clinicalVisits(): HasMany
    {
        return $this->hasMany(ClinicalVisit::class, 'doctor_id')->orderBy('visit_date', 'desc');
    }

    /**
     * Prescriptions authored by this doctor.
     */
    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class, 'doctor_id')->orderBy('issue_date', 'desc');
    }

    /**
     * Prescription templates created by this doctor.
     */
    public function prescriptionTemplates(): HasMany
    {
        return $this->hasMany(PrescriptionTemplate::class, 'doctor_id');
    }

    /**
     * Diagnostic orders issued by this doctor.
     */
    public function diagnosticOrders(): HasMany
    {
        return $this->hasMany(DiagnosticOrder::class, 'doctor_id')->orderBy('ordered_at', 'desc');
    }

    /**
     * Advertisements created for this doctor.
     */
    public function advertisements(): HasMany
    {
        return $this->hasMany(Advertisement::class, 'doctor_id');
    }

    /**
     * Invitations received by this doctor from clinics.
     */
    public function clinicInvitations(): HasMany
    {
        return $this->hasMany(ClinicDoctorInvitation::class, 'doctor_id');
    }
}
