<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SystemSetupController extends Controller
{
    /**
     * Check if the platform has an active platform administrator initialized.
     */
    public function status(): JsonResponse
    {
        $hasAdmin = User::whereHas('roles', function ($q) {
            $q->where('name', 'admin');
        })->exists();

        return response()->json([
            'status' => 'success',
            'is_initialized' => $hasAdmin,
            'message' => $hasAdmin 
                ? 'تمت تهيئة مسؤول المنصة مسبقاً.' 
                : 'المنصة بحاجة لإنشاء حساب مسؤول النظام الأول.',
        ]);
    }

    /**
     * Human-accessible First Platform Administrator initialization.
     * Strictly permitted ONLY when zero admin accounts exist in the system.
     */
    public function setupAdmin(Request $request): JsonResponse
    {
        $hasAdmin = User::whereHas('roles', function ($q) {
            $q->where('name', 'admin');
        })->exists();

        if ($hasAdmin) {
            return response()->json([
                'status' => 'error',
                'message' => 'تمت تهيئة مسؤول المنصة مسبقاً. لا يمكن إنشاء حساب مسؤول نظام إضافي عبر التهيئة الأولية.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:20', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $result = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'password' => $validated['password'],
                'is_active' => true,
            ]);

            $user->assignRole('admin');

            $token = $user->createToken('auth_token')->plainTextToken;

            return [
                'user' => $user->load('roles.permissions'),
                'token' => $token,
            ];
        });

        return response()->json([
            'status' => 'success',
            'message' => 'تم إنشاء وتفعيل حساب مسؤول المنصة الأول بنجاح.',
            'data' => [
                'user' => new UserResource($result['user']),
                'token' => $result['token'],
                'token_type' => 'Bearer',
            ],
        ], 201);
    }
}
