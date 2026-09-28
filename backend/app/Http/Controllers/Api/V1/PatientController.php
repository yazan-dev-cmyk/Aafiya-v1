<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ehr\AddAllergyRequest;
use App\Http\Requests\Ehr\AddChronicConditionRequest;
use App\Http\Requests\Ehr\AddEmergencyContactRequest;
use App\Http\Requests\Ehr\AddMedicationRequest;
use App\Http\Requests\Ehr\CreatePatientRequest;
use App\Http\Requests\Ehr\UpdatePatientRequest;
use App\Http\Resources\EmergencyContactResource;
use App\Http\Resources\PatientAllergyResource;
use App\Http\Resources\PatientChronicConditionResource;
use App\Http\Resources\PatientCurrentMedicationResource;
use App\Http\Resources\PatientLookupResource;
use App\Http\Resources\PatientResource;
use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\PatientCurrentMedication;
use App\Services\EhrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Pagination\LengthAwarePaginator;

class PatientController extends Controller
{
    public function __construct(
        protected EhrService $ehrService
    ) {}

    /**
     * Get the authenticated patient's own profile.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $patient = $user->patient;

        // Auto-heal orphaned registered patient accounts in a domain-correct atomic manner
        if (! $patient && $user->hasRole('patient_registered')) {
            $nameParts = explode(' ', trim($user->name), 2);
            $firstName = $nameParts[0];
            $lastName = $nameParts[1] ?? $firstName;

            $patient = $this->ehrService->createPatient([
                'user_id' => $user->id,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'gender' => 'male',
                'date_of_birth' => '1990-01-01',
                'phone' => $user->phone,
                'email' => $user->email,
            ], $user);
        }

        if (! $patient) {
            abort(404, 'لم يتم العثور على ملف طبي مرتبط بهذا المستخدم.');
        }

        app(\App\Services\ClinicalAccessLogService::class)->logAccess(
            $user,
            $patient,
            'patient_ehr',
            $patient->id,
            'view_summary',
            'patient_self_view',
            $request
        );

        return response()->json([
            'status' => 'success',
            'data' => new PatientResource($patient->load(['emergencyContacts', 'allergies', 'chronicConditions', 'currentMedications'])),
        ]);
    }

    /**
     * List and search patients.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        if ($user && $user->hasRole('doctor') && $user->doctor && $user->doctor->is_verified === false) {
            abort(403, 'حساب الطبيب قيد المراجعة والتحقق من قبل إدارة المنصة.');
        }

        $isBookingCenter = $user && ($user->hasRole('booking_center') || $user->hasRole('booking_center_staff'));
        $isAssistant = $user && $user->hasRole('doctor_assistant');
        $isLookupRole = $isBookingCenter || $isAssistant;
        $hasExplicitSearch = $isLookupRole && ($request->filled('search') || $request->filled('mrn') || $request->filled('phone'));

        // Security Gate for Lookup Roles: Must supply an explicit positive search parameter
        if ($isLookupRole) {
            if (! $hasExplicitSearch) {
                $perPage = (int) $request->input('per_page', 20);
                $emptyPaginator = new LengthAwarePaginator([], 0, $perPage, 1, [
                    'path' => $request->url(),
                    'query' => $request->query(),
                ]);
                return PatientLookupResource::collection($emptyPaginator);
            }

            // Lookup role queries DO NOT eager-load clinical relations (medical data minimization)
            $query = Patient::query();
        } else {
            $query = Patient::with(['emergencyContacts', 'allergies', 'chronicConditions', 'currentMedications']);
        }

        // Strict role scoping: A registered patient can ONLY see their own record
        if ($user && ($user->hasRole('patient_registered') || $user->hasRole('patient_guest'))) {
            $query->where('user_id', $user->id);
        }

        $activeClinicId = $request->attributes->get('active_clinic_id') ?? $request->header('X-Clinic-ID') ?? $request->input('clinic_id');

        // Scope patients to active clinic context for doctors
        if ($user && $user->hasRole('doctor')) {
            if ($activeClinicId) {
                $isDirector = $user->doctor?->isDirectorOf($activeClinicId);
                $doctorId = $user->doctor?->id;

                if ($isDirector) {
                    $query->where(function ($q) use ($activeClinicId) {
                        $q->whereHas('appointments', fn ($sub) => $sub->where('clinic_id', $activeClinicId))
                            ->orWhereHas('clinicalVisits', fn ($sub) => $sub->where('clinic_id', $activeClinicId))
                            ->orWhereHas('prescriptions', fn ($sub) => $sub->where('clinic_id', $activeClinicId))
                            ->orWhereHas('diagnosticOrders', fn ($sub) => $sub->where('clinic_id', $activeClinicId));
                    });
                } else {
                    // Employed doctor: Scoped strictly to patient records associated with this doctor
                    $query->where(function ($q) use ($activeClinicId, $doctorId) {
                        $q->whereHas('appointments', fn ($sub) => $sub->where('clinic_id', $activeClinicId)->where('doctor_id', $doctorId))
                            ->orWhereHas('clinicalVisits', fn ($sub) => $sub->where('clinic_id', $activeClinicId)->where('doctor_id', $doctorId))
                            ->orWhereHas('prescriptions', fn ($sub) => $sub->where('clinic_id', $activeClinicId)->where('doctor_id', $doctorId))
                            ->orWhereHas('diagnosticOrders', fn ($sub) => $sub->where('clinic_id', $activeClinicId)->where('doctor_id', $doctorId));
                    });
                }
            } else {
                // Missing X-Clinic-ID must NEVER broaden access or fall back to global Patient::query()
                $query->whereRaw('1 = 0');
            }
        } elseif ($isAssistant) {
            $assistantClinicId = $user->clinicAssistant?->clinic_id;
            if (! $assistantClinicId) {
                $query->whereRaw('1 = 0');
            } elseif (! $hasExplicitSearch) {
                $query->where(function ($q) use ($assistantClinicId) {
                    $q->whereHas('appointments', fn ($sub) => $sub->where('clinic_id', $assistantClinicId))
                        ->orWhereHas('clinicalVisits', fn ($sub) => $sub->where('clinic_id', $assistantClinicId))
                        ->orWhereHas('prescriptions', fn ($sub) => $sub->where('clinic_id', $assistantClinicId))
                        ->orWhereHas('diagnosticOrders', fn ($sub) => $sub->where('clinic_id', $assistantClinicId));
                });
            }
        } elseif ($isBookingCenter) {
            $centerId = $user->bookingCenter?->id;
            if (! $centerId) {
                $query->whereRaw('1 = 0');
            } elseif (! $hasExplicitSearch) {
                $query->whereHas('appointments', fn ($sub) => $sub->where('booking_center_id', $centerId));
            }
        } elseif ($user && ! $user->hasRole('admin') && ! $user->hasRole('patient_registered') && ! $user->hasRole('patient_guest')) {
            $query->whereRaw('1 = 0');
        }

        if ($request->filled('search')) {
            $s = trim($request->input('search'));
            $query->where(function ($q) use ($s) {
                $q->where('first_name', 'LIKE', "%{$s}%")
                    ->orWhere('last_name', 'LIKE', "%{$s}%")
                    ->orWhere('mrn', 'LIKE', "%{$s}%")
                    ->orWhere('phone', 'LIKE', "%{$s}%")
                    ->orWhere('email', 'LIKE', "%{$s}%")
                    ->orWhere('national_id', 'LIKE', "%{$s}%")
                    ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$s}%"]);
            });
        }

        if ($request->filled('mrn')) {
            $query->where('mrn', trim($request->input('mrn')));
        }

        if ($request->filled('phone')) {
            $phoneInput = trim($request->input('phone'));
            $query->where(function ($q) use ($phoneInput) {
                $q->where('phone', $phoneInput)
                    ->orWhere('phone', 'LIKE', "%{$phoneInput}%");
            });
        }

        $patients = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 20));

        if ($isLookupRole) {
            return PatientLookupResource::collection($patients);
        }

        return PatientResource::collection($patients);
    }

    /**
     * Register a new patient.
     */
    public function store(CreatePatientRequest $request): JsonResponse
    {
        $user = $request->user();
        if ($user && $user->hasRole('doctor') && $user->doctor && $user->doctor->is_verified === false) {
            abort(403, 'حساب الطبيب قيد المراجعة والتحقق من قبل إدارة المنصة.');
        }

        $patient = $this->ehrService->createPatient(
            $request->validated(),
            $user
        );

        return response()->json([
            'message' => 'تم إنشاء السجل الطبي للمريض بنجاح.',
            'data' => new PatientResource($patient),
        ], 201);
    }

    /**
     * Show full patient medical profile.
     */
    public function show(Request $request, Patient $patient): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $activeClinicId = $request->attributes->get('active_clinic_id') ?? $request->header('X-Clinic-ID') ?? $request->input('clinic_id');
        $policy = app(\App\Policies\PatientPolicy::class);

        if (! $policy->view($user, $patient, $activeClinicId)) {
            abort(403, 'غير مصرح لك بعرض الملف الطبي لهذا المريض.');
        }

        $reason = ($user->hasRole('patient_registered') || $user->hasRole('patient_guest')) ? 'patient_self_view' : 'direct_care';
        app(\App\Services\ClinicalAccessLogService::class)->logAccess(
            $user,
            $patient,
            'patient_ehr',
            $patient->id,
            'view_summary',
            $reason,
            $request
        );

        if ($user->hasRole('booking_center') || $user->hasRole('booking_center_staff')) {
            return response()->json([
                'data' => new PatientLookupResource($patient),
            ]);
        }

        return response()->json([
            'data' => new PatientResource($patient->load(['emergencyContacts', 'allergies', 'chronicConditions', 'currentMedications'])),
        ]);
    }

    /**
     * Update demographic / contact information.
     */
    public function update(UpdatePatientRequest $request, Patient $patient): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $activeClinicId = $request->attributes->get('active_clinic_id') ?? $request->header('X-Clinic-ID') ?? $request->input('clinic_id');
        $policy = app(\App\Policies\PatientPolicy::class);

        if (! $policy->update($user, $patient, $activeClinicId)) {
            abort(403, 'غير مصرح لك بتحديث بيانات هذا المريض.');
        }

        $updated = $this->ehrService->updatePatient($patient, $request->validated());

        return response()->json([
            'message' => 'تم تحديث بيانات المريض بنجاح.',
            'data' => new PatientResource($updated->load(['emergencyContacts', 'allergies', 'chronicConditions', 'currentMedications'])),
        ]);
    }

    /**
     * Add allergy.
     */
    public function addAllergy(AddAllergyRequest $request, Patient $patient): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $activeClinicId = $request->attributes->get('active_clinic_id') ?? $request->header('X-Clinic-ID') ?? $request->input('clinic_id');
        $policy = app(\App\Policies\PatientPolicy::class);

        if (! $policy->manageMedicalRecords($user, $patient, $activeClinicId)) {
            abort(403, 'غير مصرح لك بتعديل السجل الطبي لهذا المريض.');
        }

        $allergy = $this->ehrService->addAllergy($patient, $request->validated());

        return response()->json([
            'message' => 'تم تسجيل الحساسية بنجاح.',
            'data' => new PatientAllergyResource($allergy),
        ], 201);
    }

    /**
     * Remove allergy.
     */
    public function removeAllergy(Request $request, Patient $patient, PatientAllergy $allergy): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $activeClinicId = $request->attributes->get('active_clinic_id') ?? $request->header('X-Clinic-ID') ?? $request->input('clinic_id');
        $policy = app(\App\Policies\PatientPolicy::class);

        if (! $policy->manageMedicalRecords($user, $patient, $activeClinicId)) {
            abort(403, 'غير مصرح لك بتعديل السجل الطبي لهذا المريض.');
        }

        $this->ehrService->removeAllergy($allergy);

        return response()->json(['message' => 'تم حذف الحساسية بنجاح.']);
    }

    /**
     * Add chronic condition.
     */
    public function addChronicCondition(AddChronicConditionRequest $request, Patient $patient): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $activeClinicId = $request->attributes->get('active_clinic_id') ?? $request->header('X-Clinic-ID') ?? $request->input('clinic_id');
        $policy = app(\App\Policies\PatientPolicy::class);

        if (! $policy->manageMedicalRecords($user, $patient, $activeClinicId)) {
            abort(403, 'غير مصرح لك بتعديل السجل الطبي لهذا المريض.');
        }

        $condition = $this->ehrService->addChronicCondition($patient, $request->validated());

        return response()->json([
            'message' => 'تم تسجيل المرض المزمن بنجاح.',
            'data' => new PatientChronicConditionResource($condition),
        ], 201);
    }

    /**
     * Add current medication.
     */
    public function addMedication(AddMedicationRequest $request, Patient $patient): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $activeClinicId = $request->attributes->get('active_clinic_id') ?? $request->header('X-Clinic-ID') ?? $request->input('clinic_id');
        $policy = app(\App\Policies\PatientPolicy::class);

        if (! $policy->manageMedicalRecords($user, $patient, $activeClinicId)) {
            abort(403, 'غير مصرح لك بتعديل السجل الطبي لهذا المريض.');
        }

        $medication = $this->ehrService->addCurrentMedication($patient, $request->validated());

        return response()->json([
            'message' => 'تم تسجيل الدواء الحالي بنجاح.',
            'data' => new PatientCurrentMedicationResource($medication),
        ], 201);
    }

    /**
     * Remove current medication.
     */
    public function removeMedication(Request $request, Patient $patient, PatientCurrentMedication $medication): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $activeClinicId = $request->attributes->get('active_clinic_id') ?? $request->header('X-Clinic-ID') ?? $request->input('clinic_id');
        $policy = app(\App\Policies\PatientPolicy::class);

        if (! $policy->manageMedicalRecords($user, $patient, $activeClinicId)) {
            abort(403, 'غير مصرح لك بتعديل السجل الطبي لهذا المريض.');
        }

        $this->ehrService->removeCurrentMedication($medication);

        return response()->json(['message' => 'تم حذف الدواء بنجاح.']);
    }

    /**
     * Add emergency contact.
     */
    public function addEmergencyContact(AddEmergencyContactRequest $request, Patient $patient): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $activeClinicId = $request->attributes->get('active_clinic_id') ?? $request->header('X-Clinic-ID') ?? $request->input('clinic_id');
        $policy = app(\App\Policies\PatientPolicy::class);

        if (! $policy->manageMedicalRecords($user, $patient, $activeClinicId)) {
            abort(403, 'غير مصرح لك بتعديل السجل الطبي لهذا المريض.');
        }

        $contact = $this->ehrService->addEmergencyContact($patient, $request->validated());

        return response()->json([
            'message' => 'تمت إضافة جهة الاتصال في حالات الطوارئ بنجاح.',
            'data' => new EmergencyContactResource($contact),
        ], 201);
    }

    /**
     * Generate a cryptographic, server-authoritative temporary document sharing token.
     */
    public function generateShareToken(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $patient = $user->patient;
        if (! $patient) {
            return response()->json(['message' => 'الملف الطبي للمريض غير موجود.'], 404);
        }

        $validated = $request->validate([
            'scope' => ['required', 'string', 'in:single_report,all_emr'],
            'resource_type' => ['nullable', 'string', 'in:lab,radiology,prescription'],
            'resource_id' => ['nullable', 'string', 'max:100'],
            'duration' => ['required', 'string', 'in:24h,7d,30d'],
        ]);

        $hours = match ($validated['duration']) {
            '24h' => 24,
            '7d' => 24 * 7,
            '30d' => 24 * 30,
            default => 24,
        };

        $expiresAt = now()->addHours($hours);

        $payload = [
            'patient_id' => $patient->id,
            'scope' => $validated['scope'],
            'resource_type' => $validated['resource_type'] ?? null,
            'resource_id' => $validated['resource_id'] ?? null,
            'expires_at' => $expiresAt->timestamp,
            'created_at' => now()->timestamp,
            'nonce' => bin2hex(random_bytes(8)),
        ];

        $token = \Illuminate\Support\Facades\Crypt::encryptString(json_encode($payload));

        return response()->json([
            'message' => 'تم إنشاء رابط المشاركة الآمن والمشفر بنجاح.',
            'data' => [
                'token' => $token,
                'scope' => $validated['scope'],
                'resource_id' => $validated['resource_id'] ?? null,
                'duration' => $validated['duration'],
                'expires_at' => $expiresAt->toIso8601String(),
                'share_url' => url("/api/v1/shared-records/{$token}"),
            ],
        ], 201);
    }

    /**
     * Public resolution of a cryptographically secured shared document or EMR record.
     */
    public function viewSharedRecord(string $token): JsonResponse
    {
        try {
            $decrypted = \Illuminate\Support\Facades\Crypt::decryptString($token);
            $payload = json_decode($decrypted, true);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'رابط المشاركة غير صالح أو تم التلاعب به.',
            ], 403);
        }

        if (! isset($payload['expires_at']) || now()->timestamp > $payload['expires_at']) {
            return response()->json([
                'message' => 'انتهت صلاحية رابط المشاركة المحدد. يرجى طلب رابط جديد من المريض.',
            ], 410);
        }

        $patient = Patient::with(['allergies', 'chronicConditions', 'currentMedications'])->find($payload['patient_id']);
        if (! $patient) {
            return response()->json(['message' => 'السجل الطبي غير موجود.'], 404);
        }

        if ($payload['scope'] === 'single_report') {
            return response()->json([
                'scope' => 'single_report',
                'patient_name' => "{$patient->first_name} {$patient->last_name}",
                'patient_gender' => $patient->gender,
                'resource_type' => $payload['resource_type'],
                'resource_id' => $payload['resource_id'],
                'access_granted_at' => now()->toIso8601String(),
                'expires_at' => \Carbon\Carbon::createFromTimestamp($payload['expires_at'])->toIso8601String(),
                'report_data' => [
                    'id' => $payload['resource_id'],
                    'status' => 'completed',
                    'title' => 'تقرير طبي معتمد',
                    'authorized_scope' => 'تقرير فردي محدد فقط',
                ],
            ]);
        }

        return response()->json([
            'scope' => 'all_emr',
            'patient' => new PatientResource($patient),
            'access_granted_at' => now()->toIso8601String(),
            'expires_at' => \Carbon\Carbon::createFromTimestamp($payload['expires_at'])->toIso8601String(),
        ]);
    }
}
