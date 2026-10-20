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
        $resolvedDoctorId = $this->resolveDoctorId($request, $doctorId);

        $schedule = $this->workingHoursService->getSchedule($clinicId, $resolvedDoctorId);

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
        $resolvedDoctorId = $this->resolveDoctorId($request, $doctorId);

        $schedule = $this->workingHoursService->saveDraft(
            $clinicId,
            $resolvedDoctorId,
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
        $resolvedDoctorId = $this->resolveDoctorId($request, $doctorId);

        $schedule = $this->workingHoursService->activateSchedule(
            $clinicId,
            $resolvedDoctorId,
            $request->user()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'تم تفعيل ساعات العمل الأسبوعية بنجاح وتم قفل الجدول.',
            'data' => $schedule,
        ]);
    }

    /**
     * Resolve target doctor ID from route parameter and authenticated actor.
     *
     * 1. If doctorId is canonical 'me', resolves to authenticated doctor's ID.
     * 2. If doctorId matches authenticated actor's user ID, safely resolves to authenticated doctor's ID (backward compatibility for legacy mobile app).
     * 3. Otherwise, treats doctorId as the explicit canonical doctors.id.
     */
    protected function resolveDoctorId(Request $request, string $doctorId): string
    {
        $actor = $request->user();

        if ($doctorId === 'me') {
            if (! $actor || ! $actor->doctor) {
                abort(403, 'المستخدم الحالي ليس لديه ملف طبيب مسجل.');
            }

            return (string) $actor->doctor->id;
        }

        // Scoped backward-compatibility: If actor passes their own user UUID instead of doctor UUID
        if ($actor && (string) $actor->id === (string) $doctorId && $actor->doctor) {
            return (string) $actor->doctor->id;
        }

        return (string) $doctorId;
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
