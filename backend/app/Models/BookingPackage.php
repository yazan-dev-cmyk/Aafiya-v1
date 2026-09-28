<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'package_code',
    'quota_units',
    'price_dzd',
    'description',
    'is_active',
])]
class BookingPackage extends Model
{
    use HasFactory, HasUuids;

    protected function casts(): array
    {
        return [
            'quota_units' => 'integer',
            'price_dzd' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Transactions that purchased this package.
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(BookingTransaction::class, 'booking_package_id');
    }
}
