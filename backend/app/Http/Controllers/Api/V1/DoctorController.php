<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\DoctorPublicResource;
use App\Services\DoctorService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DoctorController extends Controller
{
    public function __construct(
        protected DoctorService $doctorService
    ) {}

    /**
     * Get public directory of doctors.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['specialty', 'wilaya', 'is_verified', 'search']);
        $perPage = (int) $request->input('per_page', 15);
        $doctors = $this->doctorService->getPublicDoctors($filters, $perPage);

        return response()->json([
            'status' => 'success',
            'data' => DoctorPublicResource::collection($doctors),
            'meta' => [
                'current_page' => $doctors->currentPage(),
                'last_page' => $doctors->lastPage(),
                'per_page' => $doctors->perPage(),
                'total' => $doctors->total(),
                'from' => $doctors->firstItem(),
                'to' => $doctors->lastItem(),
            ],
            'links' => [
                'first' => $doctors->url(1),
                'last' => $doctors->url($doctors->lastPage()),
                'prev' => $doctors->previousPageUrl(),
                'next' => $doctors->nextPageUrl(),
            ],
        ]);
    }

    /**
     * Get public doctor profile.
     */
    public function show(string $id): JsonResponse
    {
        $doctor = $this->doctorService->getDoctorProfile($id);

        return response()->json([
            'status' => 'success',
            'data' => new DoctorPublicResource($doctor),
        ]);
    }

    /**
     * Set doctor verification status (Admin & Authorized Assistant).
     */
    public function verifyDoctor(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasRole('admin') && ! $user->hasPermission('platform.manage_settings')) {
            abort(403, 'Forbidden: Only platform administrators can verify doctor profiles.');
        }

        $doctor = \App\Models\Doctor::findOrFail($id);
        $isVerified = $request->boolean('is_verified', true);
        $updatedDoctor = $this->doctorService->verifyDoctor($doctor, $isVerified);

        // Also activate the doctor's directed clinic if verified
        if ($isVerified) {
            foreach ($updatedDoctor->directedClinics as $clinic) {
                $clinic->update(['is_active' => true]);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => $isVerified ? 'تم اعتماد وتوثيق حساب الطبيب والعيادة بنجاح.' : 'تم إلغاء اعتماد حساب الطبيب.',
            'data' => new DoctorPublicResource($updatedDoctor),
        ]);
    }

    /**
     * List all clinics affiliated with the authenticated doctor.
     */
    public function myClinics(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->hasRole('doctor') || ! $user->doctor) {
            abort(403, 'غير مصرح: هذا المسار مخصص للأطباء فقط.');
        }

        $doctor = $user->doctor;
        $clinics = $doctor->clinics()
            ->withPivot(['id', 'position', 'is_primary', 'is_active', 'joined_at'])
            ->get()
            ->map(function ($clinic) use ($doctor) {
                $position = $clinic->pivot->position ?? ($doctor->isDirectorOf($clinic->id) ? 'director' : 'doctor');
                $isDirector = ($position === 'director') || $doctor->isDirectorOf($clinic->id);

                return [
                    'id' => $clinic->id,
                    'name' => $clinic->name,
                    'wilaya' => $clinic->wilaya,
                    'address' => $clinic->address,
                    'phone' => $clinic->phone,
                    'position' => $position,
                    'is_director' => (bool) $isDirector,
                    'is_active' => (bool) ($clinic->pivot->is_active ?? false),
                    'is_primary' => (bool) ($clinic->pivot->is_primary ?? false),
                    'joined_at' => $clinic->pivot->joined_at ? \Carbon\Carbon::parse($clinic->pivot->joined_at)->toISOString() : null,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $clinics,
        ]);
    }

    /**
     * Get operational statistics for the authenticated doctor in their active clinic context (GAP-01).
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->hasRole('doctor') || ! $user->doctor) {
            return response()->json([
                'status' => 'error',
                'code' => 403,
                'message' => 'غير مصرح: هذا المسار مخصص للأطباء فقط.',
            ], 403);
        }

        $doctor = $user->doctor;
        if ($doctor->is_verified === false) {
            return response()->json([
                'status' => 'error',
                'code' => 403,
                'message' => 'حساب الطبيب قيد المراجعة والتحقق من قبل إدارة المنصة.',
            ], 403);
        }

        $validated = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $date = $validated['date'] ?? Carbon::now('Africa/Algiers')->toDateString();

        $activeClinicId = $request->attributes->get('active_clinic_id');
        $activeClinic = $request->attributes->get('active_clinic');

        // Database-side aggregation leveraging idx_appointments_capacity compound index
        $stats = DB::table('appointments')
            ->leftJoin('clinical_visits', function ($join) {
                $join->on('clinical_visits.appointment_id', '=', 'appointments.id')
                    ->where('clinical_visits.status', '=', 'finalized')
                    ->whereNull('clinical_visits.deleted_at');
            })
            ->where('appointments.doctor_id', $doctor->id)
            ->when($activeClinicId, fn ($q) => $q->where('appointments.clinic_id', $activeClinicId))
            ->where('appointments.appointment_date', $date)
            ->where('appointments.status', '!=', 'rescheduled')
            ->whereNull('appointments.deleted_at')
            ->selectRaw('
                COUNT(appointments.id) as today_total,
                SUM(CASE WHEN appointments.status IN ("pending", "confirmed") AND appointments.checked_in_at IS NULL THEN 1 ELSE 0 END) as pending_check_in,
                SUM(CASE WHEN appointments.status = "attended" AND appointments.checked_in_at IS NOT NULL AND clinical_visits.id IS NULL THEN 1 ELSE 0 END) as in_waiting_room,
                SUM(CASE WHEN clinical_visits.id IS NOT NULL THEN 1 ELSE 0 END) as completed_appointments,
                SUM(CASE WHEN appointments.status = "no_show" THEN 1 ELSE 0 END) as no_show_today
            ')
            ->first();

        // Also count any direct walk-in finalized clinical visits for this date/clinic (appointment_id is null)
        $walkInFinalized = DB::table('clinical_visits')
            ->where('doctor_id', $doctor->id)
            ->when($activeClinicId, fn ($q) => $q->where('clinic_id', $activeClinicId))
            ->where('visit_date', $date)
            ->where('status', 'finalized')
            ->whereNull('appointment_id')
            ->whereNull('deleted_at')
            ->count();

        $completedToday = (int) ($stats->completed_appointments ?? 0) + $walkInFinalized;

        return response()->json([
            'status' => 'success',
            'data' => [
                'today_total' => (int) ($stats->today_total ?? 0),
                'pending_check_in' => (int) ($stats->pending_check_in ?? 0),
                'in_waiting_room' => (int) ($stats->in_waiting_room ?? 0),
                'completed_today' => $completedToday,
                'no_show_today' => (int) ($stats->no_show_today ?? 0),
                'active_clinic_id' => $activeClinicId,
                'active_clinic_name' => $activeClinic?->name,
                'date' => $date,
            ],
        ]);
    }
}

