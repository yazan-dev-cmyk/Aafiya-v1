<?php

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBookingCenterSettingsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name'    => ['required', 'string', 'max:255'],
            'phone'   => ['required', 'string', 'max:50'],
            'email'   => ['nullable', 'email', 'max:255'],
            'wilaya'  => ['required', 'string', 'max:100'],
            'address' => ['required', 'string', 'max:255'],
            'latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
            'google_maps_link' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'latitude.between' => 'خط العرض الجغرافي يجب أن يكون بين -90 و 90 درجة.',
            'longitude.between' => 'خط الطول الجغرافي يجب أن يكون بين -180 و 180 درجة.',
            'latitude.required_with' => 'يجب توفير خط العرض مع خط الطول.',
            'longitude.required_with' => 'يجب توفير خط الطول مع خط العرض.',
        ];
    }
}
