<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'booking_reference',
    'secure_token',
    'clinic_id',
    'doctor_id',
    'patient_id',
    'patient_name',
    'patient_phone',
    'patient_mrn',
    'patient_national_id',
    'booking_center_id',
    'created_by_id',
    'creator_type',
    'appointment_date',
    'time_slot',
    'status',
    'rescheduled_from_id',
    'notes',
    'confirmed_at',
    'confirmed_by_id',
    'checked_in_at',
    'checked_in_by_id',
])]
class Appointment extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    public const OCCUPYING_STATUSES = ['pending', 'confirmed', 'attended', 'no_show'];
    public const NON_OCCUPYING_STATUSES = ['cancelled', 'rejected', 'expired', 'rescheduled'];

    protected function casts(): array
    {
        return [
            'appointment_date' => 'date:Y-m-d',
            'confirmed_at' => 'datetime',
            'checked_in_at' => 'datetime',
        ];
    }

    /**
     * Clinic where appointment takes place.
     */
    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class, 'clinic_id');
    }

    /**
     * Doctor for the appointment.
     */
    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }

    /**
     * Patient associated with this appointment.
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    /**
     * Clinical visit conducted for this appointment.
     */
    public function clinicalVisit(): HasOne
    {
        return $this->hasOne(ClinicalVisit::class, 'appointment_id');
    }

    /**
     * Booking center if booked institutionally.
     */
    public function bookingCenter(): BelongsTo
    {
        return $this->belongsTo(BookingCenter::class, 'booking_center_id');
    }

    /**
     * User who created the appointment.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * User who confirmed the appointment.
     */
    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by_id');
    }

    /**
     * User who performed the check-in scan.
     */
    public function checkedInBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_in_by_id');
    }

    /**
     * Appointment this was rescheduled from.
     */
    public function rescheduledFrom(): BelongsTo
    {
        return $this->belongsTo(Appointment::class, 'rescheduled_from_id');
    }

    /**
     * History of status changes.
     */
    public function statusHistory(): HasMany
    {
        return $this->hasMany(AppointmentStatusHistory::class, 'appointment_id')->orderBy('created_at', 'desc');
    }

    /**
     * Associated quota transaction.
     */
    public function transaction(): HasOne
    {
        return $this->hasOne(BookingTransaction::class, 'appointment_id');
    }

    /**
     * Scope to filter appointments occupying capacity.
     */
    public function scopeOccupyingCapacity(Builder $query): Builder
    {
        return $query->whereIn('status', self::OCCUPYING_STATUSES);
    }
}
