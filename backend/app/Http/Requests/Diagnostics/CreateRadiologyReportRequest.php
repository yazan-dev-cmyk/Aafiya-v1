<?php

namespace App\Http\Requests\Diagnostics;

use Illuminate\Foundation\Http\FormRequest;

class CreateRadiologyReportRequest extends FormRequest
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
            'modality' => ['required', 'string', 'max:50'],
            'study_instance_uid' => ['nullable', 'string', 'max:100'],
            'image_urls_json' => ['nullable', 'array'],
            'findings' => ['nullable', 'string', 'max:5000'],
            'impression' => ['nullable', 'string', 'max:5000'],
            'recommendations' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
