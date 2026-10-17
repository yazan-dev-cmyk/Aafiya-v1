<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Doctor\RegisterDoctorVacationRequest;
use App\Http\Resources\DoctorVacationResource;
use App\Models\Doctor;
use App\Models\DoctorVacation;
use App\Services\DoctorVacationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DoctorVacationController extends Controller
{
    public function __construct(
        protected DoctorVacationService $vacationService
    ) {}

    /**
     * List vacations for the authenticated doctor.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $this->authorizeDoctorUser($user);

        /** @var Doctor $doctor */
        $doctor = $user->doctor;

        $vacations = DoctorVacation::where('doctor_id', $doctor->id)
            ->with(['vacationClinics.clinic'])
            ->orderBy('vacation_start', 'desc')
            ->paginate((int) $request->input('per_page', 15));

        return DoctorVacationResource::collection($vacations);
    }

    /**
     * Register a new vacation with immediate effectiveness (DEC-VAC-01).
     */
    public function store(RegisterDoctorVacationRequest $request): JsonResponse
    {
        $user = $request->user();
        $this->authorizeDoctorUser($user);

        /** @var Doctor $doctor */
        $doctor = $user->doctor;

        $vacation = $this->vacationService->registerVacation(
            $doctor,
            $request->validated(),
            $user
        );

        return response()->json([
            'status' => 'success',
            'message' => 'تم تسجيل إجازة الطبيب بنجاح وتفعيلها فورياً.',
            'data' => new DoctorVacationResource($vacation->load('vacationClinics.clinic')),
        ], 201);
    }

    /**
     * Cancel an active vacation by transitioning status to 'cancelled' (DEC-VAC-05).
     * Physical deletion is strictly prohibited.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $this->authorizeDoctorUser($user);

        /** @var DoctorVacation $vacation */
        $vacation = DoctorVacation::with(['doctor', 'vacationClinics.clinic'])->findOrFail($id);

        $cancelled = $this->vacationService->cancelVacation($vacation, $user);

        return response()->json([
            'status' => 'success',
            'message' => 'تم إلغاء الإجازة بنجاح.',
            'data' => new DoctorVacationResource($cancelled),
        ]);
    }

    /**
     * Authorize that the authenticated user is a verified doctor.
     */
    protected function authorizeDoctorUser($user): void
    {
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        if (! $user->hasRole('doctor') || ! $user->doctor) {
            abort(403, 'غير مصرح: هذا الإجراء مخصص للأطباء فقط.');
        }

        if ($user->doctor->is_verified === false) {
            abort(403, 'غير مصرح: حساب الطبيب قيد المراجعة والتوثيق من إدارة المنصة.');
        }
    }
}
