<?php

namespace App\Services;

use App\Models\Doctor;
use App\Models\MedicalSpecialty;
use App\Models\User;
use App\Services\LegacySpecialtyResolutionService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class DoctorService
{
    public function __construct(
        protected ?LegacySpecialtyResolutionService $specialtyResolver = null
    ) {
        $this->specialtyResolver = $this->specialtyResolver ?? app(LegacySpecialtyResolutionService::class);
    }

    /**
     * Get paginated public directory of verified/active doctors.
     */
    public function getPublicDoctors(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $boundedPerPage = max(1, min(100, $perPage));

        $query = Doctor::with([
            'user:id,name',
            'medicalSpecialty:id,code,name_ar,name_fr,name_en,is_active',
            'clinics' => fn ($q) => $q->where('clinics.is_active', true)
                ->where('doctor_clinic.is_active', true)
                ->select(['clinics.id', 'clinics.name', 'clinics.wilaya', 'clinics.address', 'clinics.phone']),
        ])->whereHas('user', fn ($q) => $q->where('is_active', true));

        if (! empty($filters['search'])) {
            $s = trim($filters['search']);
            if ($s !== '') {
                $query->where(function ($sub) use ($s) {
                    $sub->where('doctors.specialty', 'like', "%{$s}%")
                        ->orWhereHas('medicalSpecialty', function ($mQ) use ($s) {
                            $mQ->where('name_ar', 'like', "%{$s}%")
                               ->orWhere('name_fr', 'like', "%{$s}%")
                               ->orWhere('name_en', 'like', "%{$s}%")
                               ->orWhere('code', 'like', "%{$s}%");
                        })
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

        if (! empty($filters['specialty_id'])) {
            $query->where('doctors.specialty_id', (int) $filters['specialty_id']);
        } elseif (! empty($filters['specialty'])) {
            $resolved = $this->specialtyResolver->resolveSpecialtyModel($filters['specialty']);
            if ($resolved) {
                $query->where(function ($sub) use ($resolved, $filters) {
                    $sub->where('doctors.specialty_id', $resolved->id)
                        ->orWhere('doctors.specialty', 'like', '%' . $filters['specialty'] . '%');
                });
            } else {
                $query->where('doctors.specialty', 'like', '%' . $filters['specialty'] . '%');
            }
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
        return Doctor::with(['user:id,name', 'medicalSpecialty', 'clinics:id,name,wilaya,address,phone'])
            ->findOrFail($doctorId);
    }

    /**
     * Create or update a doctor clinical profile for a User.
     */
    public function createDoctorProfile(User $user, array $data): Doctor
    {
        $specialtyId = $data['specialty_id'] ?? null;
        if (! $specialtyId && ! empty($data['specialty'])) {
            $specialtyId = $this->specialtyResolver->resolveSpecialtyModel($data['specialty'])?->id;
        }

        $doctor = Doctor::updateOrCreate(
            ['user_id' => $user->id],
            [
                'specialty' => $data['specialty'],
                'specialty_id' => $specialtyId,
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

    /**
     * Update the personal identity and clinical profile of an authenticated doctor.
     *
     * @param User $user Authenticated doctor account owner
     * @param array<string, mixed> $validated Validated attributes
     * @return User
     */
    public function updateDoctorProfile(User $user, array $validated): User
    {
        return DB::transaction(function () use ($user, $validated) {
            // 1. Update User Identity attributes
            $userUpdates = [];
            if (array_key_exists('name', $validated)) {
                $userUpdates['name'] = trim((string) $validated['name']);
            }
            if (array_key_exists('phone', $validated)) {
                $userUpdates['phone'] = trim((string) $validated['phone']);
            }
            if (! empty($userUpdates)) {
                $user->update($userUpdates);
            }

            // 2. Update Doctor Clinical Profile attributes
            /** @var Doctor $doctor */
            $doctor = $user->doctor()->lockForUpdate()->firstOrFail();
            $doctorUpdates = [];

            if (array_key_exists('bio', $validated)) {
                $doctorUpdates['bio'] = $validated['bio'] !== null ? trim((string) $validated['bio']) : null;
            }

            if (array_key_exists('specialty_id', $validated)) {
                $specialty = MedicalSpecialty::where('id', $validated['specialty_id'])
                    ->where('is_active', true)
                    ->firstOrFail();

                $doctorUpdates['specialty_id'] = $specialty->id;
                $doctorUpdates['specialty'] = $specialty->name_ar; // Dual-write canonical Arabic name
            }

            if (! empty($doctorUpdates)) {
                $doctor->update($doctorUpdates);
            }

            return $user->fresh(['doctor.medicalSpecialty', 'roles', 'doctor.clinics']);
        });
    }
}
