<?php

namespace App\Http\Controllers\Profile;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class PasswordSecurityController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/ChangePasswordSecure', [
            'email' => $request->user()->email,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()],
        ]);

        $user = $request->user();

        $user->forceFill([
            'password' => Hash::make($validated['password']),
            'generated_password' => null,
        ])->save();

        if (method_exists($request, 'session')) {
            $request->session()->regenerate();
        }

        return Redirect::route('profile.password.edit')->with('success', 'Password updated successfully.');
    }
}
