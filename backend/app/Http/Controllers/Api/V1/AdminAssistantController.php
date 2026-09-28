<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateAdminAssistantRequest;
use App\Http\Requests\Admin\UpdateAdminAssistantPermissionsRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAssistantController extends Controller
{
    public function __construct(
        protected AuthorizationService $authorizationService
    ) {}

    /**
     * List all platform admin assistants (Admin only).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $perPage = min(max((int) $request->query('per_page', 20), 1), 100);

        $assistants = User::whereHas('roles', function ($q) {
            $q->where('roles.name', 'admin_assistant');
        })
        ->with(['roles.permissions', 'scopedPermissions' => fn ($q) => $q->where('is_active', true)->with('permission')])
        ->orderBy('created_at', 'desc')
        ->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => UserResource::collection($assistants),
            'meta' => [
                'current_page' => $assistants->currentPage(),
                'last_page' => $assistants->lastPage(),
                'per_page' => $assistants->perPage(),
                'total' => $assistants->total(),
                'from' => $assistants->firstItem(),
                'to' => $assistants->lastItem(),
            ],
            'links' => [
                'first' => $assistants->url(1),
                'last' => $assistants->url($assistants->lastPage()),
                'prev' => $assistants->previousPageUrl(),
                'next' => $assistants->nextPageUrl(),
            ],
        ]);
    }

    /**
     * Create a new platform admin assistant account (Admin only).
     */
    public function store(CreateAdminAssistantRequest $request): JsonResponse
    {
        $user = DB::transaction(function () use ($request) {
            $createdUser = User::create([
                'name' => $request->validated('name'),
                'email' => $request->validated('email'),
                'phone' => $request->validated('phone'),
                'password' => $request->validated('password'),
                'is_active' => true,
            ]);

            $createdUser->assignRole('admin_assistant');

            return $createdUser;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Admin assistant account created successfully.',
            'data' => new UserResource($user->load(['roles.permissions', 'scopedPermissions.permission'])),
        ], 201);
    }

    /**
     * Update individual delegated permissions for platform admin assistant (Admin only).
     */
    public function updatePermissions(UpdateAdminAssistantPermissionsRequest $request, string $id): JsonResponse
    {
        $adminUser = $request->user();
        $assistant = User::whereHas('roles', fn ($q) => $q->where('roles.name', 'admin_assistant'))
            ->findOrFail($id);

        $savedPermissions = $this->authorizationService->delegatePermissions(
            $adminUser,
            $assistant,
            'platform',
            'global',
            $request->validated('permissions')
        );

        $assistant->load(['roles.permissions', 'scopedPermissions' => fn ($q) => $q->where('is_active', true)->with('permission')]);

        return response()->json([
            'status' => 'success',
            'message' => 'Assistant individual permissions updated successfully.',
            'data' => new UserResource($assistant),
            'delegated_permissions' => $savedPermissions,
        ]);
    }

    /**
     * Toggle assistant active status (Admin only).
     */
    public function toggleStatus(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $assistant = User::whereHas('roles', fn ($q) => $q->where('roles.name', 'admin_assistant'))
            ->findOrFail($id);

        $assistant->update([
            'is_active' => ! $assistant->is_active,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Assistant status updated successfully.',
            'data' => new UserResource($assistant->fresh(['roles.permissions', 'scopedPermissions.permission'])),
        ]);
    }

    /**
     * Delete assistant account (Admin only).
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $assistant = User::whereHas('roles', fn ($q) => $q->where('roles.name', 'admin_assistant'))
            ->findOrFail($id);

        $assistant->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Assistant account deleted successfully.',
        ]);
    }
}
