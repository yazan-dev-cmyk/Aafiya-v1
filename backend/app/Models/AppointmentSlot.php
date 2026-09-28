<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppointmentSlot extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'appointment_slots';

    protected $fillable = [
        'id',
        'clinic_id',
        'doctor_id',
        'appointment_date',
        'time_slot',
        'capacity',
        'booked_count',
    ];

    protected function casts(): array
    {
        return [
            'appointment_date' => 'date:Y-m-d',
            'capacity'         => 'integer',
            'booked_count'     => 'integer',
        ];
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class, 'clinic_id');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }

    public function getAvailableCapacityAttribute(): int
    {
        return max(0, $this->capacity - $this->booked_count);
    }

    public function getIsAvailableAttribute(): bool
    {
        return $this->getAvailableCapacityAttribute() > 0;
    }
}
