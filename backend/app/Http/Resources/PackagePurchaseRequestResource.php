<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PackagePurchaseRequestResource extends JsonResource
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
            'request_reference' => $this->request_reference,
            'booking_center_id' => $this->booking_center_id,
            'booking_center' => $this->bookingCenter ? [
                'id' => $this->bookingCenter->id,
                'name' => $this->bookingCenter->name,
                'quota_balance' => (int) $this->bookingCenter->quota_balance,
            ] : null,
            'booking_package_id' => $this->booking_package_id,
            'package_name' => $this->package_name,
            'package_code' => $this->package_code,
            'quota_units' => (int) $this->quota_units,
            'price_dzd' => (float) $this->price_dzd,
            'payment_method' => $this->payment_method,
            'transaction_reference' => $this->transaction_reference,
            'receipt_document_path' => $this->receipt_document_path,
            'status' => $this->status,
            'notes' => $this->notes,
            'reviewed_by' => $this->reviewedBy ? [
                'id' => $this->reviewedBy->id,
                'name' => $this->reviewedBy->name,
            ] : null,
            'reviewed_at' => $this->reviewed_at?->toISOString(),
            'rejection_reason' => $this->rejection_reason,
            'booking_transaction_id' => $this->booking_transaction_id,
            'created_by' => $this->createdBy ? [
                'id' => $this->createdBy->id,
                'name' => $this->createdBy->name,
            ] : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
