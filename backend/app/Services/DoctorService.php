<?php

namespace App\Services;

use App\Models\Doctor;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class DoctorService
{
    /**
     * Get paginated public directory of verified/active doctors.
     */
    public function getPublicDoctors(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $boundedPerPage = max(1, min(100, $perPage));

        $query = Doctor::with([
            'user:id,name',
            'clinics' => fn ($q) => $q->where('clinics.is_active', true)
                ->where('doctor_clinic.is_active', true)
                ->select(['clinics.id', 'clinics.name', 'clinics.wilaya', 'clinics.address', 'clinics.phone']),
        ])->whereHas('user', fn ($q) => $q->where('is_active', true));

        if (! empty($filters['search'])) {
            $s = trim($filters['search']);
            if ($s !== '') {
                $query->where(function ($sub) use ($s) {
                    $sub->where('specialty', 'like', "%{$s}%")
                        ->orWhereHas('user', fn ($uQ) => $uQ->where('name', 'like', "%{$s}%"))
                        ->orWhereHas('clinics', fn ($cQ) => 
                            $cQ->where('clinics.is_active', true)
                               ->where('doctor_clinic.is_active', true)
                               ->where(function ($cSub) use ($s) {
                                   $cSub->where('clinics.name', 'like', "%{$s}%")
                                        ->orWhere('clinics.wilaya', 'like', "%{$s}%");
                               })
                        );
                });
            }
        }

        if (! empty($filters['specialty'])) {
            $query->where('specialty', 'like', '%' . $filters['specialty'] . '%');
        }

        if (! empty($filters['wilaya'])) {
            $query->whereHas('clinics', fn ($q) => 
                $q->where('clinics.is_active', true)
                  ->where('doctor_clinic.is_active', true)
                  ->where('clinics.wilaya', $filters['wilaya'])
            );
        }

        if (isset($filters['is_verified'])) {
            $query->where('is_verified', (bool) $filters['is_verified']);
        }

        return $query->orderBy('created_at', 'desc')
            ->orderBy('id', 'asc')
            ->paginate($boundedPerPage);
    }

    /**
     * Find doctor public profile by UUID.
     */
    public function getDoctorProfile(string $doctorId): Doctor
    {
        return Doctor::with(['user:id,name', 'clinics:id,name,wilaya,address,phone'])
            ->findOrFail($doctorId);
    }

    /**
     * Create or update a doctor clinical profile for a User.
     */
    public function createDoctorProfile(User $user, array $data): Doctor
    {
        $doctor = Doctor::updateOrCreate(
            ['user_id' => $user->id],
            [
                'specialty' => $data['specialty'],
                'license_number' => $data['license_number'],
                'bio' => $data['bio'] ?? null,
                'is_verified' => $data['is_verified'] ?? false,
            ]
        );

        if (! $user->hasRole('doctor')) {
            $user->assignRole('doctor');
        }

        return $doctor->load('user');
    }

    /**
     * Set doctor verification status (Admin only).
     */
    public function verifyDoctor(Doctor $doctor, bool $isVerified): Doctor
    {
        $doctor->update(['is_verified' => $isVerified]);

        return $doctor->fresh();
    }
}
