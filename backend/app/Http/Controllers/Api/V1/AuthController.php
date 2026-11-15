<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends BaseApiController
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);
        $key = strtolower($credentials['email']) . '|' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            return $this->sendError(__('auth.throttle', ['seconds' => RateLimiter::availableIn($key)]), [], 429);
        }

        $credentials['is_active'] = true;

        if (!Auth::attempt($credentials, $request->boolean('remember'))) {
            RateLimiter::hit($key, 60);
            throw ValidationException::withMessages(['email' => [__('auth.failed')]]);
        }

        RateLimiter::clear($key);
        $request->session()->regenerate();

        return $this->sendResponse($this->userData($request->user()), __('auth.logged_in'));
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:12', 'confirmed', 'different:current_password'],
        ]);
        $user = $request->user();
        if (!Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => ['Password saat ini tidak sesuai.']]);
        }
        $user->forceFill(['password' => Hash::make($validated['password']), 'must_change_password' => false])->save();
        $request->session()->regenerate();
        return $this->sendResponse($this->userData($user->fresh()), 'Password berhasil diperbarui.');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->sendResponse($this->userData($request->user()), __('auth.user_retrieved'));
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return $this->sendResponse([], __('auth.logged_out'));
    }

    private function userData($user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->full_name ?: $user->username,
            'email' => $user->email,
            'role' => $user->role,
            'must_change_password' => (bool) $user->must_change_password,
        ];
    }
}
