<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DiagnosticCenter extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'user_id',
        'name',
        'type',
        'license_number',
        'phone',
        'email',
        'address',
        'wilaya',
        'wilaya_id',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Authoritative Wilaya relationship.
     */
    public function wilaya(): BelongsTo
    {
        return $this->belongsTo(Wilaya::class, 'wilaya_id');
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function staff(): HasMany
    {
        return $this->hasMany(DiagnosticStaff::class, 'diagnostic_center_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(DiagnosticOrder::class, 'diagnostic_center_id');
    }
}
