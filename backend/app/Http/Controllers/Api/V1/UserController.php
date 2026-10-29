<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\User;
use App\Http\Controllers\Api\BaseApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class UserController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array($user->role, ['ADMIN', 'OWNER'], true), 403, 'Forbidden: Admin or Owner required to view users');

        return response()->json([
            'status' => 'success',
            'data' => User::select('id', 'name', 'email', 'role', 'is_active', 'created_at')->latest()->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $currentUser = $request->user();
        abort_unless($currentUser && in_array($currentUser->role, ['ADMIN', 'OWNER'], true), 403, 'Forbidden: Admin or Owner required to create users');

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'role' => 'required|string|in:ADMIN,OWNER,STAFF',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $newUser = User::create([
            'name' => $request->input('name'),
            'email' => $request->input('email'),
            'password' => Hash::make($request->input('password')),
            'role' => $request->input('role'),
            'is_active' => $request->input('is_active', true),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'User created successfully',
            'data' => $newUser,
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $currentUser = $request->user();
        abort_unless($currentUser && in_array($currentUser->role, ['ADMIN', 'OWNER'], true), 403, 'Forbidden: Admin or Owner required to update users');

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $user->id,
            'password' => 'sometimes|nullable|string|min:6',
            'role' => 'sometimes|required|string|in:ADMIN,OWNER,STAFF',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = [
            'name' => $request->input('name', $user->name),
            'email' => $request->input('email', $user->email),
            'role' => $request->input('role', $user->role),
            'is_active' => $request->input('is_active', $user->is_active),
        ];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->input('password'));
        }

        $user->update($data);

        return response()->json([
            'status' => 'success',
            'message' => 'User updated successfully',
            'data' => $user,
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $currentUser = $request->user();
        abort_unless($currentUser && in_array($currentUser->role, ['ADMIN', 'OWNER'], true), 403, 'Forbidden: Admin or Owner required to delete users');

        if ($currentUser->id === $user->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot delete your own currently logged in account.',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'User deleted successfully',
        ]);
    }
}
