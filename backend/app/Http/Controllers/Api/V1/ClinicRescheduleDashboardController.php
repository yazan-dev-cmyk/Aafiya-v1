<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\VacationAppointmentRescheduleResource;
use App\Models\Clinic;
use App\Models\VacationAppointmentReschedule;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ClinicRescheduleDashboardController extends Controller
{
    /**
     * List urgent unresolved rescheduled appointments strictly for the active clinic context.
     *
     * 4D Authorization:
     * - Layer 1 (Role): doctor, doctor_assistant, admin.
     * - Layer 2 (Position): director, doctor, assistant.
     * - Layer 3 (Scope): Active clinic context resolved via EnsureActiveClinicContext.
     * - Layer 4 (Ceiling): Read-only view for coordination; assistants cannot mutate.
     */
    public function unresolvedAppointments(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $activeClinicId = $this->resolveActiveClinicId($request);

        $this->authorizeClinicStaff($user, $activeClinicId);

        $records = VacationAppointmentReschedule::query()
            ->where('clinic_id', $activeClinicId)
            ->where('status', VacationAppointmentReschedule::STATUS_URGENT_UNRESOLVED)
            ->with([
                'originalAppointment.doctor.user',
                'originalAppointment.patient',
                'replacementAppointment',
                'vacation',
            ])
            ->orderBy('created_at', 'desc')
            ->paginate((int) $request->input('per_page', 20));

        return VacationAppointmentRescheduleResource::collection($records);
    }

    /**
     * Resolve active clinic ID from middleware attributes or request headers.
     */
    protected function resolveActiveClinicId(Request $request): string
    {
        $clinicId = $request->attributes->get('active_clinic_id')
            ?? $request->header('X-Clinic-ID')
            ?? $request->input('clinic_id');

        if (! $clinicId) {
            abort(422, 'معرف العيادة (X-Clinic-ID) مطلوب لعرض لوحة متابعة الحالات غير المحلولة.');
        }

        return (string) $clinicId;
    }

    /**
     * Authorize that the user belongs to the active clinic as an active staff member (Doctor, Director, or Assistant).
     */
    protected function authorizeClinicStaff($user, string $clinicId): void
    {
        if ($user->hasRole('admin')) {
            return;
        }

        if ($user->hasRole('doctor')) {
            $doctor = $user->doctor;
            if (! $doctor || $doctor->is_verified === false) {
                abort(403, 'غير مصرح: حساب الطبيب قيد المراجعة.');
            }

            $isAffiliated = $doctor->clinics()
                ->where('clinics.id', $clinicId)
                ->wherePivot('is_active', true)
                ->exists();

            if (! $isAffiliated) {
                abort(403, 'غير مصرح: الطبيب غير منتسب لهذه العيادة أو حسابه معلق فيها.');
            }

            return;
        }

        if ($user->hasRole('doctor_assistant')) {
            $assistant = $user->clinicAssistant;
            if (! $assistant || (string) $assistant->clinic_id !== (string) $clinicId || ! $assistant->is_active || $assistant->trashed()) {
                abort(403, 'غير مصرح: المساعد غير منتسب لهذه العيادة أو حسابه غير نشط.');
            }

            return;
        }

        abort(403, 'غير مصرح: الوصول إلى لوحة متابعة العيادة محصور في الطاقم الطبي والإداري للعيادة.');
    }
}
