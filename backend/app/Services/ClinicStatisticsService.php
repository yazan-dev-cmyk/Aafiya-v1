<?php

namespace App\Services;

use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClinicStatisticsService
{
    /**
     * Retrieve clinic doctor statistics according to active clinic context and filters.
     *
     * @param Clinic $clinic
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     * @throws ValidationException
     */
    public function getClinicDoctorStats(Clinic $clinic, array $filters): array
    {
        $activeClinicId = $clinic->id;

        // 1. Date defaulting contract (Section 9)
        $fromDate = $filters['from_date'] ?? null;
        $toDate = $filters['to_date'] ?? null;

        if (! $fromDate && ! $toDate) {
            $today = Carbon::today()->toDateString();
            $fromDate = $today;
            $toDate = $today;
        } elseif ($fromDate && ! $toDate) {
            $toDate = $fromDate;
        }

        $doctorId = ! empty($filters['doctor_id']) ? $filters['doctor_id'] : null;

        // 2. Doctor affiliation validation (Sections 10 & 11)
        if ($doctorId) {
            $hasInactivePivot = DoctorClinic::where('doctor_id', $doctorId)
                ->where('clinic_id', $activeClinicId)
                ->where('is_active', false)
                ->exists();

            $hasActiveAffiliation = DoctorClinic::where('doctor_id', $doctorId)
                ->where('clinic_id', $activeClinicId)
                ->where('is_active', true)
                ->exists();

            $isDirectorOfClinic = Clinic::where('id', $activeClinicId)
                ->where('director_doctor_id', $doctorId)
                ->exists();

            if ($hasInactivePivot || (! $hasActiveAffiliation && ! $isDirectorOfClinic)) {
                throw ValidationException::withMessages([
                    'doctor_id' => ['الطبيب المحدد غير منتسب لهذه العيادة.'],
                ]);
            }

            return $this->getSingleDoctorStats($clinic, $doctorId, $fromDate, $toDate);
        }

        return $this->getAllDoctorsStats($clinic, $fromDate, $toDate);
    }

    /**
     * Compute statistics for a specific verified doctor in the clinic.
     *
     * @param Clinic $clinic
     * @param string $doctorId
     * @param string $fromDate
     * @param string $toDate
     * @return array<string, mixed>
     */
    protected function getSingleDoctorStats(Clinic $clinic, string $doctorId, string $fromDate, string $toDate): array
    {
        $doctor = Doctor::with('user')->findOrFail($doctorId);
        $position = $doctor->getPositionInClinic($clinic->id) ?? ($clinic->director_doctor_id === $doctor->id ? 'director' : 'doctor');

        // Appointment-level metrics with left join to finalized clinical visits
        $appointmentStats = DB::table('appointments')
            ->leftJoin('clinical_visits', function ($join) {
                $join->on('clinical_visits.appointment_id', '=', 'appointments.id')
                    ->where('clinical_visits.status', '=', 'finalized')
                    ->whereNull('clinical_visits.deleted_at');
            })
            ->where('appointments.clinic_id', $clinic->id)
            ->where('appointments.doctor_id', $doctorId)
            ->whereBetween('appointments.appointment_date', [$fromDate, $toDate])
            ->whereNull('appointments.deleted_at')
            ->selectRaw('
                COUNT(DISTINCT CASE WHEN appointments.status != "rescheduled" THEN appointments.id END) as total_appointments,
                COUNT(DISTINCT CASE WHEN appointments.status IN ("pending", "confirmed") AND appointments.checked_in_at IS NULL THEN appointments.id END) as pending_check_in,
                COUNT(DISTINCT CASE WHEN appointments.status = "attended" AND appointments.checked_in_at IS NOT NULL AND clinical_visits.id IS NULL THEN appointments.id END) as in_waiting_room,
                COUNT(DISTINCT CASE WHEN clinical_visits.id IS NOT NULL AND clinical_visits.status = "finalized" THEN appointments.id END) as completed,
                COUNT(DISTINCT CASE WHEN appointments.status = "no_show" THEN appointments.id END) as no_show,
                COUNT(DISTINCT CASE WHEN appointments.status = "cancelled" THEN appointments.id END) as cancelled,
                COUNT(DISTINCT CASE WHEN appointments.status = "rejected" THEN appointments.id END) as rejected,
                COUNT(DISTINCT CASE WHEN appointments.status = "expired" THEN appointments.id END) as expired,
                COUNT(DISTINCT CASE WHEN appointments.status = "rescheduled" THEN appointments.id END) as rescheduled
            ')
            ->first();

        // Direct walk-in finalized clinical visits (appointment_id IS NULL)
        $walkInVisits = DB::table('clinical_visits')
            ->where('clinic_id', $clinic->id)
            ->where('doctor_id', $doctorId)
            ->whereNull('appointment_id')
            ->where('status', 'finalized')
            ->whereBetween('visit_date', [$fromDate, $toDate])
            ->whereNull('deleted_at')
            ->count();

        $summary = [
            'total_appointments' => (int) ($appointmentStats->total_appointments ?? 0),
            'pending_check_in' => (int) ($appointmentStats->pending_check_in ?? 0),
            'in_waiting_room' => (int) ($appointmentStats->in_waiting_room ?? 0),
            'completed' => (int) ($appointmentStats->completed ?? 0),
            'no_show' => (int) ($appointmentStats->no_show ?? 0),
            'cancelled' => (int) ($appointmentStats->cancelled ?? 0),
            'rejected' => (int) ($appointmentStats->rejected ?? 0),
            'expired' => (int) ($appointmentStats->expired ?? 0),
            'rescheduled' => (int) ($appointmentStats->rescheduled ?? 0),
            'walk_in_visits' => (int) $walkInVisits,
        ];

        return [
            'clinic' => [
                'id' => $clinic->id,
                'name' => $clinic->name,
            ],
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'doctor_id' => $doctorId,
            ],
            'summary' => $summary,
            'selected_doctor' => [
                'id' => $doctor->id,
                'name' => $doctor->user?->name ?? '—',
                'specialty' => $doctor->specialty,
                'position' => $position,
            ],
        ];
    }

    /**
     * Compute statistics for all affiliated doctors in the clinic (Case A).
     *
     * @param Clinic $clinic
     * @param string $fromDate
     * @param string $toDate
     * @return array<string, mixed>
     */
    protected function getAllDoctorsStats(Clinic $clinic, string $fromDate, string $toDate): array
    {
        // 1. Clinic-wide summary query (Single SQL pass)
        $clinicAppointmentStats = DB::table('appointments')
            ->leftJoin('clinical_visits', function ($join) {
                $join->on('clinical_visits.appointment_id', '=', 'appointments.id')
                    ->where('clinical_visits.status', '=', 'finalized')
                    ->whereNull('clinical_visits.deleted_at');
            })
            ->where('appointments.clinic_id', $clinic->id)
            ->whereBetween('appointments.appointment_date', [$fromDate, $toDate])
            ->whereNull('appointments.deleted_at')
            ->selectRaw('
                COUNT(DISTINCT CASE WHEN appointments.status != "rescheduled" THEN appointments.id END) as total_appointments,
                COUNT(DISTINCT CASE WHEN appointments.status IN ("pending", "confirmed") AND appointments.checked_in_at IS NULL THEN appointments.id END) as pending_check_in,
                COUNT(DISTINCT CASE WHEN appointments.status = "attended" AND appointments.checked_in_at IS NOT NULL AND clinical_visits.id IS NULL THEN appointments.id END) as in_waiting_room,
                COUNT(DISTINCT CASE WHEN clinical_visits.id IS NOT NULL AND clinical_visits.status = "finalized" THEN appointments.id END) as completed,
                COUNT(DISTINCT CASE WHEN appointments.status = "no_show" THEN appointments.id END) as no_show,
                COUNT(DISTINCT CASE WHEN appointments.status = "cancelled" THEN appointments.id END) as cancelled,
                COUNT(DISTINCT CASE WHEN appointments.status = "rejected" THEN appointments.id END) as rejected,
                COUNT(DISTINCT CASE WHEN appointments.status = "expired" THEN appointments.id END) as expired,
                COUNT(DISTINCT CASE WHEN appointments.status = "rescheduled" THEN appointments.id END) as rescheduled
            ')
            ->first();

        $clinicWalkInVisits = DB::table('clinical_visits')
            ->where('clinic_id', $clinic->id)
            ->whereNull('appointment_id')
            ->where('status', 'finalized')
            ->whereBetween('visit_date', [$fromDate, $toDate])
            ->whereNull('deleted_at')
            ->count();

        $summary = [
            'total_appointments' => (int) ($clinicAppointmentStats->total_appointments ?? 0),
            'pending_check_in' => (int) ($clinicAppointmentStats->pending_check_in ?? 0),
            'in_waiting_room' => (int) ($clinicAppointmentStats->in_waiting_room ?? 0),
            'completed' => (int) ($clinicAppointmentStats->completed ?? 0),
            'no_show' => (int) ($clinicAppointmentStats->no_show ?? 0),
            'cancelled' => (int) ($clinicAppointmentStats->cancelled ?? 0),
            'rejected' => (int) ($clinicAppointmentStats->rejected ?? 0),
            'expired' => (int) ($clinicAppointmentStats->expired ?? 0),
            'rescheduled' => (int) ($clinicAppointmentStats->rescheduled ?? 0),
            'walk_in_visits' => (int) $clinicWalkInVisits,
        ];

        // 2. Load active affiliated clinic doctors (with user details)
        $doctorsCollection = $clinic->doctors()
            ->with('user')
            ->wherePivot('is_active', true)
            ->get();

        if ($clinic->director_doctor_id && ! $doctorsCollection->contains('id', $clinic->director_doctor_id)) {
            $directorDoc = $clinic->directorDoctor()->with('user')->first();
            if ($directorDoc) {
                $doctorsCollection->prepend($directorDoc);
            }
        }

        // 3. Per-doctor aggregation query grouped by doctor_id (Zero N+1)
        $doctorAppointmentStats = DB::table('appointments')
            ->leftJoin('clinical_visits', function ($join) {
                $join->on('clinical_visits.appointment_id', '=', 'appointments.id')
                    ->where('clinical_visits.status', '=', 'finalized')
                    ->whereNull('clinical_visits.deleted_at');
            })
            ->where('appointments.clinic_id', $clinic->id)
            ->whereBetween('appointments.appointment_date', [$fromDate, $toDate])
            ->whereNull('appointments.deleted_at')
            ->groupBy('appointments.doctor_id')
            ->selectRaw('
                appointments.doctor_id,
                COUNT(DISTINCT CASE WHEN appointments.status != "rescheduled" THEN appointments.id END) as total_appointments,
                COUNT(DISTINCT CASE WHEN appointments.status IN ("pending", "confirmed") AND appointments.checked_in_at IS NULL THEN appointments.id END) as pending_check_in,
                COUNT(DISTINCT CASE WHEN appointments.status = "attended" AND appointments.checked_in_at IS NOT NULL AND clinical_visits.id IS NULL THEN appointments.id END) as in_waiting_room,
                COUNT(DISTINCT CASE WHEN clinical_visits.id IS NOT NULL AND clinical_visits.status = "finalized" THEN appointments.id END) as completed,
                COUNT(DISTINCT CASE WHEN appointments.status = "no_show" THEN appointments.id END) as no_show,
                COUNT(DISTINCT CASE WHEN appointments.status = "cancelled" THEN appointments.id END) as cancelled,
                COUNT(DISTINCT CASE WHEN appointments.status = "rejected" THEN appointments.id END) as rejected,
                COUNT(DISTINCT CASE WHEN appointments.status = "expired" THEN appointments.id END) as expired,
                COUNT(DISTINCT CASE WHEN appointments.status = "rescheduled" THEN appointments.id END) as rescheduled
            ')
            ->get()
            ->keyBy('doctor_id');

        $doctorWalkInStats = DB::table('clinical_visits')
            ->where('clinic_id', $clinic->id)
            ->whereNull('appointment_id')
            ->where('status', 'finalized')
            ->whereBetween('visit_date', [$fromDate, $toDate])
            ->whereNull('deleted_at')
            ->groupBy('doctor_id')
            ->selectRaw('doctor_id, COUNT(id) as walk_in_visits')
            ->get()
            ->keyBy('doctor_id');

        $doctorsList = [];
        foreach ($doctorsCollection as $doc) {
            $aptStat = $doctorAppointmentStats->get($doc->id);
            $walkInCount = $doctorWalkInStats->get($doc->id)?->walk_in_visits ?? 0;
            $position = $doc->pivot?->position ?? ($clinic->director_doctor_id === $doc->id ? 'director' : 'doctor');

            $doctorsList[] = [
                'id' => $doc->id,
                'name' => $doc->user?->name ?? '—',
                'specialty' => $doc->specialty,
                'position' => $position,
                'metrics' => [
                    'total_appointments' => (int) ($aptStat->total_appointments ?? 0),
                    'pending_check_in' => (int) ($aptStat->pending_check_in ?? 0),
                    'in_waiting_room' => (int) ($aptStat->in_waiting_room ?? 0),
                    'completed' => (int) ($aptStat->completed ?? 0),
                    'no_show' => (int) ($aptStat->no_show ?? 0),
                    'cancelled' => (int) ($aptStat->cancelled ?? 0),
                    'rejected' => (int) ($aptStat->rejected ?? 0),
                    'expired' => (int) ($aptStat->expired ?? 0),
                    'rescheduled' => (int) ($aptStat->rescheduled ?? 0),
                    'walk_in_visits' => (int) $walkInCount,
                ],
            ];
        }

        return [
            'clinic' => [
                'id' => $clinic->id,
                'name' => $clinic->name,
            ],
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'doctor_id' => null,
            ],
            'summary' => $summary,
            'doctors' => $doctorsList,
        ];
    }
}
