<?php

namespace App\Http\Requests\Clinic;

use Illuminate\Foundation\Http\FormRequest;

class CreateEmployedDoctorRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        if ($user && $user->hasRole('doctor') && $user->doctor && $user->doctor->is_verified === false) {
            return false;
        }

        return $user !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // User identity
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:20', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:8'],

            // Doctor clinical profile
            'specialty' => ['required', 'string', 'max:255'],
            'license_number' => ['required', 'string', 'max:100', 'unique:doctors,license_number'],
            'bio' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
