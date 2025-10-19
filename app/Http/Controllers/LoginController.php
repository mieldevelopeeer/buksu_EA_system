<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use App\Models\Users;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Sanctum\PersonalAccessToken;

class LoginController extends Controller
{
    // Show login form
    public function showLoginForm(): Response|\Illuminate\Http\RedirectResponse
    {
        if (Auth::check()) {
            return redirect($this->redirectUrl(Auth::user()->role));
        }

        return Inertia::render('Auth/Login');
    }

 // Handle login
public function store(Request $request)
{
    $request->validate([
        'username' => 'required|string', // username, email, or id_number
        'password' => 'required|string',
    ]);

    $loginInput = $request->username;

    // 🔍 Find user by username, email, or id_number
    $user = Users::where('username', $loginInput)
        ->orWhere('email', $loginInput)
        ->orWhere('id_number', $loginInput)
        ->first();

    if (!$user) {
        throw ValidationException::withMessages([
            'username' => __('auth.failed'),
        ]);
    }

    // ✅ Authenticate using the username and provided password
    if (!Auth::attempt(['username' => $user->username, 'password' => $request->password], $request->boolean('remember'))) {
        throw ValidationException::withMessages([
            'username' => __('auth.failed'),
        ]);
    }

    $request->session()->regenerate();

    // ✅ Create Sanctum token for SPA use
    $token = $user->createToken('web-session-token')->plainTextToken;

    // Store token in session or return in response for SPA
    session(['auth_token' => $token]);

    // 🔐 Force first-time login users to change their password
    if (!is_null($user->generated_password)) {
        return redirect()->route('password.change'); 
        // 👉 this should be a route that loads your Change Password form
    }

    // ✅ Redirect based on role
    return redirect()->intended($this->redirectUrl($user->role));
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
    private function redirectUrl(string $role): string
    {
        return match ($role) {
            'admin'        => '/admin/dashboard',
            'registrar'    => '/registrar/dashboard',
            'program_head' => '/program-head/dashboard',
            'faculty'      => '/faculty/dashboard',
            'student'      => '/students/dashboard',
            'judge'        => '/judge/dashboard',
            default        => '/dashboard',
        };
    }
}
