<?php

namespace App\Http\Requests\Marketing;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAdvertisementRequest extends FormRequest
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
            'clinic_id' => ['nullable', 'uuid', 'exists:clinics,id'],
            'doctor_id' => ['nullable', 'uuid', 'exists:doctors,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'content' => ['sometimes', 'required', 'string', 'max:5000'],
            'banner_image_url' => ['nullable', 'string', 'max:1000'],
            'target_url' => ['nullable', 'string', 'max:1000'],
            'placement' => ['nullable', 'string', 'in:home_banner,sidebar,search_top,category_sponsor'],
            'target_role' => ['nullable', 'string', 'in:patient,doctor,all'],
            'target_specialty' => ['nullable', 'string', 'max:100'],
            'target_wilaya' => ['nullable', 'string', 'max:100'],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d'],
        ];
    }
}
