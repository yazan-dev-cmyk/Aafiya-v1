<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Prescription\CreatePrescriptionRequest;
use App\Http\Requests\Prescription\CreatePrescriptionTemplateRequest;
use App\Http\Resources\PrescriptionResource;
use App\Http\Resources\PrescriptionTemplateResource;
use App\Models\Prescription;
use App\Models\PrescriptionTemplate;
use App\Services\PrescriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PrescriptionController extends Controller
{
    public function __construct(
        protected PrescriptionService $prescriptionService
    ) {}

    /**
     * List prescriptions according to authorized scope.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        if ($user && $user->hasRole('doctor') && $user->doctor && $user->doctor->is_verified === false) {
            abort(403, 'حساب الطبيب قيد المراجعة والتحقق من قبل إدارة المنصة.');
        }

        $validated = $request->validate([
            'from_date' => ['nullable', 'date_format:Y-m-d'],
            'to_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from_date'],
            'issue_date' => ['nullable', 'date_format:Y-m-d'],
            'patient_id' => ['nullable', 'string'],
            'status' => ['nullable', 'string'],
            'sort_by' => ['nullable', 'string', 'in:issue_date,expiry_date,created_at,status'],
            'sort_order' => ['nullable', 'string', 'in:asc,desc,ASC,DESC'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Prescription::with(['patient', 'doctor.user', 'clinic', 'items']);

        $activeClinicId = $request->attributes->get('active_clinic_id') ?? $request->header('X-Clinic-ID') ?? $request->input('clinic_id');
        $doctorPosition = $request->attributes->get('doctor_position') ?? ($activeClinicId ? $user->doctor?->getPositionInClinic($activeClinicId) : null);

        if ($user->hasRole('doctor')) {
            if ($activeClinicId) {
                $query->where('clinic_id', $activeClinicId);
                if ($doctorPosition !== 'director' && ! $user->doctor?->isDirectorOf($activeClinicId)) {
                    $query->where('doctor_id', $user->doctor?->id);
                }
            } else {
                $query->where('doctor_id', $user->doctor?->id);
            }
        } elseif ($user->hasRole('patient_registered') || $user->hasRole('patient_guest')) {
            $query->whereHas('patient', fn ($q) => $q->where('user_id', $user->id));
        } elseif ($user->hasRole('doctor_assistant')) {
            $query->where('clinic_id', $user->clinicAssistant?->clinic_id);
        } elseif (! $user->hasRole('admin')) {
            $query->whereRaw('1 = 0');
        }

        if (! empty($validated['patient_id'])) {
            $query->where('patient_id', $validated['patient_id']);
        }

        if (! empty($validated['issue_date'])) {
            $query->where('issue_date', $validated['issue_date']);
        }

        if (! empty($validated['from_date'])) {
            $query->where('issue_date', '>=', $validated['from_date']);
        }

        if (! empty($validated['to_date'])) {
            $query->where('issue_date', '<=', $validated['to_date']);
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $sortBy = $validated['sort_by'] ?? 'issue_date';
        $sortOrder = strtolower($validated['sort_order'] ?? 'desc');

        $query->orderBy($sortBy, $sortOrder);

        $perPage = (int) ($validated['per_page'] ?? 20);
        $prescriptions = $query->paginate($perPage);

        return PrescriptionResource::collection($prescriptions);
    }

    /**
     * Issue a new digital prescription.
     */
    public function store(CreatePrescriptionRequest $request): JsonResponse
    {
        $user = $request->user();
        if ($user && $user->hasRole('doctor') && $user->doctor && $user->doctor->is_verified === false) {
            abort(403, 'حساب الطبيب قيد المراجعة والتحقق من قبل إدارة المنصة.');
        }

        $prescription = $this->prescriptionService->createPrescription(
            $request->validated(),
            $request->input('items'),
            $user
        );

        return response()->json([
            'message' => 'تم تحرير الوصفة الطبية بنجاح وتوليد رمز التحقق QR.',
            'data' => new PrescriptionResource($prescription),
        ], 201);
    }

    /**
     * Show prescription details.
     */
    public function show(Request $request, Prescription $prescription): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $activeClinicId = $request->attributes->get('active_clinic_id') ?? $request->header('X-Clinic-ID') ?? $request->input('clinic_id');

        $isAuthorized = false;

        if ($user->hasRole('admin')) {
            $isAuthorized = true;
        } elseif ($user->hasRole('doctor')) {
            $doctor = $user->doctor;
            if ($doctor && $doctor->is_verified !== false) {
                // Direct resource scoping: Prescription must strictly belong to active clinic context
                if ($activeClinicId && $prescription->clinic_id !== $activeClinicId) {
                    $isAuthorized = false;
                } else {
                    $isAuthorized = $prescription->doctor_id === $doctor->id
                        || ($prescription->clinic_id && $doctor->isDirectorOf($prescription->clinic_id));
                }
            }
        } elseif ($user->hasRole('doctor_assistant')) {
            $assistantClinicId = $user->clinicAssistant?->clinic_id;
            $isAuthorized = $assistantClinicId && $prescription->clinic_id === $assistantClinicId;
        } elseif ($user->hasRole('patient_registered') || $user->hasRole('patient_guest')) {
            $isAuthorized = $prescription->patient && $prescription->patient->user_id === $user->id;
        }

        if (! $isAuthorized) {
            abort(403, 'غير مصرح لك باستعراض هذه الوصفة الطبية.');
        }

        if ($prescription->patient) {
            $reason = ($user->hasRole('patient_registered') || $user->hasRole('patient_guest')) ? 'patient_self_view' : 'direct_care';
            app(\App\Services\ClinicalAccessLogService::class)->logAccess(
                $user,
                $prescription->patient,
                'prescription',
                $prescription->id,
                'view_prescription',
                $reason,
                $request
            );
        }

        return response()->json([
            'data' => new PrescriptionResource($prescription->load(['patient', 'doctor.user', 'clinic', 'items'])),
        ]);
    }

    /**
     * Public QR verification endpoint.
     */
    public function verify(string $token): JsonResponse
    {
        $verification = $this->prescriptionService->verifyPrescriptionByToken($token);

        return response()->json([
            'data' => $verification,
        ], $verification['is_valid'] ? 200 : 404);
    }

    /**
     * Invalidate / Void an active prescription.
     */
    public function void(Request $request, Prescription $prescription): JsonResponse
    {
        $request->validate(['reason' => ['required', 'string', 'max:500']]);

        $voided = $this->prescriptionService->voidPrescription(
            $prescription,
            $request->user(),
            $request->input('reason')
        );

        return response()->json([
            'message' => 'تم إلغاء الوصفة الطبية بنجاح.',
            'data' => new PrescriptionResource($voided->load(['patient', 'doctor.user', 'clinic', 'items'])),
        ]);
    }

    /**
     * List prescription templates for doctor.
     */
    public function templates(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $doctor = $user->doctor;

        $query = PrescriptionTemplate::query();
        if ($doctor) {
            $query->where('doctor_id', $doctor->id)
                ->orWhere(function ($q) use ($doctor) {
                    $q->whereIn('clinic_id', $doctor->clinics->pluck('id'))->where('is_shared', true);
                });
        } elseif (! $user->hasRole('admin')) {
            $query->whereRaw('1 = 0');
        }

        $templates = $query->get();

        return PrescriptionTemplateResource::collection($templates);
    }

    /**
     * Store prescription template.
     */
    public function storeTemplate(CreatePrescriptionTemplateRequest $request): JsonResponse
    {
        $template = $this->prescriptionService->createTemplate(
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'تم حفظ قالب الوصفة الطبية بنجاح.',
            'data' => new PrescriptionTemplateResource($template),
        ], 201);
    }
}
