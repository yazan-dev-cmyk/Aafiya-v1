<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class DoctorClinic extends Pivot
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'doctor_clinic';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = true;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'doctor_id',
        'clinic_id',
        'position',
        'is_primary',
        'is_active',
        'max_patients_per_slot',
        'is_working_hours_activated',
        'working_hours_activated_at',
        'schedule_version',
        'joined_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'is_active' => 'boolean',
            'is_working_hours_activated' => 'boolean',
            'working_hours_activated_at' => 'datetime',
            'schedule_version' => 'integer',
            'max_patients_per_slot' => 'integer',
            'joined_at' => 'datetime',
        ];
    }

    /**
     * The associated Doctor.
     */
    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }

    /**
     * The associated Clinic.
     */
    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class, 'clinic_id');
    }
}
