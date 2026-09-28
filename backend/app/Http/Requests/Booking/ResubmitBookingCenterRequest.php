<?php

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;

class ResubmitBookingCenterRequest extends FormRequest
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
            'name'                => ['sometimes', 'string', 'max:255'],
            'commercial_register' => ['sometimes', 'nullable', 'string', 'max:100'],
            'phone'               => ['sometimes', 'string', 'max:20'],
            'wilaya'              => ['sometimes', 'string', 'max:100'],
            'address'             => ['sometimes', 'string', 'max:255'],
        ];
    }
}
