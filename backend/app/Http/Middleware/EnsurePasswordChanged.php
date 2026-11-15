<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->must_change_password) {
            return response()->json([
                'status' => 'error',
                'code' => 'PASSWORD_CHANGE_REQUIRED',
                'message' => 'Ubah password sementara sebelum menggunakan aplikasi.',
            ], 403);
        }
        return $next($request);
    }
}
