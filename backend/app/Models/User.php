<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Traits\Has4DAuthorization;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasUuids, SoftDeletes, Has4DAuthorization;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'is_active',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'is_active' => 'boolean',
            'password' => 'hashed',
        ];
    }

    /**
     * Associated Doctor clinical profile.
     */
    public function doctor(): HasOne
    {
        return $this->hasOne(Doctor::class, 'user_id');
    }

    /**
     * Associated Clinic Assistant profile.
     */
    public function clinicAssistant(): HasOne
    {
        return $this->hasOne(ClinicAssistant::class, 'user_id');
    }

    /**
     * Scoped permission assignments for fine-grained delegation.
     */
    public function scopedPermissions(): HasMany
    {
        return $this->hasMany(ScopedPermissionAssignment::class, 'user_id');
    }

    /**
     * Associated Booking Center profile.
     */
    public function bookingCenter(): HasOne
    {
        return $this->hasOne(BookingCenter::class, 'user_id');
    }

    /**
     * Appointments created by this user.
     */
    public function createdAppointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'created_by_id');
    }

    /**
     * Appointments confirmed by this user.
     */
    public function confirmedAppointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'confirmed_by_id');
    }

    /**
     * Associated Patient medical profile (if registered patient user).
     */
    public function patient(): HasOne
    {
        return $this->hasOne(Patient::class, 'user_id');
    }

    /**
     * Diagnostic centers managed by this user (Lab/Rad Manager).
     */
    public function managedDiagnosticCenters(): HasMany
    {
        return $this->hasMany(DiagnosticCenter::class, 'user_id');
    }

    /**
     * Staff profile for diagnostic center operations.
     */
    public function diagnosticStaffProfile(): HasOne
    {
        return $this->hasOne(DiagnosticStaff::class, 'user_id');
    }

    /**
     * Advertisements created by this user.
     */
    public function advertisements(): HasMany
    {
        return $this->hasMany(Advertisement::class, 'user_id');
    }

    /**
     * Clinical access logs performed by this user.
     */
    public function clinicalAccessLogs(): HasMany
    {
        return $this->hasMany(ClinicalAccessLog::class, 'actor_id');
    }
}
