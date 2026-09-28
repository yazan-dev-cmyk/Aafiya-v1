<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBookingPolicyRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->hasRole('admin');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'cancellation_cutoff_hours'      => ['required', 'integer', 'min:1', 'max:168'],
            'max_daily_bookings_per_patient' => ['required', 'integer', 'min:1', 'max:50'],
        ];
    }

    /**
     * Custom message when forbidden.
     */
    protected function failedAuthorization()
    {
        abort(403, 'غير مصرح: تعديل سياسات الحجز مقتصر حصرياً على مدير المنصة (Platform Admin).');
    }
}
