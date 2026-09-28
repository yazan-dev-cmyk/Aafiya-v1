<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateBookingPolicyRequest;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingPolicyController extends Controller
{
    /**
     * Get active central platform booking policies.
     * Strictly exposes only booking policy keys.
     */
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data'   => [
                'cancellation_cutoff_hours'      => (int) SystemSetting::getValue('booking.cancellation_cutoff_hours', 24),
                'max_daily_bookings_per_patient' => (int) SystemSetting::getValue('booking.max_daily_bookings_per_patient', 5),
            ],
        ]);
    }

    /**
     * Update central platform booking policies (Platform Admin only).
     * Strictly restricted to booking policy keys.
     */
    public function update(UpdateBookingPolicyRequest $request): JsonResponse
    {
        $validated = $request->validated();

        SystemSetting::setValue('booking.cancellation_cutoff_hours', $validated['cancellation_cutoff_hours'], 'integer', 'booking');
        SystemSetting::setValue('booking.max_daily_bookings_per_patient', $validated['max_daily_bookings_per_patient'], 'integer', 'booking');

        return response()->json([
            'status'  => 'success',
            'message' => 'تم تحديث سياسات الحجز والإلغاء المركزية بنجاح.',
            'data'    => [
                'cancellation_cutoff_hours'      => (int) SystemSetting::getValue('booking.cancellation_cutoff_hours', 24),
                'max_daily_bookings_per_patient' => (int) SystemSetting::getValue('booking.max_daily_bookings_per_patient', 5),
            ],
        ]);
    }
}
