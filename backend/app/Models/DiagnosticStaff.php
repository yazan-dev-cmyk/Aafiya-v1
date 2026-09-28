<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DiagnosticStaff extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'diagnostic_center_id',
        'user_id',
        'role_type',
        'permissions_json',
        'is_active',
        'created_by_id',
    ];

    protected function casts(): array
    {
        return [
            'permissions_json' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function center(): BelongsTo
    {
        return $this->belongsTo(DiagnosticCenter::class, 'diagnostic_center_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * Get the effective delegated permissions array.
     *
     * @return array<string>
     */
    public function getDelegatedPermissions(): array
    {
        if ($this->permissions_json !== null) {
            return $this->permissions_json;
        }

        if ($this->center?->type === 'radiology' || ($this->user && $this->user->hasRole('rad_assistant'))) {
            return [
                'radiology.manage_orders',
                'radiology.upload_images',
            ];
        }

        return [
            'lab.manage_orders',
            'lab.enter_results',
        ];
    }
}
