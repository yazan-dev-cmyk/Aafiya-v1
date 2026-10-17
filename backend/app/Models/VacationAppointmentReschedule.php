<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VacationAppointmentReschedule extends Model
{
    use HasFactory, HasUuids;

    public const STATUS_RESCHEDULED = 'rescheduled';
    public const STATUS_URGENT_UNRESOLVED = 'urgent_unresolved';
    public const STATUS_MANUAL_PENDING = 'manual_pending';
    public const STATUS_RESTORED = 'restored';

    public const VALID_STATUSES = [
        self::STATUS_RESCHEDULED,
        self::STATUS_URGENT_UNRESOLVED,
        self::STATUS_MANUAL_PENDING,
        self::STATUS_RESTORED,
    ];

    protected $table = 'vacation_appointment_reschedules';

    protected $fillable = [
        'id',
        'doctor_vacation_id',
        'original_appointment_id',
        'replacement_appointment_id',
        'clinic_id',
        'status',
        'failure_reason',
        'resolved_at',
        'resolved_by_id',
    ];

    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
        ];
    }

    public function vacation(): BelongsTo
    {
        return $this->belongsTo(DoctorVacation::class, 'doctor_vacation_id');
    }

    public function originalAppointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class, 'original_appointment_id');
    }

    public function replacementAppointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class, 'replacement_appointment_id');
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class, 'clinic_id');
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by_id');
    }
}
