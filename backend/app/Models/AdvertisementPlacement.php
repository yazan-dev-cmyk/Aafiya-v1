<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdvertisementPlacement extends Model
{
    use HasFactory, HasUuids;

    public const DESTINATIONS = [
        'ticker',
        'home_banner',
        'sidebar',
        'search_top',
        'category_sponsor',
    ];

    public const AUDIENCES = [
        'public',
        'patient',
        'doctor',
        'doctor_assistant',
        'booking_center',
        'lab',
        'lab_assistant',
        'radiology',
        'rad_assistant',
        'all',
    ];

    protected $fillable = [
        'advertisement_id',
        'destination',
        'audience',
    ];

    public function advertisement(): BelongsTo
    {
        return $this->belongsTo(Advertisement::class, 'advertisement_id');
    }
}
