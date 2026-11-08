<?php

namespace App\Http\Requests\Marketing\Ticker;

use App\Models\AdvertisementPlacement;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ManagePlacementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->hasRole('admin');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'destination' => ['required', 'string', Rule::in(AdvertisementPlacement::DESTINATIONS)],
            'audience' => ['required', 'string', Rule::in(AdvertisementPlacement::AUDIENCES)],
        ];
    }
}
