<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DoctorVacation extends Model
{
    use HasFactory, HasUuids;

    public const STATUS_EFFECTIVE = 'effective';
    public const STATUS_CANCELLED = 'cancelled';

    protected $table = 'doctor_vacations';

    protected $fillable = [
        'doctor_id',
        'vacation_start',
        'vacation_end',
        'status',
        'reason',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'vacation_start' => 'date:Y-m-d',
            'vacation_end'   => 'date:Y-m-d',
        ];
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }

    public function vacationClinics(): HasMany
    {
        return $this->hasMany(DoctorVacationClinic::class, 'doctor_vacation_id');
    }

    public function isEffective(): bool
    {
        return $this->status === self::STATUS_EFFECTIVE;
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }
}
