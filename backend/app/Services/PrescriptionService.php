<?php

namespace App\Services;

use App\Models\Clinic;
use App\Models\ClinicalVisit;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\PrescriptionTemplate;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PrescriptionService
{
    /**
     * Issue an official digital prescription with medication items and verification token.
     *
     * @param array<string, mixed> $data
     * @param array<int, array<string, mixed>> $items
     */
    public function createPrescription(array $data, array $items, User $doctorUser): Prescription
    {
        return DB::transaction(function () use ($data, $items, $doctorUser) {
            $doctor = $doctorUser->doctor;
            if (! $doctor) {
                throw ValidationException::withMessages([
                    'doctor' => ['يجب أن يكون المستخدم طبيباً مسجلاً لتحرير وصفة طبية.'],
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

            $visitId = $data['clinical_visit_id'] ?? null;
            if ($visitId) {
                $visit = ClinicalVisit::where('id', $visitId)
                    ->where('clinic_id', $clinic->id)
                    ->where('patient_id', $patient->id)
                    ->first();

                if (! $visit) {
                    throw ValidationException::withMessages([
                        'clinical_visit_id' => ['الاستشارة الكلينيكية غير متطابقة مع المريض أو العيادة.'],
                    ]);
                }
            }

            $reference = $this->generatePrescriptionReference();
            $secureToken = Str::random(48);

            $issueDate = Carbon::parse($data['issue_date'] ?? now())->format('Y-m-d');
            $expiryDays = (int) ($data['validity_days'] ?? 30);
            $expiryDate = Carbon::parse($issueDate)->addDays($expiryDays)->format('Y-m-d');

            $prescription = Prescription::create([
                'prescription_reference' => $reference,
                'secure_token' => $secureToken,
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'clinic_id' => $clinic->id,
                'clinical_visit_id' => $visitId,
                'issue_date' => $issueDate,
                'expiry_date' => $expiryDate,
                'status' => 'active',
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($items as $item) {
                PrescriptionItem::create([
                    'prescription_id' => $prescription->id,
                    'medication_name' => $item['medication_name'],
                    'dosage' => $item['dosage'],
                    'frequency' => $item['frequency'],
                    'duration' => $item['duration'],
                    'instructions' => $item['instructions'] ?? null,
                ]);
            }

            return $prescription->load(['patient', 'doctor.user', 'clinic', 'items']);
        });
    }

    /**
     * Public verification endpoint for QR scanning (P5 Frozen Section 3).
     */
    public function verifyPrescriptionByToken(string $token): array
    {
        $prescription = Prescription::with(['doctor.user', 'clinic', 'patient', 'items'])
            ->where('secure_token', $token)
            ->first();

        if (! $prescription) {
            return [
                'is_valid' => false,
                'verification_status' => 'not_found',
                'message' => 'رمز التحقق غير صالح أو لم يتم العثور على الوصفة الطبية.',
            ];
        }

        $isExpired = $prescription->expiry_date < now()->startOfDay();
        $isVoided = $prescription->status === 'voided';
        $isValid = $prescription->status === 'active' && ! $isExpired;

        return [
            'is_valid' => $isValid,
            'verification_status' => $isVoided ? 'voided' : ($isExpired ? 'expired' : 'active'),
            'prescription_reference' => $prescription->prescription_reference,
            'doctor_name' => $prescription->doctor?->user?->name,
            'doctor_specialty' => $prescription->doctor?->specialty,
            'clinic_name' => $prescription->clinic?->name,
            'patient_name' => $prescription->patient?->full_name,
            'issue_date' => $prescription->issue_date?->format('Y-m-d'),
            'expiry_date' => $prescription->expiry_date?->format('Y-m-d'),
            'items_count' => $prescription->items->count(),
            'items' => $prescription->items->map(fn ($item) => [
                'medication_name' => $item->medication_name,
                'dosage' => $item->dosage,
                'frequency' => $item->frequency,
                'duration' => $item->duration,
                'instructions' => $item->instructions,
            ]),
        ];
    }

    /**
     * Invalidate / Void an active prescription.
     */
    public function voidPrescription(Prescription $prescription, User $doctorUser, string $reason): Prescription
    {
        if (! $doctorUser->doctor || $doctorUser->doctor->id !== $prescription->doctor_id) {
            if (! $doctorUser->hasRole('admin')) {
                throw ValidationException::withMessages([
                    'authorization' => ['غير مصرح لك بإلغاء هذه الوصفة الطبية.'],
                ]);
            }
        }

        $prescription->update([
            'status' => 'voided',
            'notes' => ($prescription->notes ? $prescription->notes . ' | ' : '') . "تم إلغاء الوصفة: {$reason}",
        ]);

        return $prescription->fresh();
    }

    /**
     * Save a prescription template for doctor reusability.
     */
    public function createTemplate(array $data, User $doctorUser): PrescriptionTemplate
    {
        $doctor = $doctorUser->doctor;
        if (! $doctor) {
            throw ValidationException::withMessages([
                'doctor' => ['يجب أن يكون المستخدم طبيباً لإنشاء قالب وصفة طبية.'],
            ]);
        }

        return PrescriptionTemplate::create([
            'doctor_id' => $doctor->id,
            'clinic_id' => $data['clinic_id'] ?? null,
            'template_name' => $data['template_name'],
            'items_json' => $data['items_json'],
            'is_shared' => $data['is_shared'] ?? false,
        ]);
    }

    protected function generatePrescriptionReference(): string
    {
        $year = date('Y');
        $prefix = "RX-{$year}-";

        $latest = Prescription::where('prescription_reference', 'LIKE', "{$prefix}%")
            ->lockForUpdate()
            ->orderBy('prescription_reference', 'desc')
            ->value('prescription_reference');

        if (! $latest) {
            return "{$prefix}0001";
        }

        $lastSeq = (int) substr($latest, strlen($prefix));
        $nextSeq = str_pad((string) ($lastSeq + 1), 4, '0', STR_PAD_LEFT);

        return "{$prefix}{$nextSeq}";
    }
}
