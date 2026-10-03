<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Clinic\AssignDoctorRequest;
use App\Http\Requests\Clinic\CreateAssistantRequest;
use App\Http\Requests\Clinic\CreateClinicRequest;
use App\Http\Requests\Clinic\CreateEmployedDoctorRequest;
use App\Http\Requests\Clinic\UpdateAssistantPermissionsRequest;
use App\Http\Requests\Clinic\UpdateClinicRequest;
use App\Http\Requests\Clinic\UpdateStaffStatusRequest;
use App\Http\Resources\ClinicAssistantResource;
use App\Http\Resources\ClinicResource;
use App\Http\Resources\UserResource;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Services\ClinicService;
use App\Services\DoctorProvisioningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClinicController extends Controller
{
    public function __construct(
        protected ClinicService $clinicService,
        protected ?DoctorProvisioningService $doctorProvisioningService = null
    ) {
        $this->doctorProvisioningService = $this->doctorProvisioningService ?? app(DoctorProvisioningService::class);
    }

    /**
     * List active clinics with optional filters.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->query('per_page', 20), 1), 100);

        $query = Clinic::with(['director.user', 'director.medicalSpecialty', 'doctors.user', 'doctors.medicalSpecialty'])
            ->where('is_active', true);

        if ($request->has('wilaya')) {
            $query->where('wilaya', $request->query('wilaya'));
        }

        if ($request->has('specialty_id') && ! empty($request->query('specialty_id'))) {
            $specialtyId = (int) $request->query('specialty_id');
            $query->where(function ($q) use ($specialtyId) {
                $q->whereHas('director', fn ($dQ) => $dQ->where('specialty_id', $specialtyId))
                  ->orWhereHas('doctors', fn ($dQ) => $dQ->where('specialty_id', $specialtyId)->where('doctor_clinic.is_active', true));
            });
        }

        $clinics = $query->orderBy('created_at', 'desc')->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => ClinicResource::collection($clinics),
            'meta' => [
                'current_page' => $clinics->currentPage(),
                'last_page' => $clinics->lastPage(),
                'per_page' => $clinics->perPage(),
                'total' => $clinics->total(),
                'from' => $clinics->firstItem(),
                'to' => $clinics->lastItem(),
            ],
            'links' => [
                'first' => $clinics->url(1),
                'last' => $clinics->url($clinics->lastPage()),
                'prev' => $clinics->previousPageUrl(),
                'next' => $clinics->nextPageUrl(),
            ],
        ]);
    }

    /**
     * Create a new clinic (Doctor or Admin).
     */
    public function store(CreateClinicRequest $request): JsonResponse
    {
        $clinic = $this->clinicService->createClinic($request->user(), $request->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Clinic created successfully.',
            'data' => new ClinicResource($clinic),
        ], 201);
    }

    /**
     * Show clinic details.
     */
    public function show(string $id): JsonResponse
    {
        $clinic = Clinic::with(['director.user', 'doctors.user', 'assistants.user'])
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => new ClinicResource($clinic),
        ]);
    }

    /**
     * Update clinic settings (Director only).
     */
    public function update(UpdateClinicRequest $request, string $id): JsonResponse
    {
        $clinic = Clinic::findOrFail($id);
        $updatedClinic = $this->clinicService->updateSettings($request->user(), $clinic, $request->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Clinic settings updated successfully.',
            'data' => new ClinicResource($updatedClinic),
        ]);
    }

    /**
     * Assign a doctor to clinic staff (Director only).
     */
    public function assignDoctor(AssignDoctorRequest $request, string $id): JsonResponse
    {
        $clinic = Clinic::findOrFail($id);
        $doctor = Doctor::findOrFail($request->validated('doctor_id'));

        $this->clinicService->assignDoctor(
            $request->user(),
            $clinic,
            $doctor,
            $request->validated('position', 'doctor'),
            $request->validated('is_primary', false)
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Doctor assigned to clinic staff successfully.',
            'data' => new ClinicResource($clinic->fresh(['director.user', 'doctors.user'])),
        ]);
    }

    /**
     * Create and provision a new employed doctor for the clinic (Director only).
     */
    public function createEmployedDoctor(CreateEmployedDoctorRequest $request, string $id): JsonResponse
    {
        $clinic = Clinic::findOrFail($id);
        $result = $this->doctorProvisioningService->createEmployedDoctor(
            $request->user(),
            $clinic,
            $request->validated()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'تم إنشاء حساب الطبيب الموظف وإلحاقه بطاقم العيادة بنجاح.',
            'data' => [
                'user' => new UserResource($result['user']),
                'clinic' => new ClinicResource($clinic->fresh(['director.user', 'doctors.user'])),
            ],
        ], 201);
    }

    /**
     * Create a new assistant for the clinic (Director only).
     */
    public function createAssistant(CreateAssistantRequest $request, string $id): JsonResponse
    {
        $clinic = Clinic::findOrFail($id);
        $assistant = $this->clinicService->createAssistant($request->user(), $clinic, $request->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Assistant created and delegated successfully.',
            'data' => new ClinicAssistantResource($assistant->load('user')),
        ], 201);
    }

    /**
     * Update an assistant's delegated permissions (Director only).
     */
    public function updateAssistantPermissions(
        UpdateAssistantPermissionsRequest $request,
        string $clinicId,
        string $assistantId
    ): JsonResponse {
        $clinic = Clinic::findOrFail($clinicId);
        $assistant = ClinicAssistant::findOrFail($assistantId);

        $updated = $this->clinicService->updateAssistantPermissions(
            $request->user(),
            $clinic,
            $assistant,
            $request->validated('permissions')
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Assistant delegated permissions updated successfully.',
            'data' => new ClinicAssistantResource($updated->load('user')),
        ]);
    }

    /**
     * Update active/suspended status of an employed doctor in the clinic (Director only).
     */
    public function updateDoctorStatus(
        UpdateStaffStatusRequest $request,
        string $clinicId,
        string $doctorId
    ): JsonResponse {
        $clinic = Clinic::findOrFail($clinicId);
        $doctor = Doctor::findOrFail($doctorId);

        $pivot = $this->clinicService->toggleDoctorStatus(
            $request->user(),
            $clinic,
            $doctor,
            $request->validated('is_active')
        );

        $message = $pivot->is_active
            ? 'تم تفعيل حساب الطبيب الموظف في العيادة بنجاح.'
            : 'تم تعليق حساب الطبيب الموظف في العيادة بنجاح.';

        return response()->json([
            'status' => 'success',
            'message' => $message,
            'data' => [
                'doctor_id' => $doctor->id,
                'clinic_id' => $clinic->id,
                'is_active' => (bool) $pivot->is_active,
            ],
        ]);
    }

    /**
     * Detach an employed doctor from the clinic (Director only).
     */
    public function detachDoctor(
        Request $request,
        string $clinicId,
        string $doctorId
    ): JsonResponse {
        $clinic = Clinic::findOrFail($clinicId);
        $doctor = Doctor::findOrFail($doctorId);

        $this->clinicService->detachDoctor(
            $request->user(),
            $clinic,
            $doctor
        );

        return response()->json([
            'status' => 'success',
            'message' => 'تم إلغاء إلحاق الطبيب من طاقم العيادة بنجاح.',
        ]);
    }

    /**
     * Update active/suspended status of an assistant in the clinic (Director only).
     */
    public function updateAssistantStatus(
        UpdateStaffStatusRequest $request,
        string $clinicId,
        string $assistantId
    ): JsonResponse {
        $clinic = Clinic::findOrFail($clinicId);
        $assistant = ClinicAssistant::findOrFail($assistantId);

        $updated = $this->clinicService->toggleAssistantStatus(
            $request->user(),
            $clinic,
            $assistant,
            $request->validated('is_active')
        );

        $message = $updated->is_active
            ? 'تم تفعيل حساب المساعد في العيادة بنجاح.'
            : 'تم تعليق حساب المساعد في العيادة بنجاح.';

        return response()->json([
            'status' => 'success',
            'message' => $message,
            'data' => new ClinicAssistantResource($updated->load('user')),
        ]);
    }

    /**
     * Remove / delete an assistant from the clinic (Director only).
     */
    public function deleteAssistant(
        Request $request,
        string $clinicId,
        string $assistantId
    ): JsonResponse {
        $clinic = Clinic::findOrFail($clinicId);
        $assistant = ClinicAssistant::findOrFail($assistantId);

        $this->clinicService->deleteAssistant(
            $request->user(),
            $clinic,
            $assistant
        );

        return response()->json([
            'status' => 'success',
            'message' => 'تمت إزالة المساعد من طاقم العيادة بنجاح.',
        ]);
    }

    /**
     * Retrieve single staff member details (Director only).
     */
    public function showStaff(
        Request $request,
        string $clinicId,
        string $staffId
    ): JsonResponse {
        $clinic = Clinic::findOrFail($clinicId);

        $staffData = $this->clinicService->getStaffDetail(
            $request->user(),
            $clinic,
            $staffId
        );

        return response()->json([
            'status' => 'success',
            'data' => $staffData,
        ]);
    }
}
