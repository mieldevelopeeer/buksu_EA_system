<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class PasswordController extends Controller
{


       public function edit()
    {
        return inertia('Auth/ChangePassword');
    }

    /**
     * Update the user's password.
     */
   public function update(Request $request): RedirectResponse
{
    $user = $request->user();

    $rules = [
        'password' => ['required', 'confirmed', Password::defaults()],
    ];

    // Require current password only if NOT first-time login
    if (is_null($user->generated_password)) {
        $rules['current_password'] = ['required', 'current_password'];
    }

    $validated = $request->validate($rules);

    $user->forceFill([
        'password' => Hash::make($validated['password']),
        'generated_password' => null, // clear generated password on success
    ])->save();

    return redirect()->intended($this->redirectPath($user->role))
        ->with('success', 'Password updated successfully.');
}

private function redirectPath(string $role): string
{
    return match ($role) {
        'admin'        => '/admin/dashboard',
        'registrar'    => '/registrar/dashboard',
        'program_head' => '/program-head/dashboard',
        'faculty'      => '/faculty/dashboard',
        'student', 'students' => '/students/dashboard',
        'judge'        => '/judge/dashboard',
        default        => '/dashboard',
    };

}
}
