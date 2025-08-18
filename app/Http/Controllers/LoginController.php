<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Sanctum\PersonalAccessToken;

class LoginController extends Controller
{
    // Show login form
    public function showLoginForm(): Response|\Illuminate\Http\RedirectResponse
    {
        if (Auth::check()) {
            return redirect($this->redirectPath(Auth::user()->role));
        }

        return Inertia::render('Auth/Login');
    }

   public function store(Request $request)
{
    $request->validate([
        'username' => 'required|string', // can be username OR id_number
        'password' => 'required|string',
    ]);

    $loginInput = $request->username;

    // 🔍 Try finding by username in `users`
    $user = \App\Models\Users::where('username', $loginInput)
        ->orWhere('email', $loginInput)
        ->first();

    // 🔍 If not found, try finding by `id_number` in role-specific tables
    if (!$user) {
        $roleModels = [
            'faculty'      => \App\Models\Faculty::class,
            'program_head' => \App\Models\ProgramHead::class,
            'registrar'    => \App\Models\Registrar::class,
            'students'     => \App\Models\Students::class,
        ];

        foreach ($roleModels as $role => $model) {
            $record = $model::where('id_number', $loginInput)->first();
            if ($record && $record->user) {   // requires relation user() in each model
                $user = $record->user;
                break;
            }
        }
    }

    // ❌ If still not found
    if (!$user) {
        throw ValidationException::withMessages([
            'username' => __('auth.failed'),
        ]);
    }

    // ✅ Authenticate with the found user's username + provided password
    if (!Auth::attempt([
        'username' => $user->username,
        'password' => $request->password,
    ], $request->boolean('remember'))) {
        throw ValidationException::withMessages([
            'username' => __('auth.failed'),
        ]);
    }

    $request->session()->regenerate();

    // ✅ Create Sanctum token
    $token = $user->createToken('web-session-token')->plainTextToken;
    session(['auth_token' => $token]);

    // ✅ Redirect based on role
    return redirect()->intended($this->redirectPath($user->role));
}


    // Logout
    public function destroy(Request $request)
    {
        // ✅ Revoke all user tokens
        if ($user = Auth::user()) {
            $user->tokens()->delete();
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

     // ✅ Inertia-aware redirect
    return Inertia::location('/login');
}

    // Role-based path (not used directly but available if needed)
    private function redirectPath(string $role): string
    {
        return match ($role) {
            'admin'        => '/admin/dashboard',
            'registrar'    => '/registrar/dashboard',   
            'program_head' => '/program-head/dashboard',
            'faculty'      => '/faculty/dashboard',
            'student',
            'students'     => '/students/dashboard',
            'judge'        => '/judge/dashboard',
            default        => 'dashboard',
        };
    }
}
