<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingTransactionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'booking_center_id' => $this->booking_center_id,
            'appointment' => $this->appointment ? [
                'id' => $this->appointment->id,
                'booking_reference' => $this->appointment->booking_reference,
                'patient_name' => $this->appointment->patient_name,
            ] : null,
            'package' => $this->package ? [
                'id' => $this->package->id,
                'package_code' => $this->package->package_code,
                'name' => $this->package->name,
            ] : null,
            'transaction_type' => $this->transaction_type,
            'units' => (int) $this->units,
            'balance_after' => (int) $this->balance_after,
            'reference_note' => $this->reference_note,
            'created_by' => $this->creator?->name,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
