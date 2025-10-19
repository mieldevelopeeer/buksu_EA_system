<?php

namespace App\Http\Controllers\AdminControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Users;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use App\Mail\FacultyCreated;
use App\Mail\CustomEmail;

class FacultiesController extends Controller
{
    public function index()
    {
        $faculties = Users::where('role', 'faculty')->latest()->get();

        return Inertia::render('Admin/Users/Faculty', [
            'faculties' => $faculties,
        ]);
    }

  public function store(Request $request)
{
    $validated = $request->validate([
        'username'  => 'required|string|max:255|unique:users,username',
        'id_number' => 'required|string|exists:users,id_number', // identify the faculty
    ]);

    // 🔎 Find the user with existing email
    $user = Users::where('id_number', $validated['id_number'])->first();

    if (!$user || empty($user->email)) {
        return back()->with('error', 'No email found for this user. Please update the faculty details first.');
    }

    // 🔑 Generate secure random password
    $rawPassword = Str::random(12);

    // Update existing record to assign faculty role + credentials
    $user->update([
        'username'          => $validated['username'],
        'password'          => bcrypt($rawPassword), // hashed for login
        'generated_password'=> $rawPassword,         // plain password for record/email
        'role'              => 'faculty',
    ]);

    try {
        // 📧 Send credentials using FacultyCreated Mailable
        Mail::to($user->email)->send(
            new FacultyCreated($user, $rawPassword)
        );

        return back()->with('success', 'Faculty account created and credentials sent to ' . $user->email);
    } catch (\Exception $e) {
        return back()->with('error', 'Faculty created but email sending failed: ' . $e->getMessage());
    }
}



public function update(Request $request, $id)
{
    $user = Users::findOrFail($id);

    $validated = $request->validate([
        'username' => 'required|string|max:255|unique:users,username,' . $user->id,
        'email'    => 'required|email|max:255',
        // Password is optional for update
        'password' => 'nullable|string|min:6',
    ]);

    // If password is provided, hash it and also save plain for generated_password
    if (!empty($validated['password'])) {
        $rawPassword = $validated['password'];
        $user->password = bcrypt($rawPassword);
        $user->generated_password = $rawPassword;
    }

    // Update other fields
    $user->username = $validated['username'];
    $user->email    = $validated['email'];
    $user->save();

    try {
        // If password was updated, send email with updated credentials
        if (!empty($validated['password'])) {
            Mail::to($user->email)->send(
                new FacultyCreated($user, $validated['password'], 'updated') // pass 'updated' flag
            );
        }

        return back()->with('success', 'Faculty account updated successfully.');
    } catch (\Exception $e) {
        return back()->with('error', 'Faculty updated but email sending failed: ' . $e->getMessage());
    }
}

}



