<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClinicEscalationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $payload = is_array($this->payload) ? $this->payload : [];
        $origPayload = is_array($payload['original_payload'] ?? null) ? $payload['original_payload'] : [];

        $appointment = $this->appointment;
        $patient = $appointment?->patient;
        $doctor = $appointment?->doctor;
        $clinic = $appointment?->clinic;

        $patientName = $patient?->user?->name
            ?? ($patient ? trim(($patient->first_name ?? '') . ' ' . ($patient->last_name ?? '')) : null)
            ?? 'مريض';

        $patientPhone = $payload['patient_phone']
            ?? $patient?->phone
            ?? $patient?->user?->phone
            ?? $this->recipient_phone;

        $doctorName = $doctor?->user?->name ?? 'طبيب العيادة';
        $clinicName = $payload['clinic_name'] ?? $clinic?->name ?? 'العيادة';

        return [
            'id' => $this->id,
            'appointment_id' => $this->appointment_id,
            'patient_name' => $patientName,
            'patient_phone' => $patientPhone,
            'doctor_name' => $doctorName,
            'clinic_id' => $clinic?->id ?? $payload['clinic_id'] ?? null,
            'clinic_name' => $clinicName,
            'escalation_reason' => $payload['escalation_reason'] ?? 'PATIENT_UNREAD_SLA_EXPIRED_24H',
            'instruction' => $payload['instruction'] ?? 'يرجى التواصل الهاتفي المباشر مع المريض لتأكيد علمه بالموعد البديل أو بترتيب موعد آخر.',
            'original_date' => $origPayload['original_date'] ?? null,
            'original_time_slot' => $origPayload['original_time_slot'] ?? null,
            'replacement_appointment_id' => $origPayload['replacement_appointment_id'] ?? null,
            'new_date' => $origPayload['new_date'] ?? null,
            'new_slot' => $origPayload['new_slot'] ?? null,
            'escalated_at' => $this->created_at?->toIso8601String(),
            'acknowledged_at' => $this->acknowledged_at?->toIso8601String(),
            'is_acknowledged' => $this->acknowledged_at !== null,
        ];
    }
}
