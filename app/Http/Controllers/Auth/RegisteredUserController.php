<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Users;
use App\Providers\RouteServiceProvider;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
   public function store(Request $request): RedirectResponse
{
    $validated = $request->validate([
        'id_number' => 'required|string|max:50|unique:users,id_number',
        'fName' => 'required|string|max:255',
        'mName' => 'nullable|string|max:255',
        'lName' => 'required|string|max:255',
        'username' => 'required|string|max:255|unique:users,username',
        'email' => 'required|email|max:255|unique:users,email',
        'password' => 'required|string|min:8|confirmed',
    ]);

    $user = Users::create([
        'id_number' => $validated['id_number'],
        'fName' => $validated['fName'],
        'mName' => $validated['mName'] ?? null,
        'lName' => $validated['lName'],
        'username' => $validated['username'],
        'email' => $validated['email'],
        'password' => Hash::make($validated['password']),
        'role' => 'admin', // default role
    ]);

    event(new Registered($user));

    return redirect()->route('login')->with('status', 'Registration successful. Please log in.');
}

}
