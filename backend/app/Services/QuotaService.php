<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BookingCenter;
use App\Models\BookingPackage;
use App\Models\BookingTransaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QuotaService
{
    /**
     * Purchase a booking package and credit units to booking center.
     */
    public function purchasePackage(BookingCenter $center, BookingPackage $package, User $user): BookingTransaction
    {
        return DB::transaction(function () use ($center, $package, $user) {
            /** @var BookingCenter $lockedCenter */
            $lockedCenter = BookingCenter::where('id', $center->id)->lockForUpdate()->firstOrFail();

            $newBalance = $lockedCenter->quota_balance + $package->quota_units;
            $lockedCenter->update(['quota_balance' => $newBalance]);

            return BookingTransaction::create([
                'booking_center_id' => $lockedCenter->id,
                'booking_package_id' => $package->id,
                'transaction_type' => 'purchase',
                'units' => (int) $package->quota_units,
                'balance_after' => $newBalance,
                'reference_note' => "شراء {$package->name} (+{$package->quota_units} وحدة)",
                'created_by_id' => $user->id,
            ]);
        });
    }

    /**
     * Deduct 1 unit for a confirmed appointment (idempotent, atomic).
     */
    public function deductForAppointment(BookingCenter $center, Appointment $appointment, User $user): ?BookingTransaction
    {
        return DB::transaction(function () use ($center, $appointment, $user) {
            /** @var BookingCenter $lockedCenter */
            $lockedCenter = BookingCenter::where('id', $center->id)->lockForUpdate()->firstOrFail();

            // Idempotency check: verify this appointment has not already been charged
            $existingConfirmation = BookingTransaction::where('booking_center_id', $lockedCenter->id)
                ->where('appointment_id', $appointment->id)
                ->where('transaction_type', 'confirmation')
                ->first();

            if ($existingConfirmation) {
                return $existingConfirmation;
            }

            if ($lockedCenter->quota_balance < 1) {
                throw ValidationException::withMessages([
                    'quota' => ['رصيد الحصص لمركز الحجز غير كافٍ لتأكيد هذا الموعد. يرجى شحن الباقة.'],
                ]);
            }

            $newBalance = $lockedCenter->quota_balance - 1;
            $lockedCenter->update(['quota_balance' => $newBalance]);

            return BookingTransaction::create([
                'booking_center_id' => $lockedCenter->id,
                'appointment_id' => $appointment->id,
                'transaction_type' => 'confirmation',
                'units' => -1,
                'balance_after' => $newBalance,
                'reference_note' => "خصم حصة تأكيد الموعد {$appointment->booking_reference}",
                'created_by_id' => $user->id,
            ]);
        });
    }

    /**
     * Refund 1 unit for a previously confirmed appointment that was cancelled/rejected by clinic.
     */
    public function refundForAppointment(BookingCenter $center, Appointment $appointment, User $user, string $reason): ?BookingTransaction
    {
        return DB::transaction(function () use ($center, $appointment, $user, $reason) {
            /** @var BookingCenter $lockedCenter */
            $lockedCenter = BookingCenter::where('id', $center->id)->lockForUpdate()->firstOrFail();

            // Verify a deduction actually occurred and hasn't been refunded yet
            $hadDeduction = BookingTransaction::where('booking_center_id', $lockedCenter->id)
                ->where('appointment_id', $appointment->id)
                ->where('transaction_type', 'confirmation')
                ->exists();

            if (! $hadDeduction) {
                return null;
            }

            $alreadyRefunded = BookingTransaction::where('booking_center_id', $lockedCenter->id)
                ->where('appointment_id', $appointment->id)
                ->where('transaction_type', 'refund')
                ->exists();

            if ($alreadyRefunded) {
                return null;
            }

            $newBalance = $lockedCenter->quota_balance + 1;
            $lockedCenter->update(['quota_balance' => $newBalance]);

            return BookingTransaction::create([
                'booking_center_id' => $lockedCenter->id,
                'appointment_id' => $appointment->id,
                'transaction_type' => 'refund',
                'units' => 1,
                'balance_after' => $newBalance,
                'reference_note' => "استرداد حصة الموعد {$appointment->booking_reference} - السبب: {$reason}",
                'created_by_id' => $user->id,
            ]);
        });
    }
}
