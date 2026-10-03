<?php

namespace App\Services;

use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\MedicalSpecialty;
use App\Models\User;
use App\Services\LegacySpecialtyResolutionService;
use App\Services\LegacyWilayaMigrationService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DoctorProvisioningService
{
    public function __construct(
        protected ?LegacyWilayaMigrationService $wilayaResolver = null,
        protected ?LegacySpecialtyResolutionService $specialtyResolver = null
    ) {
        $this->wilayaResolver = $this->wilayaResolver ?? app(LegacyWilayaMigrationService::class);
        $this->specialtyResolver = $this->specialtyResolver ?? app(LegacySpecialtyResolutionService::class);
    }
    /**
     * Atomically provision a self-registered Doctor Owner / Clinic Director.
     *
     * A doctor who self-registers is ALWAYS a Clinic Owner / Clinic Director.
     *
     * @param array<string, mixed> $userData
     * @param array<string, mixed> $doctorData
     * @param array<string, mixed>|null $clinicData
     * @param User|null $actor
     * @return array{user: User, doctor: Doctor, clinic: Clinic, token: string}
     * @throws ValidationException
     */
    public function provisionDoctor(
        array $userData,
        array $doctorData,
        ?array $clinicData = null,
        ?User $actor = null
    ): array {
        return DB::transaction(function () use ($userData, $doctorData, $clinicData) {
            // 1. Create User identity
            $user = User::create([
                'name' => $userData['name'],
                'email' => $userData['email'],
                'phone' => $userData['phone'],
                'password' => $userData['password'],
                'is_active' => true,
            ]);

            // 2. Assign Doctor Role (L1 Identity)
            $user->assignRole('doctor');

            // 3. Create Doctor Domain Profile (Pending Verification for Self-Registered Directors)
            $specData = $this->resolveSpecialtyData($doctorData);
            $doctor = Doctor::create([
                'user_id' => $user->id,
                'specialty' => $specData['specialty'],
                'specialty_id' => $specData['specialty_id'],
                'license_number' => $doctorData['license_number'],
                'bio' => $doctorData['bio'] ?? null,
                'is_verified' => $doctorData['is_verified'] ?? false,
            ]);

            // 4. Provision Clinic for Founding Director (Pending until Director is verified)
            $clinicName = $clinicData['name'] ?? ('عيادة ' . $userData['name']);
            $wilayaStr = $clinicData['wilaya'] ?? 'الجزائر العاصمة';
            $wilayaId = $clinicData['wilaya_id'] ?? ($wilayaStr !== null ? $this->wilayaResolver->resolveWilaya($wilayaStr)?->id : null);
            $clinic = Clinic::create([
                'name' => $clinicName,
                'address' => $clinicData['address'] ?? 'الجزائر',
                'wilaya' => $wilayaStr,
                'wilaya_id' => $wilayaId,
                'phone' => $clinicData['phone'] ?? $userData['phone'],
                'director_doctor_id' => $doctor->id,
                'max_patients_per_slot' => $clinicData['max_patients_per_slot'] ?? 1,
                'slot_duration_min' => $clinicData['slot_duration_min'] ?? 15,
                'is_active' => false,
            ]);

            // 5. Enforce Director Position in pivot (Cannot be downgraded by client parameters)
            DoctorClinic::create([
                'doctor_id' => $doctor->id,
                'clinic_id' => $clinic->id,
                'position' => 'director',
                'is_primary' => true,
                'joined_at' => now(),
            ]);

            $token = $user->createToken('auth_token')->plainTextToken;

            return [
                'user' => $user->load(['roles.permissions', 'doctor.clinics']),
                'doctor' => $doctor->load(['clinics', 'user']),
                'clinic' => $clinic,
                'token' => $token,
            ];
        });
    }

    /**
     * Atomically create and provision an Employed / Associate Doctor by an authorized Clinic Director.
     *
     * An employed doctor NEVER self-registers; they are created by the Clinic Director.
     *
     * @param User $directorUser The authenticated Clinic Director
     * @param Clinic $clinic The target clinic
     * @param array<string, mixed> $data
     * @return array{user: User, doctor: Doctor, clinic: Clinic}
     * @throws AuthorizationException|ValidationException
     */
    public function createEmployedDoctor(User $directorUser, Clinic $clinic, array $data): array
    {
        if (! $directorUser->hasClinicAccess('clinic.create_staff', $clinic->id)) {
            throw new AuthorizationException('Forbidden: Only the Clinic Director can create and provision employed doctor staff.');
        }

        return DB::transaction(function () use ($directorUser, $clinic, $data) {
            // 1. Create User Identity for Employed Doctor
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'password' => $data['password'],
                'is_active' => true,
            ]);

            // 2. Assign Doctor Role
            $user->assignRole('doctor');

            // 3. Create Doctor Domain Profile
            $specData = $this->resolveSpecialtyData($data);
            $doctor = Doctor::create([
                'user_id' => $user->id,
                'specialty' => $specData['specialty'],
                'specialty_id' => $specData['specialty_id'],
                'license_number' => $data['license_number'],
                'bio' => $data['bio'] ?? null,
                'is_verified' => true,
            ]);

            // 4. Attach Doctor to Clinic as Employed Doctor (position = 'doctor')
            // Note: clinics.director_doctor_id is NOT changed!
            DoctorClinic::create([
                'doctor_id' => $doctor->id,
                'clinic_id' => $clinic->id,
                'position' => 'doctor',
                'is_primary' => false,
                'joined_at' => now(),
            ]);

            return [
                'user' => $user->load(['roles.permissions', 'doctor.clinics']),
                'doctor' => $doctor->load(['clinics', 'user']),
                'clinic' => $clinic,
            ];
        });
    }

    /**
     * Atomically onboard/complete a Doctor clinical profile for an existing authenticated User.
     *
     * @param User $user
     * @param array<string, mixed> $doctorData
     * @param array<string, mixed>|null $clinicData
     * @return array{user: User, doctor: Doctor, clinic: ?Clinic}
     * @throws ValidationException
     */
    public function onboardDoctorProfile(
        User $user,
        array $doctorData,
        ?array $clinicData = null
    ): array {
        return DB::transaction(function () use ($user, $doctorData, $clinicData) {
            if (! $user->hasRole('doctor')) {
                $user->assignRole('doctor');
            }

            $specData = $this->resolveSpecialtyData($doctorData);
            $doctor = Doctor::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'specialty' => $specData['specialty'],
                    'specialty_id' => $specData['specialty_id'],
                    'license_number' => $doctorData['license_number'],
                    'bio' => $doctorData['bio'] ?? null,
                    'is_verified' => $doctorData['is_verified'] ?? true,
                ]
            );

            $clinic = null;

            if (! empty($clinicData['name'])) {
                $wilayaStr = $clinicData['wilaya'] ?? 'الجزائر العاصمة';
                $wilayaId = $clinicData['wilaya_id'] ?? ($wilayaStr !== null ? $this->wilayaResolver->resolveWilaya($wilayaStr)?->id : null);
                $clinic = Clinic::create([
                    'name' => $clinicData['name'],
                    'address' => $clinicData['address'] ?? 'الجزائر',
                    'wilaya' => $wilayaStr,
                    'wilaya_id' => $wilayaId,
                    'phone' => $clinicData['phone'] ?? $user->phone,
                    'director_doctor_id' => $doctor->id,
                    'max_patients_per_slot' => $clinicData['max_patients_per_slot'] ?? 1,
                    'slot_duration_min' => $clinicData['slot_duration_min'] ?? 15,
                    'is_active' => true,
                ]);

                DoctorClinic::updateOrCreate(
                    [
                        'doctor_id' => $doctor->id,
                        'clinic_id' => $clinic->id,
                    ],
                    [
                        'position' => 'director',
                        'is_primary' => true,
                        'joined_at' => now(),
                    ]
                );
            } elseif (! empty($clinicData['clinic_id'])) {
                $targetClinic = Clinic::findOrFail($clinicData['clinic_id']);
                DoctorClinic::updateOrCreate(
                    [
                        'doctor_id' => $doctor->id,
                        'clinic_id' => $targetClinic->id,
                    ],
                    [
                        'position' => $clinicData['position'] ?? 'doctor',
                        'is_primary' => $clinicData['is_primary'] ?? false,
                        'joined_at' => now(),
                    ]
                );
                $clinic = $targetClinic;
            }

            $user->update(['is_active' => true]);

            return [
                'user' => $user->fresh(['roles.permissions', 'doctor.clinics']),
                'doctor' => $doctor->fresh(['clinics', 'user']),
                'clinic' => $clinic,
            ];
        });
    }

    /**
     * Idempotently repair/provision an existing unprovisioned doctor account.
     *
     * @param User $user
     * @param array<string, mixed> $doctorData
     * @param array<string, mixed>|null $clinicData
     * @return array{user: User, doctor: Doctor, clinic: ?Clinic}
     */
    public function repairDoctorAccount(
        User $user,
        array $doctorData,
        ?array $clinicData = null
    ): array {
        return DB::transaction(function () use ($user, $doctorData, $clinicData) {
            if (! $user->hasRole('doctor')) {
                $user->assignRole('doctor');
            }

            $specData = $this->resolveSpecialtyData($doctorData);
            $doctor = Doctor::where('user_id', $user->id)->first();
            if (! $doctor) {
                $existingByLicense = Doctor::where('license_number', $doctorData['license_number'])->first();
                if ($existingByLicense && $existingByLicense->user_id !== $user->id) {
                    throw ValidationException::withMessages([
                        'license_number' => ['رقم الترخيص الطبي مستخدم بالفعل من قبل طبيب آخر.'],
                    ]);
                }

                $doctor = Doctor::create([
                    'user_id' => $user->id,
                    'specialty' => $specData['specialty'],
                    'specialty_id' => $specData['specialty_id'],
                    'license_number' => $doctorData['license_number'],
                    'bio' => $doctorData['bio'] ?? null,
                    'is_verified' => $doctorData['is_verified'] ?? true,
                ]);
            } else {
                $doctor->update([
                    'specialty' => $specData['specialty'] ?? $doctor->specialty,
                    'specialty_id' => $specData['specialty_id'] ?? $doctor->specialty_id,
                    'license_number' => $doctorData['license_number'] ?? $doctor->license_number,
                    'bio' => $doctorData['bio'] ?? $doctor->bio,
                    'is_verified' => $doctorData['is_verified'] ?? $doctor->is_verified,
                ]);
            }

            $clinic = null;

            if (! empty($clinicData['name'])) {
                $clinic = Clinic::where('name', $clinicData['name'])->first();
                if (! $clinic) {
                    $wilayaStr = $clinicData['wilaya'] ?? 'الجزائر العاصمة';
                    $wilayaId = $clinicData['wilaya_id'] ?? ($wilayaStr !== null ? $this->wilayaResolver->resolveWilaya($wilayaStr)?->id : null);
                    $clinic = Clinic::create([
                        'name' => $clinicData['name'],
                        'address' => $clinicData['address'] ?? 'الجزائر',
                        'wilaya' => $wilayaStr,
                        'wilaya_id' => $wilayaId,
                        'phone' => $clinicData['phone'] ?? $user->phone,
                        'director_doctor_id' => $doctor->id,
                        'is_active' => true,
                    ]);
                } else {
                    if (! $clinic->director_doctor_id) {
                        $clinic->update(['director_doctor_id' => $doctor->id]);
                    }
                }

                DoctorClinic::updateOrCreate(
                    [
                        'doctor_id' => $doctor->id,
                        'clinic_id' => $clinic->id,
                    ],
                    [
                        'position' => 'director',
                        'is_primary' => true,
                        'joined_at' => now(),
                    ]
                );
            }

            $user->update(['is_active' => true]);

            return [
                'user' => $user->fresh(['roles.permissions', 'doctor.clinics']),
                'doctor' => $doctor->fresh(['clinics', 'user']),
                'clinic' => $clinic,
            ];
        });
    }

    /**
     * Retrieve the onboarding and provisioning status of an authenticated user.
     *
     * @param User $user
     * @return array<string, mixed>
     */
    public function getOnboardingStatus(User $user): array
    {
        $user = $user->fresh(['roles', 'doctor.clinics']) ?? $user;

        $hasDoctorRole = $user->hasRole('doctor');
        $doctor = $user->doctor;
        $hasDoctorProfile = $doctor !== null;
        $isVerified = $doctor?->is_verified ?? false;
        $isProfileComplete = $hasDoctorProfile && ! empty($doctor->specialty) && ! empty($doctor->license_number);
        
        $primaryClinic = $doctor?->clinics()->wherePivot('is_primary', true)->first() ?? $doctor?->clinics()->first();
        $isDirector = $doctor ? Clinic::where('director_doctor_id', $doctor->id)->exists() || $doctor->clinics()->wherePivot('position', 'director')->exists() : false;

        $provisioningState = 'complete';
        if (! $hasDoctorProfile) {
            $provisioningState = 'pending_profile';
        } elseif (! $isVerified) {
            $provisioningState = 'pending_verification';
        } elseif (! $user->is_active) {
            $provisioningState = 'deactivated';
        }

        return [
            'user_id' => $user->id,
            'email' => $user->email,
            'name' => $user->name,
            'has_doctor_role' => $hasDoctorRole,
            'has_doctor_profile' => $hasDoctorProfile,
            'is_verified' => (bool) $isVerified,
            'is_profile_complete' => (bool) $isProfileComplete,
            'is_active' => (bool) $user->is_active,
            'provisioning_state' => $provisioningState,
            'doctor_profile' => $doctor ? [
                'id' => $doctor->id,
                'specialty' => $doctor->specialty,
                'specialty_id' => $doctor->specialty_id,
                'medical_specialty' => $doctor->medicalSpecialty ? [
                    'id' => $doctor->medicalSpecialty->id,
                    'code' => $doctor->medicalSpecialty->code,
                    'name_ar' => $doctor->medicalSpecialty->name_ar,
                    'name_fr' => $doctor->medicalSpecialty->name_fr,
                    'name_en' => $doctor->medicalSpecialty->name_en,
                ] : null,
                'license_number' => $doctor->license_number,
                'bio' => $doctor->bio,
            ] : null,
            'clinic_affiliation' => $primaryClinic ? [
                'id' => $primaryClinic->id,
                'name' => $primaryClinic->name,
                'wilaya' => $primaryClinic->wilaya,
                'position' => $primaryClinic->pivot->position ?? 'doctor',
                'is_primary' => (bool) ($primaryClinic->pivot->is_primary ?? false),
                'is_director' => (bool) $isDirector,
            ] : null,
        ];
    }

    /**
     * Resolve specialty_id and ensure dual-write specialty string is populated.
     *
     * @param array<string, mixed> $doctorData
     * @return array{specialty_id: ?int, specialty: string}
     * @throws ValidationException
     */
    protected function resolveSpecialtyData(array $doctorData): array
    {
        $specialtyId = isset($doctorData['specialty_id']) ? (int) $doctorData['specialty_id'] : null;
        $specialtyStr = isset($doctorData['specialty']) ? trim((string) $doctorData['specialty']) : null;

        if ($specialtyId !== null) {
            $model = MedicalSpecialty::find($specialtyId);
            if (! $model || ! $model->is_active) {
                throw ValidationException::withMessages([
                    'specialty_id' => ['التخصص الطبي المحدد غير صالح أو غير نشط.'],
                ]);
            }
            $specialtyStr = ($specialtyStr !== null && $specialtyStr !== '') ? $specialtyStr : $model->name_ar;
            return [
                'specialty_id' => $model->id,
                'specialty' => $specialtyStr,
            ];
        }

        if ($specialtyStr !== null && $specialtyStr !== '') {
            $res = $this->specialtyResolver->resolve($specialtyStr);
            if ($res['status'] === 'RESOLVED' && $res['specialty_id'] !== null) {
                return [
                    'specialty_id' => $res['specialty_id'],
                    'specialty' => $specialtyStr,
                ];
            }

            // Legacy backward compatibility: return string with null specialty_id
            return [
                'specialty_id' => null,
                'specialty' => $specialtyStr,
            ];
        }

        throw ValidationException::withMessages([
            'specialty_id' => ['التخصص الطبي مطلوب.'],
        ]);
    }
}
