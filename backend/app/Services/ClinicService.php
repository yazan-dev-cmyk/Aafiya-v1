<?php

namespace App\Services;

use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\User;
use App\Services\LegacyWilayaMigrationService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ClinicService
{
    public function __construct(
        protected AuthorizationService $authorizationService,
        protected ?LegacyWilayaMigrationService $wilayaResolver = null
    ) {
        $this->wilayaResolver = $this->wilayaResolver ?? app(LegacyWilayaMigrationService::class);
    }

    /**
     * Create a new clinic entity and bind the creator doctor as Director.
     *
     * @param User $creator The user creating the clinic (must be doctor or admin)
     * @param array<string, mixed> $data Clinic attributes
     * @return Clinic
     * @throws AuthorizationException|ValidationException
     */
    public function createClinic(User $creator, array $data): Clinic
    {
        if (! $creator->hasRole(['doctor', 'admin'])) {
            throw new AuthorizationException('Only licensed doctors or platform administrators can create clinics.');
        }

        if ($creator->hasRole('doctor') && ! $creator->doctor) {
            throw ValidationException::withMessages([
                'creator' => ['لا يمكن إنشاء عيادة: الملف السريري للطبيب غير مكتمل أو غير مسجل.'],
            ]);
        }

        return DB::transaction(function () use ($creator, $data) {
            $directorDoctor = $creator->doctor;

            $wilayaStr = $data['wilaya'] ?? null;
            $wilayaId = $data['wilaya_id'] ?? ($wilayaStr !== null ? $this->wilayaResolver->resolveWilaya($wilayaStr)?->id : null);

            $clinic = Clinic::create([
                'name' => $data['name'],
                'address' => $data['address'],
                'wilaya' => $wilayaStr,
                'wilaya_id' => $wilayaId,
                'phone' => $data['phone'],
                'director_doctor_id' => $directorDoctor?->id,
                'max_patients_per_slot' => isset($data['max_patients_per_slot']) ? max(1, min(10, (int) $data['max_patients_per_slot'])) : 10,
                'slot_duration_min' => 60,
                'is_active' => $data['is_active'] ?? true,
            ]);

            if ($directorDoctor) {
                DoctorClinic::updateOrCreate(
                    [
                        'doctor_id' => $directorDoctor->id,
                        'clinic_id' => $clinic->id,
                    ],
                    [
                        'position' => 'director',
                        'is_primary' => true,
                        'joined_at' => now(),
                    ]
                );
            }

            return $clinic->load(['director.user', 'doctors', 'assistants']);
        });
    }

    /**
     * Update clinic operational settings (Director/Admin only).
     *
     * @throws AuthorizationException
     */
    public function updateSettings(User $user, Clinic $clinic, array $data): Clinic
    {
        if (! $user->hasClinicAccess('clinic.manage_settings', $clinic->id)) {
            throw new AuthorizationException('Forbidden: Only the Clinic Director can update clinic operational settings.');
        }

        $updateData = [
            'name' => $data['name'] ?? null,
            'address' => $data['address'] ?? null,
            'phone' => $data['phone'] ?? null,
            'max_patients_per_slot' => $data['max_patients_per_slot'] ?? null,
            'slot_duration_min' => $data['slot_duration_min'] ?? null,
            'is_active' => $data['is_active'] ?? null,
        ];

        if (array_key_exists('wilaya', $data)) {
            $wilayaStr = $data['wilaya'];
            $wilayaId = $data['wilaya_id'] ?? ($wilayaStr !== null ? $this->wilayaResolver->resolveWilaya($wilayaStr)?->id : null);
            $updateData['wilaya'] = $wilayaStr;
            $updateData['wilaya_id'] = $wilayaId;
        } elseif (array_key_exists('wilaya_id', $data)) {
            $updateData['wilaya_id'] = $data['wilaya_id'];
        }

        $clinic->update(array_filter($updateData, fn ($val) => $val !== null));

        return $clinic->fresh(['director.user', 'doctors']);
    }

    /**
     * Assign or update a doctor's affiliation and position in the clinic.
     *
     * @throws AuthorizationException
     */
    public function assignDoctor(
        User $actor,
        Clinic $clinic,
        Doctor $doctor,
        string $position = 'doctor',
        bool $isPrimary = false
    ): DoctorClinic {
        if (! $actor->hasClinicAccess('clinic.create_staff', $clinic->id)) {
            throw new AuthorizationException('Forbidden: Only the Clinic Director can manage clinic doctor staff.');
        }

        return DB::transaction(function () use ($clinic, $doctor, $position, $isPrimary) {
            if ($position === 'director') {
                // Synchronize single source of truth for director
                // 1. Demote any existing director in doctor_clinic
                DoctorClinic::where('clinic_id', $clinic->id)
                    ->where('position', 'director')
                    ->update(['position' => 'doctor']);

                // 2. Set director_doctor_id on clinic
                $clinic->update(['director_doctor_id' => $doctor->id]);
            }

            return DoctorClinic::updateOrCreate(
                [
                    'doctor_id' => $doctor->id,
                    'clinic_id' => $clinic->id,
                ],
                [
                    'position' => $position,
                    'is_primary' => $isPrimary,
                    'joined_at' => now(),
                ]
            );
        });
    }

    /**
     * Create and delegate a clinic assistant with Hard Permission Ceiling enforcement.
     *
     * @throws AuthorizationException
     */
    public function createAssistant(User $directorUser, Clinic $clinic, array $data): ClinicAssistant
    {
        if (! $directorUser->hasClinicAccess('clinic.create_staff', $clinic->id)) {
            throw new AuthorizationException('Forbidden: Only the Clinic Director can create assistant accounts.');
        }

        // Sanitize requested permissions against the Hard Permission Ceiling
        $requestedPermissions = $data['permissions_json'] ?? [];
        $sanitizedPermissions = $this->authorizationService->sanitizeDelegatedPermissions(
            'doctor_assistant',
            $requestedPermissions
        );

        return DB::transaction(function () use ($directorUser, $clinic, $data, $sanitizedPermissions) {
            // Create user account for assistant
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'password' => $data['password'],
                'is_active' => true,
            ]);

            $user->assignRole('doctor_assistant');

            // Sync relational scoped permission assignments
            $this->authorizationService->delegatePermissions(
                $directorUser,
                $user,
                'clinic',
                $clinic->id,
                $sanitizedPermissions
            );

            return ClinicAssistant::create([
                'user_id' => $user->id,
                'clinic_id' => $clinic->id,
                'permissions_json' => $sanitizedPermissions,
                'created_by_id' => $directorUser->id,
                'is_active' => true,
            ]);
        });
    }

    /**
     * Update an assistant's delegated permissions with Hard Permission Ceiling enforcement.
     *
     * @throws AuthorizationException
     */
    public function updateAssistantPermissions(
        User $directorUser,
        Clinic $clinic,
        ClinicAssistant $assistant,
        array $permissions
    ): ClinicAssistant {
        if (! $directorUser->hasClinicAccess('clinic.create_staff', $clinic->id)) {
            throw new AuthorizationException('Forbidden: Only the Clinic Director can modify assistant permissions.');
        }

        if ($assistant->clinic_id !== $clinic->id) {
            throw new AuthorizationException('Forbidden: Assistant does not belong to this clinic.');
        }

        $sanitized = $this->authorizationService->sanitizeDelegatedPermissions(
            'doctor_assistant',
            $permissions
        );

        return DB::transaction(function () use ($directorUser, $clinic, $assistant, $sanitized) {
            $assistantUser = $assistant->user;
            if ($assistantUser) {
                $this->authorizationService->delegatePermissions(
                    $directorUser,
                    $assistantUser,
                    'clinic',
                    $clinic->id,
                    $sanitized
                );
            }

            $assistant->update([
                'permissions_json' => $sanitized,
            ]);

            return $assistant->fresh();
        });
    }

    /**
     * Toggle active/suspended status of an employed doctor in the clinic (Director only).
     *
     * @throws AuthorizationException
     */
    public function toggleDoctorStatus(User $actor, Clinic $clinic, Doctor $doctor, bool $isActive): DoctorClinic
    {
        if (! $actor->hasClinicAccess('clinic.create_staff', $clinic->id)) {
            throw new AuthorizationException('Forbidden: Only the Clinic Director can update doctor status.');
        }

        // Target staff validation: Doctor must belong to this clinic
        $pivot = DoctorClinic::where('doctor_id', $doctor->id)
            ->where('clinic_id', $clinic->id)
            ->first();

        if (! $pivot) {
            throw new AuthorizationException('Forbidden: Doctor is not affiliated with this clinic.');
        }

        // Prevent self-suspension of authenticated Director
        if ($actor->doctor && $actor->doctor->id === $doctor->id) {
            throw new AuthorizationException('Forbidden: Clinic Director cannot suspend their own membership.');
        }

        // Prevent suspending the primary Clinic Director
        if ($clinic->director_doctor_id === $doctor->id) {
            throw new AuthorizationException('Forbidden: Cannot suspend the primary Clinic Director.');
        }

        $pivot->update(['is_active' => $isActive]);

        return $pivot->fresh();
    }

    /**
     * Detach an employed doctor from the clinic (Director only).
     * Does NOT delete user account or doctor profile. Preserves all historical records.
     *
     * @throws AuthorizationException
     */
    public function detachDoctor(User $actor, Clinic $clinic, Doctor $doctor): bool
    {
        if (! $actor->hasClinicAccess('clinic.create_staff', $clinic->id)) {
            throw new AuthorizationException('Forbidden: Only the Clinic Director can remove doctors from the clinic.');
        }

        $pivot = DoctorClinic::where('doctor_id', $doctor->id)
            ->where('clinic_id', $clinic->id)
            ->first();

        if (! $pivot) {
            throw new AuthorizationException('Forbidden: Doctor is not affiliated with this clinic.');
        }

        // Prevent self-removal of authenticated Director
        if ($actor->doctor && $actor->doctor->id === $doctor->id) {
            throw new AuthorizationException('Forbidden: Clinic Director cannot detach their own membership.');
        }

        // Prevent detaching the primary Clinic Director
        if ($clinic->director_doctor_id === $doctor->id) {
            throw new AuthorizationException('Forbidden: Cannot detach the primary Clinic Director.');
        }

        return DB::transaction(function () use ($pivot) {
            return (bool) $pivot->delete();
        });
    }

    /**
     * Toggle active/suspended status of an assistant in the clinic (Director only).
     *
     * @throws AuthorizationException
     */
    public function toggleAssistantStatus(
        User $actor,
        Clinic $clinic,
        ClinicAssistant $assistant,
        bool $isActive
    ): ClinicAssistant {
        if (! $actor->hasClinicAccess('clinic.create_staff', $clinic->id)) {
            throw new AuthorizationException('Forbidden: Only the Clinic Director can update assistant status.');
        }

        if ($assistant->clinic_id !== $clinic->id) {
            throw new AuthorizationException('Forbidden: Assistant does not belong to this clinic.');
        }

        $assistant->update(['is_active' => $isActive]);

        return $assistant->fresh(['user']);
    }

    /**
     * Remove / soft-delete an assistant from the clinic (Director only).
     *
     * @throws AuthorizationException
     */
    public function deleteAssistant(User $actor, Clinic $clinic, ClinicAssistant $assistant): bool
    {
        if (! $actor->hasClinicAccess('clinic.create_staff', $clinic->id)) {
            throw new AuthorizationException('Forbidden: Only the Clinic Director can remove assistants from the clinic.');
        }

        if ($assistant->clinic_id !== $clinic->id) {
            throw new AuthorizationException('Forbidden: Assistant does not belong to this clinic.');
        }

        return DB::transaction(function () use ($assistant) {
            return (bool) $assistant->delete();
        });
    }

    /**
     * Retrieve unified details of a single staff member (Doctor or Assistant) in the clinic.
     *
     * @throws AuthorizationException
     */
    public function getStaffDetail(User $actor, Clinic $clinic, string $staffId): array
    {
        if (! $actor->hasClinicAccess('clinic.create_staff', $clinic->id)) {
            throw new AuthorizationException('Forbidden: Only the Clinic Director can view staff details.');
        }

        // 1. Check if staffId is a Doctor in this clinic (by doctor.id or user_id)
        $doctor = $clinic->doctors()
            ->with('user')
            ->where(function ($q) use ($staffId) {
                $q->where('doctors.id', $staffId)
                    ->orWhere('doctors.user_id', $staffId);
            })
            ->first();

        if ($doctor) {
            return [
                'id' => $doctor->id,
                'user_id' => $doctor->user_id,
                'type' => 'doctor',
                'name' => $doctor->user?->name,
                'email' => $doctor->user?->email,
                'phone' => $doctor->user?->phone,
                'specialty' => $doctor->specialty,
                'license_number' => $doctor->license_number,
                'bio' => $doctor->bio,
                'position' => $doctor->pivot?->position ?? 'doctor',
                'is_primary' => (bool) ($doctor->pivot?->is_primary ?? false),
                'is_active' => (bool) ($doctor->pivot?->is_active ?? true),
                'is_verified' => (bool) $doctor->is_verified,
                'joined_at' => $this->formatDateTime($doctor->pivot?->joined_at ?? $doctor->pivot?->created_at),
                'permissions' => $doctor->user?->getAllPermissions()->pluck('name')->values()->all() ?? [],
            ];
        }

        // 2. Check if staffId is a Clinic Assistant in this clinic (by assistant.id or user_id)
        $assistant = $clinic->assistants()
            ->with('user')
            ->where(function ($q) use ($staffId) {
                $q->where('clinic_assistants.id', $staffId)
                    ->orWhere('clinic_assistants.user_id', $staffId);
            })
            ->first();

        if ($assistant) {
            return [
                'id' => $assistant->id,
                'user_id' => $assistant->user_id,
                'type' => 'assistant',
                'name' => $assistant->user?->name,
                'email' => $assistant->user?->email,
                'phone' => $assistant->user?->phone,
                'position' => 'assistant',
                'is_active' => (bool) $assistant->is_active,
                'joined_at' => $this->formatDateTime($assistant->created_at),
                'delegated_permissions' => $assistant->getDelegatedPermissions(),
                'permissions' => $assistant->getDelegatedPermissions(),
            ];
        }

        abort(404, 'الموظف المطلوب غير موجود ضمن طاقم هذه العيادة.');
    }

    /**
     * Safely format a Carbon instance, DateTime, or date string to ISO-8601 string.
     */
    protected function formatDateTime(mixed $date): ?string
    {
        if (! $date) {
            return null;
        }

        if ($date instanceof \Carbon\CarbonInterface) {
            return $date->toISOString();
        }

        try {
            return \Illuminate\Support\Carbon::parse($date)->toISOString();
        } catch (\Throwable) {
            return (string) $date;
        }
    }
}
