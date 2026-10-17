<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorWorkingSlot extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'doctor_working_slots';

    protected $fillable = [
        'doctor_day_schedule_id',
        'time_slot',
    ];

    public function daySchedule(): BelongsTo
    {
        return $this->belongsTo(DoctorDaySchedule::class, 'doctor_day_schedule_id');
    }
}
