<?php

namespace App\Http\Requests\Diagnostics;

use Illuminate\Foundation\Http\FormRequest;

class RegisterDiagnosticCenterRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:laboratory,radiology,imaging_lab'],
            'license_number' => ['nullable', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['required', 'string', 'max:255'],
            'wilaya' => ['required', 'string', 'max:100'],
        ];
    }
}
