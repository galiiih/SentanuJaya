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

        $users = User::select('id', 'full_name as name', 'email', 'role', 'is_active', 'created_at')->latest()->get();

        return response()->json([
            'status' => 'success',
            'data' => $users,
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

        $email = $request->input('email');
        $username = explode('@', $email)[0];
        $baseUsername = $username;
        $counter = 1;
        while (User::where('username', $username)->exists()) {
            $username = $baseUsername . $counter++;
        }

        $newUser = User::create([
            'username' => $username,
            'full_name' => $request->input('name'),
            'email' => $email,
            'password' => Hash::make($request->input('password')),
            'role' => $request->input('role'),
            'is_active' => $request->input('is_active', true),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'User created successfully',
            'data' => [
                'id' => $newUser->id,
                'name' => $newUser->full_name,
                'email' => $newUser->email,
                'role' => $newUser->role,
                'is_active' => $newUser->is_active,
                'created_at' => $newUser->created_at,
            ],
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
            'full_name' => $request->input('name', $user->full_name),
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
            'data' => [
                'id' => $user->id,
                'name' => $user->full_name,
                'email' => $user->email,
                'role' => $user->role,
                'is_active' => $user->is_active,
                'created_at' => $user->created_at,
            ],
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
