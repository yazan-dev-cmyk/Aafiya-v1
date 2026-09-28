<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'appointment_id',
    'from_status',
    'to_status',
    'changed_by_id',
    'reason',
])]
class AppointmentStatusHistory extends Model
{
    use HasFactory, HasUuids;

    public $timestamps = false;
    protected $table = 'appointment_status_history';

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    /**
     * Appointment for this history entry.
     */
    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class, 'appointment_id');
    }

    /**
     * User who changed the status.
     */
    public function changer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_id');
    }
}
