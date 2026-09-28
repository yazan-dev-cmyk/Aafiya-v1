<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Doctor\OnboardDoctorRequest;
use App\Http\Requests\Doctor\RegisterDoctorRequest;
use App\Http\Resources\UserResource;
use App\Services\DoctorProvisioningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DoctorOnboardingController extends Controller
{
    public function __construct(
        protected DoctorProvisioningService $doctorProvisioningService
    ) {}

    /**
     * Public atomic doctor registration endpoint.
     */
    public function registerDoctor(RegisterDoctorRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $userData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password' => $validated['password'],
        ];

        $doctorData = [
            'specialty' => $validated['specialty'],
            'license_number' => $validated['license_number'],
            'bio' => $validated['bio'] ?? null,
            'is_verified' => false,
        ];

        $clinicData = null;
        if (! empty($validated['clinic_name'])) {
            $clinicData = [
                'name' => $validated['clinic_name'],
                'wilaya' => $validated['wilaya'] ?? 'الجزائر العاصمة',
                'address' => $validated['address'] ?? 'الجزائر',
                'phone' => $validated['clinic_phone'] ?? $validated['phone'],
            ];
        }

        $result = $this->doctorProvisioningService->provisionDoctor(
            $userData,
            $doctorData,
            $clinicData
        );

        return response()->json([
            'status' => 'success',
            'message' => 'تم تسجيل وتأهيل حساب الطبيب بنجاح.',
            'data' => [
                'user' => new UserResource($result['user']),
                'token' => $result['token'],
                'token_type' => 'Bearer',
            ],
        ], 201);
    }

    /**
     * Authenticated doctor onboarding completion endpoint.
     */
    public function onboard(OnboardDoctorRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $doctorData = [
            'specialty' => $validated['specialty'],
            'license_number' => $validated['license_number'],
            'bio' => $validated['bio'] ?? null,
            'is_verified' => true,
        ];

        $clinicData = null;
        if (! empty($validated['clinic_name'])) {
            $clinicData = [
                'name' => $validated['clinic_name'],
                'wilaya' => $validated['wilaya'] ?? 'الجزائر العاصمة',
                'address' => $validated['address'] ?? 'الجزائر',
                'phone' => $validated['phone'] ?? $user->phone,
            ];
        } elseif (! empty($validated['clinic_id'])) {
            $clinicData = [
                'clinic_id' => $validated['clinic_id'],
                'position' => $validated['position'] ?? 'doctor',
            ];
        }

        $result = $this->doctorProvisioningService->onboardDoctorProfile(
            $user,
            $doctorData,
            $clinicData
        );

        return response()->json([
            'status' => 'success',
            'message' => 'تم استكمال الملف السريري للطبيب وتفعيله بنجاح.',
            'data' => [
                'user' => new UserResource($result['user']),
            ],
        ]);
    }

    /**
     * Authenticated doctor onboarding and provisioning status probe.
     */
    public function status(Request $request): JsonResponse
    {
        $status = $this->doctorProvisioningService->getOnboardingStatus($request->user());

        return response()->json([
            'status' => 'success',
            'data' => $status,
        ]);
    }
}
