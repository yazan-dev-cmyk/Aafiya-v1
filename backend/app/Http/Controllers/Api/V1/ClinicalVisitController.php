<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ehr\CreateClinicalVisitRequest;
use App\Http\Requests\Ehr\UpdateClinicalVisitRequest;
use App\Http\Requests\Ehr\UpdateVitalSignsRequest;
use App\Http\Resources\ClinicalVisitResource;
use App\Models\ClinicalVisit;
use App\Services\ClinicalVisitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ClinicalVisitController extends Controller
{
    public function __construct(
        protected ClinicalVisitService $visitService
    ) {}

    /**
     * List clinical visits according to authorized scope.
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
            'visit_date' => ['nullable', 'date_format:Y-m-d'],
            'patient_id' => ['nullable', 'string'],
            'status' => ['nullable', 'string'],
            'sort_by' => ['nullable', 'string', 'in:visit_date,created_at,status'],
            'sort_order' => ['nullable', 'string', 'in:asc,desc,ASC,DESC'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = ClinicalVisit::with(['patient', 'doctor.user', 'clinic', 'finalizedBy']);

        $activeClinicId = $request->attributes->get('active_clinic_id') ?? $request->header('X-Clinic-ID') ?? $request->input('clinic_id');
        $doctorPosition = $request->attributes->get('doctor_position') ?? ($activeClinicId ? $user->doctor?->getPositionInClinic($activeClinicId) : null);

        if ($user->hasRole('doctor')) {
            if ($activeClinicId) {
                $query->where('clinic_id', $activeClinicId);
                // If not director of this clinic, only their own visits in this clinic
                if ($doctorPosition !== 'director' && ! $user->doctor?->isDirectorOf($activeClinicId)) {
                    $query->where('doctor_id', $user->doctor?->id);
                }
            } else {
                $query->where('doctor_id', $user->doctor?->id);
            }
        } elseif ($user->hasRole('doctor_assistant')) {
            $query->where('clinic_id', $user->clinicAssistant?->clinic_id);
        } elseif ($user->hasRole('patient_registered') || $user->hasRole('patient_guest')) {
            $query->whereHas('patient', fn ($q) => $q->where('user_id', $user->id));
        } elseif (! $user->hasRole('admin')) {
            $query->whereRaw('1 = 0'); // Block unauthorized
        }

        if (! empty($validated['patient_id'])) {
            $query->where('patient_id', $validated['patient_id']);
        }

        if (! empty($validated['visit_date'])) {
            $query->where('visit_date', $validated['visit_date']);
        }

        if (! empty($validated['from_date'])) {
            $query->where('visit_date', '>=', $validated['from_date']);
        }

        if (! empty($validated['to_date'])) {
            $query->where('visit_date', '<=', $validated['to_date']);
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $sortBy = $validated['sort_by'] ?? 'visit_date';
        $sortOrder = strtolower($validated['sort_order'] ?? 'desc');

        $query->orderBy($sortBy, $sortOrder);

        $perPage = (int) ($validated['per_page'] ?? 20);
        $visits = $query->paginate($perPage);

        return ClinicalVisitResource::collection($visits);
    }

    /**
     * Create a new draft clinical consultation record.
     */
    public function store(CreateClinicalVisitRequest $request): JsonResponse
    {
        $user = $request->user();
        if ($user && $user->hasRole('doctor') && $user->doctor && $user->doctor->is_verified === false) {
            abort(403, 'حساب الطبيب قيد المراجعة والتحقق من قبل إدارة المنصة.');
        }

        $visit = $this->visitService->createVisit(
            $request->validated(),
            $user
        );

        return response()->json([
            'message' => 'تم إنشاء مسودة الاستشارة الكلينيكية بنجاح.',
            'data' => new ClinicalVisitResource($visit->load(['patient', 'doctor.user', 'clinic'])),
        ], 201);
    }

    /**
     * View clinical visit details (enforces Privacy Wall matrix).
     */
    public function show(Request $request, ClinicalVisit $clinicalVisit): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $activeClinicId = $request->attributes->get('active_clinic_id') ?? $request->header('X-Clinic-ID') ?? $request->input('clinic_id');

        // Direct resource clinic scoping: Resource must belong to the active clinic context
        if ($user->hasRole('doctor')) {
            if ($activeClinicId && $clinicalVisit->clinic_id !== $activeClinicId) {
                abort(403, 'غير مصرح: هذه الزيارة الكلينيكية لا تتبع للعيادة النشطة المحددة.');
            }
        } elseif ($user->hasRole('doctor_assistant')) {
            $assistantClinicId = $user->clinicAssistant?->clinic_id;
            if ($assistantClinicId && $clinicalVisit->clinic_id !== $assistantClinicId) {
                abort(403, 'غير مصرح: هذه الزيارة الكلينيكية لا تتبع للعيادة النشطة المحددة.');
            }
        } elseif ($user->hasRole('patient_registered') || $user->hasRole('patient_guest')) {
            $patientId = $user->patient?->id;
            if ($patientId && $clinicalVisit->patient_id !== $patientId) {
                abort(403, 'غير مصرح لك باستعراض هذه الزيارة الكلينيكية.');
            }
        } elseif (! $user->hasRole('admin')) {
            abort(403, 'غير مصرح لك باستعراض هذه الزيارة الكلينيكية.');
        }

        if ($clinicalVisit->patient) {
            $reason = ($user->hasRole('patient_registered') || $user->hasRole('patient_guest')) ? 'patient_self_view' : 'direct_care';
            app(\App\Services\ClinicalAccessLogService::class)->logAccess(
                $user,
                $clinicalVisit->patient,
                'clinical_visit',
                $clinicalVisit->id,
                'view_confidential_ehr',
                $reason,
                $request
            );
        }

        return response()->json([
            'data' => new ClinicalVisitResource($clinicalVisit->load(['patient', 'doctor.user', 'clinic', 'finalizedBy', 'appointment'])),
        ]);
    }

    /**
     * Update draft clinical visit.
     */
    public function update(UpdateClinicalVisitRequest $request, ClinicalVisit $clinicalVisit): JsonResponse
    {
        $updated = $this->visitService->updateDraftVisit(
            $clinicalVisit,
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'تم تحديث مسودة الاستشارة الطبية بنجاح.',
            'data' => new ClinicalVisitResource($updated->load(['patient', 'doctor.user', 'clinic'])),
        ]);
    }

    /**
     * Update vital signs intake.
     */
    public function updateVitalSigns(UpdateVitalSignsRequest $request, ClinicalVisit $clinicalVisit): JsonResponse
    {
        $updated = $this->visitService->updateVitalSigns(
            $clinicalVisit,
            $request->input('vital_signs'),
            $request->user()
        );

        return response()->json([
            'message' => 'تم تسجيل وتحديث العلامات الحيوية بنجاح.',
            'data' => new ClinicalVisitResource($updated->load(['patient', 'doctor.user', 'clinic'])),
        ]);
    }

    /**
     * Finalize and sign clinical visit (Locks the record permanently).
     */
    public function finalize(Request $request, ClinicalVisit $clinicalVisit): JsonResponse
    {
        $finalized = $this->visitService->finalizeVisit(
            $clinicalVisit,
            $request->user()
        );

        return response()->json([
            'message' => 'تم اعتماد وقفل السجل الطبي بنجاح (Record Locked).',
            'data' => new ClinicalVisitResource($finalized),
        ]);
    }
}
