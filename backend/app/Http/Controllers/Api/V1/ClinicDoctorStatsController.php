<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Clinic\ClinicDoctorStatsRequest;
use App\Models\Clinic;
use App\Services\ClinicStatisticsService;
use Illuminate\Http\JsonResponse;

class ClinicDoctorStatsController extends Controller
{
    public function __construct(
        protected ClinicStatisticsService $statisticsService
    ) {}

    /**
     * Get clinic-level doctor statistics for the authorized Clinic Director.
     */
    public function index(ClinicDoctorStatsRequest $request): JsonResponse
    {
        $user = $request->user();

        // 1. Role verification: Must have role 'doctor' and associated doctor profile
        if (! $user || ! $user->hasRole('doctor') || ! $user->doctor) {
            return response()->json([
                'status' => 'error',
                'code' => 403,
                'message' => 'غير مصرح: هذا المسار مخصص للأطباء فقط.',
            ], 403);
        }

        $doctor = $user->doctor;

        // 2. Verified doctor verification
        if ($doctor->is_verified === false) {
            return response()->json([
                'status' => 'error',
                'code' => 403,
                'message' => 'حساب الطبيب قيد المراجعة والتحقق من قبل إدارة المنصة.',
            ], 403);
        }

        // 3. Active clinic context verification (from EnsureActiveClinicContext middleware)
        $activeClinicId = $request->attributes->get('active_clinic_id');
        $activeClinic = $request->attributes->get('active_clinic');

        if (! $activeClinicId) {
            return response()->json([
                'status' => 'error',
                'code' => 403,
                'message' => 'يجب تحديد سياق العيادة النشطة عبر الترويسة (X-Clinic-ID).',
            ], 403);
        }

        // 4. Authorization: User must have clinic.view_analytics for this active clinic (Director only)
        if (! $user->hasClinicAccess('clinic.view_analytics', $activeClinicId)) {
            return response()->json([
                'status' => 'error',
                'code' => 403,
                'message' => 'غير مصرح: هذا الإجراء مخصص لمدير العيادة فقط.',
            ], 403);
        }

        // Ensure activeClinic is a Clinic model instance
        if (! $activeClinic instanceof Clinic) {
            $activeClinic = Clinic::findOrFail($activeClinicId);
        }

        $data = $this->statisticsService->getClinicDoctorStats(
            $activeClinic,
            $request->validated()
        );

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }
}
