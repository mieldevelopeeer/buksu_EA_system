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

class RegistrarController extends Controller
{
public function index()
{
    $registrars = Users::with(['registrar:id,users_id,id_number']) // eager load registrar with id_number
        ->where('role', 'registrar')
        ->select('id', 'fName', 'mName', 'lName', 'username', 'email')
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
            'password'  => 'required|string|min:6',
            'id_number' => 'required|string|max:50|unique:registrar,id_number',
        ]);

        DB::transaction(function () use ($validated) {
            // Create user first
            $user = Users::create([
                'fName'    => $validated['fName'],
                'mName'    => $validated['mName'] ?? null,
                'lName'    => $validated['lName'],
                'email'    => $validated['email'],
                'username' => $validated['username'],
                'password' => bcrypt($validated['password']),
                'role'     => 'registrar',
            ]);

            // Create registrar record linked to user
            $user->registrar()->create([
                'id_number' => $validated['id_number'],
                'users_id'  => $user->id, // ensure FK is set
            ]);
        });

        return back()->with('success', 'Registrar added successfully.');
    }

    public function update(Request $request, $id)
    {
        $user = Users::with('registrar')->where('role', 'registrar')->findOrFail($id);

        $validated = $request->validate([
            'fName'     => 'required|string|max:255',
            'mName'     => 'nullable|string|max:255',
            'lName'     => 'required|string|max:255',
            'email'     => 'required|email|unique:users,email,' . $user->id,
            'username'  => 'required|string|max:255|unique:users,username,' . $user->id,
            'id_number' => 'required|string|max:50|unique:registrar,id_number,' . ($user->registrar->id ?? 'NULL'),
        ]);

        DB::transaction(function () use ($user, $validated) {
            $user->update([
                'fName'    => $validated['fName'],
                'mName'    => $validated['mName'] ?? null,
                'lName'    => $validated['lName'],
                'email'    => $validated['email'],
                'username' => $validated['username'],
            ]);

            $user->registrar()->updateOrCreate(
                ['users_id' => $user->id],
                ['id_number' => $validated['id_number']]
            );
        });

        return back()->with('success', 'Registrar updated successfully.');
    }




public function sendEmail(Request $request)
{
    $request->validate([
        'to' => 'required|email',
        'message' => 'required|string',
    ]);

    try {
        Mail::raw($request->message, function ($mail) use ($request) {
            $mail->to($request->to)
                 ->subject('Your Account Details');
        });

        // ✅ Return standard JSON
        return response()->json([
            'success' => true,
            'message' => 'Email sent successfully'
        ]);
    } catch (\Exception $e) {
        \Log::error('Email send error: '.$e->getMessage());

        return response()->json([
            'success' => false,
            'message' => 'Failed to send email'
        ], 500);
    }
}

}
