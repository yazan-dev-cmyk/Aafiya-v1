<?php

namespace App\Http\Requests\Booking;

use App\Services\BookingService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RescheduleAppointmentRequest extends FormRequest
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
            'appointment_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'time_slot' => ['required', 'string', Rule::in(BookingService::ALLOWED_BOOKING_START_SLOTS)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
