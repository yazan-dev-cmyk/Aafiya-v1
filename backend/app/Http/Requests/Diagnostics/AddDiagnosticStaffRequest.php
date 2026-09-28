<?php

namespace App\Http\Requests\Diagnostics;

use Illuminate\Foundation\Http\FormRequest;

class AddDiagnosticStaffRequest extends FormRequest
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
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'phone' => ['required', 'string', 'max:50'],
            'role_type' => ['required', 'string', 'in:assistant,technician,validator'],
        ];
    }
}
