<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorVacationClinic extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'doctor_vacation_clinics';

    protected $fillable = [
        'doctor_vacation_id',
        'clinic_id',
    ];

    public function vacation(): BelongsTo
    {
        return $this->belongsTo(DoctorVacation::class, 'doctor_vacation_id');
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class, 'clinic_id');
    }
}
