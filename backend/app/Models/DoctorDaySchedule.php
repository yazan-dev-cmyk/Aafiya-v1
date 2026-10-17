<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DoctorDaySchedule extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'doctor_day_schedules';

    protected $fillable = [
        'clinic_id',
        'doctor_id',
        'day_of_week',
        'is_closed',
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'is_closed' => 'boolean',
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

    public function slots(): HasMany
    {
        return $this->hasMany(DoctorWorkingSlot::class, 'doctor_day_schedule_id');
    }
}
