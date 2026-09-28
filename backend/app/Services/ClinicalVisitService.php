<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicalVisit;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClinicalVisitService
{
    /**
     * Create a new draft clinical consultation record.
     *
     * @param array<string, mixed> $data
     */
    public function createVisit(array $data, User $doctorUser): ClinicalVisit
    {
        return DB::transaction(function () use ($data, $doctorUser) {
            $doctor = $doctorUser->doctor;
            if (! $doctor) {
                throw ValidationException::withMessages([
                    'doctor' => ['يجب أن يكون المستخدم طبيباً مسجلاً لإنشاء زيارة كلينيكية.'],
                ]);
            }

            $clinic = Clinic::findOrFail($data['clinic_id']);
            $membership = $doctor->clinics()->where('clinics.id', $clinic->id)->first();
            if (! $membership) {
                abort(403, 'غير مصرح: الطبيب غير منتسب لهذه العيادة.');
            }
            if (! ($membership->pivot->is_active ?? false)) {
                abort(403, 'غير مصرح: تم تعليق حساب الطبيب في هذه العيادة.');
            }

            $patient = Patient::findOrFail($data['patient_id']);

            $appointmentId = $data['appointment_id'] ?? null;
            if ($appointmentId) {
                $appointment = Appointment::where('id', $appointmentId)
                    ->where('clinic_id', $clinic->id)
                    ->first();

                if (! $appointment) {
                    throw ValidationException::withMessages([
                        'appointment_id' => ['الموعد المحدد غير صالح أو غير تابع لهذه العيادة.'],
                    ]);
                }
            }

            $visitRef = $this->generateVisitReference();

            return ClinicalVisit::create([
                'visit_reference' => $visitRef,
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'clinic_id' => $clinic->id,
                'appointment_id' => $appointmentId,
                'visit_date' => Carbon::parse($data['visit_date'] ?? now())->format('Y-m-d'),
                'chief_complaint' => $data['chief_complaint'],
                'vital_signs_json' => $data['vital_signs_json'] ?? null,
                'physical_examination' => $data['physical_examination'] ?? null,
                'diagnosis' => $data['diagnosis'] ?? null,
                'clinical_notes' => $data['clinical_notes'] ?? null,
                'status' => 'draft',
            ]);
        });
    }

    /**
     * Update an editable draft clinical visit.
     *
     * @param array<string, mixed> $data
     */
    public function updateDraftVisit(ClinicalVisit $visit, array $data, User $doctorUser): ClinicalVisit
    {
        // Record Immutability (P4 / P10 Frozen): Signed records are LOCKED!
        if ($visit->isFinalized()) {
            throw ValidationException::withMessages([
                'status' => ['السجل الكلينيكي معتمد ومقفل ولا يمكن تعديله (قاعدة تجميد السجلات P4/P10).'],
            ]);
        }

        $this->authorizeTreatingDoctor($visit, $doctorUser);

        $visit->update(array_filter([
            'chief_complaint' => $data['chief_complaint'] ?? $visit->chief_complaint,
            'vital_signs_json' => $data['vital_signs_json'] ?? $visit->vital_signs_json,
            'physical_examination' => $data['physical_examination'] ?? $visit->physical_examination,
            'diagnosis' => $data['diagnosis'] ?? $visit->diagnosis,
            'clinical_notes' => $data['clinical_notes'] ?? $visit->clinical_notes,
            'visit_date' => isset($data['visit_date']) ? Carbon::parse($data['visit_date'])->format('Y-m-d') : $visit->visit_date,
        ], fn ($val) => $val !== null));

        return $visit->fresh();
    }

    /**
     * Update vital signs intake (Allowed for Assistant & Treating Doctor).
     *
     * @param array<string, mixed> $vitalSigns
     */
    public function updateVitalSigns(ClinicalVisit $visit, array $vitalSigns, User $user): ClinicalVisit
    {
        if ($visit->isFinalized()) {
            throw ValidationException::withMessages([
                'status' => ['السجل الكلينيكي معتمد ومقفل ولا يمكن تعديل علاماته الحيوية.'],
            ]);
        }

        // Assistant can only update vital signs if affiliated with the visit's clinic
        if ($user->hasRole('doctor_assistant')) {
            if ($user->clinicAssistant?->clinic_id !== $visit->clinic_id) {
                throw ValidationException::withMessages([
                    'authorization' => ['المساعد غير تابع لعيادة هذا السجل الطبي.'],
                ]);
            }
        } elseif ($user->hasRole('doctor')) {
            $this->authorizeTreatingDoctor($visit, $user);
        } elseif (! $user->hasRole('admin')) {
            throw ValidationException::withMessages([
                'authorization' => ['غير مصرح لك بتسجيل العلامات الحيوية.'],
            ]);
        }

        $currentVitals = $visit->vital_signs_json ?? [];
        $mergedVitals = array_merge($currentVitals, $vitalSigns);

        $visit->update(['vital_signs_json' => $mergedVitals]);

        return $visit->fresh();
    }

    /**
     * Finalize and sign a clinical record (Locks the record permanently).
     */
    public function finalizeVisit(ClinicalVisit $visit, User $doctorUser): ClinicalVisit
    {
        if ($visit->isFinalized()) {
            return $visit;
        }

        $this->authorizeTreatingDoctor($visit, $doctorUser);

        if (empty($visit->diagnosis)) {
            throw ValidationException::withMessages([
                'diagnosis' => ['يجب تحديد التشخيص الطبي قبل الاعتماد النهائي وإقفال السجل.'],
            ]);
        }

        $visit->update([
            'status' => 'finalized',
            'finalized_at' => now(),
            'finalized_by_id' => $doctorUser->id,
        ]);

        return $visit->fresh(['patient', 'doctor.user', 'clinic', 'finalizedBy']);
    }

    /**
     * Enforce Clinical Privacy Wall visibility level (P4 Section 1.1 Matrix).
     */
    public function getPrivacyLevel(ClinicalVisit $visit, User $user): string
    {
        // Admin
        if ($user->hasRole('admin')) {
            return 'full';
        }

        // Patient viewing their own record
        if ($visit->patient->user_id && $visit->patient->user_id === $user->id) {
            return 'full';
        }

        // The treating doctor
        if ($user->doctor && $user->doctor->id === $visit->doctor_id) {
            return 'full';
        }

        // Clinic Assistant: Intake data only (Demographics + Vital signs)
        if ($user->hasRole('doctor_assistant') && $user->clinicAssistant?->clinic_id === $visit->clinic_id) {
            return 'intake_only';
        }

        // Clinic Director: Managerial Meta only (Privacy Wall blocks confidential diagnosis & notes)
        if ($user->doctor && $user->doctor->isDirectorOf($visit->clinic_id)) {
            return 'meta_only';
        }

        return 'forbidden';
    }

    /**
     * Generate thread-safe sequential visit reference in VIS-YYYY-XXXX format.
     */
    protected function generateVisitReference(): string
    {
        $year = date('Y');
        $prefix = "VIS-{$year}-";

        $latest = ClinicalVisit::where('visit_reference', 'LIKE', "{$prefix}%")
            ->lockForUpdate()
            ->orderBy('visit_reference', 'desc')
            ->value('visit_reference');

        if (! $latest) {
            return "{$prefix}0001";
        }

        $lastSeq = (int) substr($latest, strlen($prefix));
        $nextSeq = str_pad((string) ($lastSeq + 1), 4, '0', STR_PAD_LEFT);

        return "{$prefix}{$nextSeq}";
    }

    protected function authorizeTreatingDoctor(ClinicalVisit $visit, User $user): void
    {
        if ($user->hasRole('admin')) {
            return;
        }

        if (! $user->doctor || $user->doctor->id !== $visit->doctor_id) {
            throw ValidationException::withMessages([
                'authorization' => ['غير مصرح لك بتعديل أو إقفال هذا السجل الطبي (مقتصر على الطبيب المعالج حصراً).'],
            ]);
        }
    }
}
