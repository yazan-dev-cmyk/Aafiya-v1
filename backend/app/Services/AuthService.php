<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function __construct(
        protected ?DoctorProvisioningService $doctorProvisioningService = null,
        protected ?EhrService $ehrService = null,
        protected ?BookingCenterService $bookingCenterService = null
    ) {
        $this->doctorProvisioningService = $this->doctorProvisioningService ?? app(DoctorProvisioningService::class);
        $this->ehrService = $this->ehrService ?? app(EhrService::class);
        $this->bookingCenterService = $this->bookingCenterService ?? app(BookingCenterService::class);
    }

    /**
     * Register a new user and assign a default role if none provided.
     *
     * @param array<string, mixed> $data
     * @return array{user: User, token: string}
     */
    public function register(array $data): array
    {
        $roleName = $data['role'] ?? 'patient_registered';

        if ($roleName === 'booking_center') {
            return \Illuminate\Support\Facades\DB::transaction(function () use ($data, $roleName) {
                $managerName = ! empty($data['manager_name']) ? trim($data['manager_name']) : $data['name'];

                $user = User::create([
                    'name' => $managerName,
                    'email' => $data['email'],
                    'phone' => $data['phone'],
                    'password' => $data['password'],
                    'is_active' => true,
                ]);

                $user->assignRole($roleName);

                $this->bookingCenterService->provisionCenter([
                    'name' => $data['name'],
                    'commercial_register' => $data['commercial_register'] ?? null,
                    'license_number' => $data['license_number'] ?? null,
                    'phone' => $data['phone'],
                    'email' => $data['email'],
                    'address' => $data['address'] ?? 'الجزائر',
                    'wilaya' => $data['wilaya'] ?? 'الجزائر العاصمة',
                ], $user);

                $token = $user->createToken('auth_token')->plainTextToken;

                return [
                    'user' => $user->load(['roles.permissions', 'bookingCenter']),
                    'token' => $token,
                ];
            });
        }

        if ($roleName === 'doctor') {
            if (empty($data['specialty']) || empty($data['license_number'])) {
                throw ValidationException::withMessages([
                    'doctor_profile' => ['يتطلب تسجيل حساب الطبيب إدخال التخصص ورقم الترخيص الطبي.'],
                ]);
            }

            $userData = [
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'password' => $data['password'],
            ];

            $doctorData = [
                'specialty' => $data['specialty'],
                'license_number' => $data['license_number'],
                'bio' => $data['bio'] ?? null,
                'is_verified' => $data['is_verified'] ?? false,
            ];

            $clinicData = null;
            if (! empty($data['clinic_name'])) {
                $clinicData = [
                    'name' => $data['clinic_name'],
                    'address' => $data['address'] ?? 'الجزائر',
                    'wilaya' => $data['wilaya'] ?? 'الجزائر العاصمة',
                    'phone' => $clinicData['phone'] ?? $data['phone'],
                ];
            }

            $result = $this->doctorProvisioningService->provisionDoctor($userData, $doctorData, $clinicData);

            return [
                'user' => $result['user'],
                'token' => $result['token'],
            ];
        }

        return \Illuminate\Support\Facades\DB::transaction(function () use ($data, $roleName) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'password' => $data['password'],
                'is_active' => true,
            ]);

            $user->assignRole($roleName);

            if ($roleName === 'patient_registered') {
                $nameParts = explode(' ', trim($data['name']), 2);
                $firstName = $nameParts[0];
                $lastName = $nameParts[1] ?? $firstName;

                $this->ehrService->createPatient([
                    'user_id' => $user->id,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'gender' => $data['gender'] ?? 'male',
                    'date_of_birth' => $data['date_of_birth'] ?? '1990-01-01',
                    'blood_group' => $data['blood_group'] ?? null,
                    'phone' => $data['phone'],
                    'email' => $data['email'],
                    'national_id' => $data['national_id'] ?? null,
                    'address' => $data['address'] ?? null,
                    'wilaya' => $data['wilaya'] ?? null,
                ], $user);
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return [
                'user' => $user->load('roles.permissions'),
                'token' => $token,
            ];
        });
    }

    /**
     * Authenticate credentials and issue a Sanctum token.
     *
     * @param string $email
     * @param string $password
     * @param string|null $deviceName
     * @return array{user: User, token: string}
     * @throws ValidationException|AuthenticationException
     */
    public function login(string $email, string $password, ?string $deviceName = null): array
    {
        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        if (! $user->is_active) {
            throw new AuthenticationException('Your account has been deactivated. Please contact administration.');
        }

        $user->forceFill(['last_login_at' => now()])->save();

        $tokenName = $deviceName ?: 'auth_token';
        $token = $user->createToken($tokenName)->plainTextToken;

        return [
            'user' => $user->load('roles.permissions'),
            'token' => $token,
        ];
    }

    /**
     * Revoke current Sanctum access token for the user.
     */
    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();
    }

    /**
     * Retrieve the authenticated user profile with roles and permissions eager-loaded.
     */
    public function getProfile(User $user): User
    {
        return $user->load('roles.permissions');
    }

    /**
     * Change the authenticated user's password.
     *
     * @throws ValidationException
     */
    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        if (! Hash::check($currentPassword, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The provided current password does not match your records.'],
            ]);
        }

        $user->forceFill([
            'password' => Hash::make($newPassword),
        ])->save();
    }
}
