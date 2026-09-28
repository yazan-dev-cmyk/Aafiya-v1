<?php

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;

class CreateAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'clinic_id' => ['required', 'uuid', 'exists:clinics,id'],
            'doctor_id' => ['required', 'uuid', 'exists:doctors,id'],
            'patient_id' => ['nullable', 'uuid'],
            'patient_name' => ['required', 'string', 'max:255'],
            'patient_phone' => ['required', 'string', 'max:50'],
            'patient_mrn' => ['nullable', 'string', 'max:50'],
            'patient_national_id' => ['nullable', 'string', 'max:50'],
            'booking_center_id' => ['nullable', 'uuid', 'exists:booking_centers,id'],
            'appointment_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'time_slot' => ['required', 'string', 'max:5'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
