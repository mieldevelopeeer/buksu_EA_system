<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    public function store(LoginRequest $request): RedirectResponse
    {
        try {
            $request->authenticate(); // ✅ use correct method

            $request->session()->regenerate();

            $user = Auth::user();

            return match ($user->role) {
                'admin'        => redirect()->intended('/admin/dashboard'),
                'registrar'    => redirect()->intended('/registrar/dashboard'),
                'program_head' => redirect()->intended('/program-head/dashboard'),
                'faculty'      => redirect()->intended('/faculty/dashboard'),
                'student', 
                'students'     => redirect()->intended('/students/dashboard'),
                'judge'        => redirect()->intended('/judge/dashboard'),
                default        => redirect()->intended('/'),
            };

        } catch (\Illuminate\Validation\ValidationException $e) {
            return redirect()->back()->withErrors([
                'username' => __('auth.failed'),
            ])->withInput($request->only('username', 'remember'));
        } catch (\Exception $e) {
            return redirect()->back()->withErrors([
                'username' => 'An unexpected error occurred. Please try again.',
            ])->withInput($request->only('username', 'remember'));
        }
    }
}
