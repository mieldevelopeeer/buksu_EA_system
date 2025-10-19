<?php

namespace App\Http\Controllers\AdminControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Users;
use App\Models\Registrar;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Auth;
use App\Mail\CustomEmail;
use Illuminate\Support\Str;

class RegistrarController extends Controller
{
public function index()
{
    $registrars = Users::where('role', 'registrar')
        ->select('id', 'fName', 'mName', 'lName', 'username', 'email', 'id_number', 'generated_password')
        ->latest()
        ->get();

    return Inertia::render('Admin/Users/Registrar', [
        'registrars' => $registrars,
    ]);
}

public function store(Request $request)
{
    $validated = $request->validate([
        'fName'     => 'required|string|max:255',
        'mName'     => 'nullable|string|max:255',
        'lName'     => 'required|string|max:255',
        'email'     => 'required|email|unique:users,email',
        'username'  => 'required|string|max:255|unique:users,username',
        'id_number' => 'required|string|max:50|unique:users,id_number',
        'password'  => 'nullable|string|min:6',
    ]);

    $rawPassword = $validated['password'] ?? Str::random(10);

    $user = Users::create([
        'fName'             => $validated['fName'],
        'mName'             => $validated['mName'] ?? null,
        'lName'             => $validated['lName'],
        'email'             => $validated['email'],
        'username'          => $validated['username'],
        'id_number'         => $validated['id_number'],
        'password'          => bcrypt($rawPassword),
        'generated_password'=> $rawPassword,  // keep plain until changed
        'role'              => 'registrar',
    ]);

    // 📧 Send credentials via email
try {
    Mail::to($user->email)->send(
        new CustomEmail(
            'admin@buksualubijidcampus.com',
            $user->fName,
            $user->mName,       // nullable
            $user->lName,
            $user->username,
            $user->id_number,
            $rawPassword
        )
    );
} catch (\Exception $e) {
    return back()->with('error', 'Registrar added but email failed: ' . $e->getMessage());
}

    return back()->with('success', 'Registrar added successfully and credentials sent to email.');
}


   public function update(Request $request, $id)
{
    $user = Users::where('role', 'registrar')->findOrFail($id);

    $validated = $request->validate([
        'fName'     => 'required|string|max:255',
        'mName'     => 'nullable|string|max:255',
        'lName'     => 'required|string|max:255',
        'email'     => 'required|email|unique:users,email,' . $user->id,
        'username'  => 'required|string|max:255|unique:users,username,' . $user->id,
        'id_number' => 'required|string|max:50|unique:users,id_number,' . $user->id,
        'password'  => 'nullable|string|min:6',
    ]);

    $updateData = [
        'fName'     => $validated['fName'],
        'mName'     => $validated['mName'] ?? null,
        'lName'     => $validated['lName'],
        'email'     => $validated['email'],
        'username'  => $validated['username'],
        'id_number' => $validated['id_number'],
    ];

    if (!empty($validated['password'])) {
        $updateData['password'] = bcrypt($validated['password']);
        $updateData['generated_password'] = null; // clear generated password
    }

    $user->update($updateData);

    return back()->with('success', 'Registrar updated successfully.');
}

public function sendEmail(Request $request)
{
    $request->validate([
        'to' => 'required|email',
        'fName' => 'required|string',
        'mName' => 'nullable|string',
        'lName' => 'required|string',
        'username' => 'required|string',
        'id_number' => 'required|string',
        'password' => 'required|string',
    ]);

    try {
        \Mail::to($request->to)->send(new \App\Mail\CustomEmail(
            'admin@buksualubijidcampus.com', // sender
            $request->fName,
            $request->mName,
            $request->lName,
            $request->username,
            $request->id_number,
            $request->password
        ));

        return response()->json([
            'success' => true,
            'message' => 'Email sent successfully!'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to send email: ' . $e->getMessage()
        ]);
    }
}

}

