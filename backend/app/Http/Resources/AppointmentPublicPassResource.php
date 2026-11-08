<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppointmentPublicPassResource extends JsonResource
{
    /**
     * Transform the resource into an array with strict public data minimization & privacy boundaries.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $status = (string) $this->status;
        $statusLabels = [
            'pending' => ['ar' => 'موعد معلّق', 'en' => 'Pending', 'fr' => 'En attente'],
            'confirmed' => ['ar' => 'موعد مؤكد', 'en' => 'Confirmed', 'fr' => 'Confirmé'],
            'attended' => ['ar' => 'تم الحضور', 'en' => 'Attended', 'fr' => 'Présent'],
            'no_show' => ['ar' => 'لم يحضر', 'en' => 'No Show', 'fr' => 'Absent'],
            'cancelled' => ['ar' => 'ملغى', 'en' => 'Cancelled', 'fr' => 'Annulé'],
            'rejected' => ['ar' => 'مرفوض', 'en' => 'Rejected', 'fr' => 'Refusé'],
            'expired' => ['ar' => 'منتهي الصلاحية', 'en' => 'Expired', 'fr' => 'Expiré'],
            'rescheduled' => ['ar' => 'معاد جدولته', 'en' => 'Rescheduled', 'fr' => 'Reprogrammé'],
        ];

        $labels = $statusLabels[$status] ?? ['ar' => $status, 'en' => $status, 'fr' => $status];

        $patientName = $this->patient_name ?: ($this->patient ? trim($this->patient->first_name . ' ' . $this->patient->last_name) : null);
        $doctorName = $this->doctor?->user?->name;
        $specialty = $this->doctor?->specialty;

        $formattedDate = $this->appointment_date
            ? (is_string($this->appointment_date) ? $this->appointment_date : $this->appointment_date->format('Y-m-d'))
            : null;

        $baseUrl = config('app.frontend_url') ?: config('app.url', 'https://aafiya.site');
        $passUrl = rtrim($baseUrl, '/') . "/ar/appointment/pass/{$this->secure_token}";

        return [
            'booking_reference' => $this->booking_reference,
            'status' => $status,
            'status_label' => $labels,
            'is_active_pass' => in_array($status, ['pending', 'confirmed'], true),
            'appointment_date' => $formattedDate,
            'time_slot' => $this->time_slot,
            'patient_name' => $patientName,
            'doctor' => [
                'name' => $doctorName,
                'specialty' => $specialty,
            ],
            'clinic' => [
                'name' => $this->clinic?->name,
                'wilaya' => $this->clinic?->wilaya,
                'phone' => $this->clinic?->phone,
            ],
            'booking_center' => $this->bookingCenter ? [
                'name' => $this->bookingCenter->name,
            ] : null,
            'qr_pass_url' => $passUrl,
            'instructions' => [
                'ar' => 'يرجى الحضور قبل الموعد بـ 15 دقيقة وإبراز رمز QR عند الاستقبال.',
                'fr' => 'Merci de vous présenter à l\'accueil 15 minutes à l\'avance muni de votre QR code.',
                'en' => 'Please arrive 15 minutes early and present your QR code at the reception desk.',
            ],
        ];
    }
}
