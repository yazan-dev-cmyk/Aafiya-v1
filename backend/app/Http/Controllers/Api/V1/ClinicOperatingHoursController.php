<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Clinic\SaveClinicOperatingHoursRequest;
use App\Services\ClinicOperatingHoursService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClinicOperatingHoursController extends Controller
{
    public function __construct(
        protected ClinicOperatingHoursService $operatingHoursService
    ) {}

    /**
     * Display the clinic's operating hours.
     */
    public function show(Request $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);

        $hours = $this->operatingHoursService->getOperatingHours($clinicId);

        return response()->json([
            'status' => 'success',
            'data' => $hours,
        ]);
    }

    /**
     * Save the clinic's operating hours.
     */
    public function save(SaveClinicOperatingHoursRequest $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);

        $hours = $this->operatingHoursService->saveOperatingHours(
            $clinicId,
            $request->validated()['days'],
            $request->user()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'تم حفظ ساعات تشغيل العيادة بنجاح.',
            'data' => $hours,
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
            abort(422, 'معرف العيادة (X-Clinic-ID) مطلوب.');
        }

        return (string) $clinicId;
    }
}
