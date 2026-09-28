<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\BookingPackageResource;
use App\Models\BookingPackage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BookingPackageController extends Controller
{
    /**
     * List all active booking packages.
     */
    public function index(): AnonymousResourceCollection
    {
        $packages = BookingPackage::where('is_active', true)
            ->orderBy('quota_units', 'asc')
            ->get();

        return BookingPackageResource::collection($packages);
    }

    /**
     * Show single package.
     */
    public function show(BookingPackage $bookingPackage): JsonResponse
    {
        return response()->json([
            'data' => new BookingPackageResource($bookingPackage),
        ]);
    }

    /**
     * Create a new booking package (Platform Admin or delegated Admin Assistant).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->authorizePackageManagement($user);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'package_code' => ['required', 'string', 'max:50', 'unique:booking_packages,package_code'],
            'quota_units' => ['required', 'integer', 'min:1'],
            'price_dzd' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $package = BookingPackage::create([
            'name' => $data['name'],
            'package_code' => $data['package_code'],
            'quota_units' => $data['quota_units'],
            'price_dzd' => $data['price_dzd'],
            'description' => $data['description'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'تم إنشاء باقة الحجز بنجاح.',
            'data' => new BookingPackageResource($package),
        ], 201);
    }

    /**
     * Update an existing booking package.
     */
    public function update(Request $request, BookingPackage $bookingPackage): JsonResponse
    {
        $user = $request->user();
        $this->authorizePackageManagement($user);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'package_code' => ['sometimes', 'string', 'max:50', 'unique:booking_packages,package_code,' . $bookingPackage->id],
            'quota_units' => ['sometimes', 'integer', 'min:1'],
            'price_dzd' => ['sometimes', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $bookingPackage->update($data);

        return response()->json([
            'message' => 'تم تحديث باقة الحجز بنجاح.',
            'data' => new BookingPackageResource($bookingPackage->fresh()),
        ]);
    }

    /**
     * Deactivate a booking package.
     */
    public function destroy(Request $request, BookingPackage $bookingPackage): JsonResponse
    {
        $user = $request->user();
        $this->authorizePackageManagement($user);

        $bookingPackage->update(['is_active' => false]);

        return response()->json([
            'message' => 'تم إلغاء تفعيل باقة الحجز بنجاح.',
        ]);
    }

    /**
     * Authorize package catalog management.
     */
    protected function authorizePackageManagement(?\App\Models\User $user): void
    {
        if (! $user) {
            abort(401, 'يجب تسجيل الدخول لتنفيذ هذا الإجراء.');
        }

        if ($user->hasRole('admin')) {
            return;
        }

        if ($user->hasRole('admin_assistant') && $user->has4DAccess('platform.approve_requests')) {
            return;
        }

        abort(403, 'غير مصرح لك بإدارة باقات الحجز. هذه العملية مقتصرة على المشرف العام أو المساعد المفوض.');
    }
}
