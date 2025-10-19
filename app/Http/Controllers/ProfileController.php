<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user()->load('department');

        return Inertia::render('Profile/Profiles', [
            'users' => $user,
            'department' => $user->department,
        ]);
    }

    public function uploadAvatar(Request $request): RedirectResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'max:2048'],
        ]);

        $user = $request->user();

        if ($user->profile_picture) {
            Storage::disk('public')->delete($user->profile_picture);
        }

        $path = $request->file('avatar')->store('avatars', 'public');

        $user->profile_picture = $path;
        $user->save();

        return Redirect::back()->with('success', 'Profile photo updated.');
    }

    public function edit(Request $request): Response
    {
        $user = $request->user()->load('department');

        return Inertia::render('Auth/EditProfile', [
            'user' => $user,
            'department' => $user->department,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'fName' => ['required', 'string', 'max:255'],
            'mName' => ['nullable', 'string', 'max:255'],
            'lName' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', Rule::unique('users', 'username')->ignore($user->id)],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'contact_no' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $user->fill($validated);
        $user->save();

        return Redirect::route('profile.edit')->with('success', 'Profile information updated.');
    }

//     /**
//      * Delete the user's account.
//      */
//     public function destroy(Request $request): RedirectResponse
//     {
//         $request->validate([
//             'password' => ['required', 'current_password'],
//         ]);

//         $user = $request->user();

//         Auth::logout();

//         $user->delete();

//         $request->session()->invalidate();
//         $request->session()->regenerateToken();

//         return Redirect::to('/');
//     }
 }
