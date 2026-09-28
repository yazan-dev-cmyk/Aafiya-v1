<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\CreateAppointmentRequest;
use App\Http\Requests\Booking\RescheduleAppointmentRequest;
use App\Http\Requests\Booking\UpdateAppointmentStatusRequest;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AppointmentController extends Controller
{
    public function __construct(
        protected BookingService $bookingService
    ) {}

    /**
     * List appointments filtered by authorized scope.
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
            'appointment_date' => ['nullable', 'date_format:Y-m-d'],
            'doctor_id' => ['nullable', 'uuid'],
            'status' => ['nullable', 'string'],
            'clinic_id' => ['nullable', 'string'],
            'sort_by' => ['nullable', 'string', 'in:appointment_date,time_slot,created_at,status'],
            'sort_order' => ['nullable', 'string', 'in:asc,desc,ASC,DESC'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Appointment::with(['clinic', 'doctor.user', 'patient', 'bookingCenter', 'statusHistory']);

        $activeClinicId = $request->attributes->get('active_clinic_id') ?? $request->header('X-Clinic-ID') ?? $request->input('clinic_id');

        // Scope filtering based on user role and relations
        if ($user->hasRole('booking_center')) {
            $query->where('booking_center_id', $user->bookingCenter?->id);
        } elseif ($user->hasRole('doctor')) {
            $query->where('doctor_id', $user->doctor?->id);
            if ($activeClinicId) {
                $query->where('clinic_id', $activeClinicId);
            }
        } elseif ($user->hasRole('doctor_assistant')) {
            $clinicId = $user->clinicAssistant?->clinic_id;
            if (! $clinicId || ! $user->hasClinicAccess('booking.manage_queue', $clinicId)) {
                abort(403, 'غير مصرح: لا تملك صلاحية استعراض قائمة مواعيد العيادة.');
            }
            $query->where('clinic_id', $clinicId);

            if (! empty($validated['doctor_id'])) {
                $isAffiliated = DoctorClinic::where('doctor_id', $validated['doctor_id'])
                    ->where('clinic_id', $clinicId)
                    ->where('is_active', true)
                    ->exists()
                    || Clinic::where('id', $clinicId)
                        ->where('director_doctor_id', $validated['doctor_id'])
                        ->exists();

                if (! $isAffiliated) {
                    abort(422, 'الطبيب المحدد غير منتسب لهذه العيادة.');
                }

                $query->where('doctor_id', $validated['doctor_id']);
            }
        } elseif ($user->hasRole('patient_registered') || $user->hasRole('patient_guest')) {
            $patientId = $user->patient?->id;
            if ($patientId) {
                $query->where('patient_id', $patientId);
            } else {
                $query->where('created_by_id', $user->id);
            }
        } elseif (! $user->hasRole('admin')) {
            $query->where('created_by_id', $user->id);
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        } else {
            $query->where('status', '!=', 'rescheduled');
        }

        if (! empty($validated['appointment_date'])) {
            $query->where('appointment_date', $validated['appointment_date']);
        }

        if (! empty($validated['from_date'])) {
            $query->where('appointment_date', '>=', $validated['from_date']);
        }

        if (! empty($validated['to_date'])) {
            $query->where('appointment_date', '<=', $validated['to_date']);
        }

        if (! empty($validated['clinic_id']) && $user->hasRole('admin')) {
            $query->where('clinic_id', $validated['clinic_id']);
        }

        if (! empty($validated['doctor_id']) && $user->hasRole('admin')) {
            $query->where('doctor_id', $validated['doctor_id']);
        }

        $sortBy = $validated['sort_by'] ?? 'appointment_date';
        $sortOrder = strtolower($validated['sort_order'] ?? 'desc');

        $query->orderBy($sortBy, $sortOrder);
        if ($sortBy === 'appointment_date') {
            $query->orderBy('time_slot', 'asc');
        }

        $perPage = (int) ($validated['per_page'] ?? 20);
        $appointments = $query->paginate($perPage);

        return AppointmentResource::collection($appointments);
    }

    /**
     * Create a new appointment.
     */
    public function store(CreateAppointmentRequest $request): JsonResponse
    {
        $appointment = $this->bookingService->createAppointment(
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'تم إنشاء حجز الموعد بنجاح.',
            'data' => new AppointmentResource($appointment->load(['clinic', 'doctor.user', 'bookingCenter'])),
        ], 201);
    }

    /**
     * Check-in an appointment using its single-use secure QR token.
     */
    public function checkIn(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string', 'max:64'],
        ]);

        $appointment = $this->bookingService->checkInAppointmentByToken(
            $request->input('token'),
            $request->user()
        );

        return response()->json([
            'message' => 'تم تأكيد حضور الموعد بنجاح.',
            'data' => new AppointmentResource($appointment),
        ]);
    }

    /**
     * Show single appointment.
     */
    public function show(Request $request, Appointment $appointment): JsonResponse
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
                // Direct resource scoping: Appointment must strictly belong to active clinic context
                if ($activeClinicId && $appointment->clinic_id !== $activeClinicId) {
                    $isAuthorized = false;
                } else {
                    $isAuthorized = $appointment->doctor_id === $doctor->id
                        || ($appointment->clinic_id && $doctor->isDirectorOf($appointment->clinic_id));
                }
            }
        } elseif ($user->hasRole('doctor_assistant')) {
            $assistantClinicId = $user->clinicAssistant?->clinic_id;
            $isAuthorized = $assistantClinicId && $appointment->clinic_id === $assistantClinicId;
        } elseif ($user->hasRole('booking_center')) {
            $centerId = $user->bookingCenter?->id;
            $isAuthorized = $centerId && $appointment->booking_center_id === $centerId;
        } elseif ($user->hasRole('patient_registered') || $user->hasRole('patient_guest')) {
            $patientId = $user->patient?->id;
            $isAuthorized = ($patientId && $appointment->patient_id === $patientId)
                || $appointment->created_by_id === $user->id;
        }

        if (! $isAuthorized) {
            abort(403, 'غير مصرح لك باستعراض تفاصيل هذا الموعد.');
        }

        return response()->json([
            'data' => new AppointmentResource($appointment->load(['clinic', 'doctor.user', 'bookingCenter', 'statusHistory.changer'])),
        ]);
    }

    /**
     * Confirm an appointment (doctor or director).
     */
    public function confirm(UpdateAppointmentStatusRequest $request, Appointment $appointment): JsonResponse
    {
        $confirmed = $this->bookingService->confirmAppointment(
            $appointment,
            $request->user(),
            $request->input('reason')
        );

        return response()->json([
            'message' => 'تم تأكيد الموعد بنجاح وخصم الحصة من الرصيد إن وجدت.',
            'data' => new AppointmentResource($confirmed),
        ]);
    }

    /**
     * Mark an appointment as attended (operational doctor/assistant).
     */
    public function attend(Request $request, Appointment $appointment): JsonResponse
    {
        $attended = $this->bookingService->attendAppointment(
            $appointment,
            $request->user()
        );

        return response()->json([
            'message' => 'تم تسجيل حضور الموعد بنجاح.',
            'data' => new AppointmentResource($attended),
        ]);
    }

    /**
     * Mark an appointment as no-show (operational doctor/assistant).
     */
    public function noShow(UpdateAppointmentStatusRequest $request, Appointment $appointment): JsonResponse
    {
        $noShow = $this->bookingService->markAppointmentNoShow(
            $appointment,
            $request->user(),
            $request->input('reason')
        );

        return response()->json([
            'message' => 'تم تسجيل عدم حضور المريض للموعد (No-Show).',
            'data' => new AppointmentResource($noShow),
        ]);
    }

    /**
     * Cancel an appointment.
     */
    public function cancel(UpdateAppointmentStatusRequest $request, Appointment $appointment): JsonResponse
    {
        $cancelled = $this->bookingService->rejectOrCancelAppointment(
            $appointment,
            $request->user(),
            $request->input('reason', 'إلغاء الموعد بناءً على طلب المستخدم'),
            'cancelled'
        );

        return response()->json([
            'message' => 'تم إلغاء الموعد واسترداد الحصة للرصيد إن وجدت.',
            'data' => new AppointmentResource($cancelled),
        ]);
    }

    /**
     * Reject an appointment.
     */
    public function reject(UpdateAppointmentStatusRequest $request, Appointment $appointment): JsonResponse
    {
        $rejected = $this->bookingService->rejectOrCancelAppointment(
            $appointment,
            $request->user(),
            $request->input('reason', 'رفض الموعد من قبل العيادة'),
            'rejected'
        );

        return response()->json([
            'message' => 'تم رفض الموعد وإعادة الحصة لمركز الحجز.',
            'data' => new AppointmentResource($rejected),
        ]);
    }

    /**
     * Reschedule an appointment to a new slot.
     */
    public function reschedule(RescheduleAppointmentRequest $request, Appointment $appointment): JsonResponse
    {
        $rescheduled = $this->bookingService->rescheduleAppointment(
            $appointment,
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'تم تعديل موعد الحجز بنجاح.',
            'data' => new AppointmentResource($rescheduled->load(['clinic', 'doctor.user', 'patient', 'bookingCenter', 'statusHistory'])),
        ]);
    }

    /**
     * Query available capacity per hourly slot.
     */
    public function slots(Request $request): JsonResponse
    {
        $request->validate([
            'doctor_id' => ['required', 'uuid', 'exists:doctors,id'],
            'clinic_id' => ['required', 'uuid', 'exists:clinics,id'],
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $doctor = Doctor::findOrFail($request->input('doctor_id'));
        $clinic = Clinic::findOrFail($request->input('clinic_id'));

        $slots = $this->bookingService->getAvailableSlots(
            $doctor,
            $clinic,
            $request->input('date')
        );

        return response()->json([
            'data' => [
                'doctor_id' => $doctor->id,
                'clinic_id' => $clinic->id,
                'date' => $request->input('date'),
                'slots' => $slots,
            ],
        ]);
    }
}
