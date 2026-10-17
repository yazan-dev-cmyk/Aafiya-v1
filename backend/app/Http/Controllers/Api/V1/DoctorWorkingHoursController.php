<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Doctor\SaveDoctorScheduleRequest;
use App\Services\DoctorWorkingHoursService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DoctorWorkingHoursController extends Controller
{
    public function __construct(
        protected DoctorWorkingHoursService $workingHoursService
    ) {}

    /**
     * Display the weekly working hours for the doctor.
     */
    public function show(Request $request, string $doctorId): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);

        $schedule = $this->workingHoursService->getSchedule($clinicId, $doctorId);

        return response()->json([
            'status' => 'success',
            'data' => $schedule,
        ]);
    }

    /**
     * Save a draft weekly schedule for the doctor before activation.
     */
    public function saveDraft(SaveDoctorScheduleRequest $request, string $doctorId): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);

        $schedule = $this->workingHoursService->saveDraft(
            $clinicId,
            $doctorId,
            $request->validated()['days'],
            $request->user()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'تم حفظ مسودة ساعات العمل بنجاح.',
            'data' => $schedule,
        ]);
    }

    /**
     * Atomically activate and permanently lock the doctor's weekly working schedule.
     */
    public function activate(Request $request, string $doctorId): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);

        $schedule = $this->workingHoursService->activateSchedule(
            $clinicId,
            $doctorId,
            $request->user()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'تم تفعيل ساعات العمل الأسبوعية بنجاح وتم قفل الجدول.',
            'data' => $schedule,
        ]);
    }

    /**
     * Resolve clinic ID from request context.
     */
    protected function resolveClinicId(Request $request): string
    {
        $clinicId = $request->attributes->get('active_clinic_id')
            ?? $request->header('X-Clinic-ID')
            ?? $request->input('clinic_id')
            ?? $request->route('clinicId');

        if (! $clinicId) {
            abort(422, 'معرف العيادة (X-Clinic-ID) مطلوب لإدارة ساعات العمل.');
        }

        return (string) $clinicId;
    }
}
