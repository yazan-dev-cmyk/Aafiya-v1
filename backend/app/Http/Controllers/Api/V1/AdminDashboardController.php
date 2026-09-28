<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BookingCenter;
use App\Models\DiagnosticCenter;
use App\Models\Doctor;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDashboardController extends Controller
{
    /**
     * Get authoritative platform overview statistics for the Admin Dashboard.
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || (! $user->hasRole('admin') && ! $user->hasRole('admin_assistant'))) {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_users' => User::count(),
                'total_doctors' => Doctor::count(),
                'verified_doctors' => Doctor::where('is_verified', true)->count(),
                'pending_doctors' => Doctor::where('is_verified', false)->count(),
                'verified_booking_centers' => BookingCenter::where('verification_status', BookingCenter::STATUS_VERIFIED)->count(),
                'laboratories' => DiagnosticCenter::where('type', 'laboratory')->where('is_active', true)->count(),
                'radiology_centers' => DiagnosticCenter::where('type', 'radiology')->where('is_active', true)->count(),
            ],
        ]);
    }
}
