<?php

namespace App\Http\Controllers\AdminControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Users;
use App\Models\Department;
use Inertia\Inertia;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Mail\ProgramHeadCreated;

class ProgramHeadController extends Controller
{
    // List all Program Heads
    public function index()
    {
        $programHeads = Users::with(['department:id,name'])
            ->where('role', 'program_head')
            ->select(
                'id',
                'fName',
                'mName',
                'lName',
                'suffix',
                'username',
                'email',
                'contact_no',
                'id_number',
                'department_id',
                'generated_password', // Include generated_password for display
            )
            ->latest()
            ->get();

        $departments = Department::select('id', 'name')->orderBy('name')->get();

        return Inertia::render('Admin/Users/ProgramHead', [
            'programHeads' => $programHeads,
            'departments'  => $departments,
        ]);
    }

   // Store new Program Head
public function store(Request $request)
{
    $validated = $request->validate([
        'fName'         => 'required|string|max:255',
        'mName'         => 'nullable|string|max:255',
        'lName'         => 'required|string|max:255',
        'email'         => 'required|email|unique:users,email',
        'username'      => 'required|string|max:255|unique:users,username',
        'id_number'     => 'required|string|max:50|unique:users,id_number',
        'department_id' => 'required|exists:departments,id',
        'contact_no'    => 'nullable|string|max:20',
        'suffix'        => 'nullable|string|max:10',
    ]);

    // ✅ Generate random password
    $generatedPassword = Str::random(10);

    // Save user
    $user = Users::create([
        'fName'             => $validated['fName'],
        'mName'             => $validated['mName'] ?? null,
        'lName'             => $validated['lName'],
        'email'             => $validated['email'],
        'username'          => $validated['username'],
        'password'          => Hash::make($generatedPassword), // hashed password
        'generated_password'=> $generatedPassword, // ✅ store raw password in DB
        'role'              => 'program_head',
        'contact_no'        => $validated['contact_no'] ?? null,
        'id_number'         => $validated['id_number'],
        'department_id'     => $validated['department_id'],
        'suffix'            => $validated['suffix'] ?? null,
    ]);

    // Send email (user + raw generated password)
    Mail::to($user->email)->send(new ProgramHeadCreated($user, $generatedPassword));

    return back()->with('success', 'Program Head added successfully and email sent.');
}
    // Update existing Program Head
    public function update(Request $request, $id)
    {
        $user = Users::where('role', 'program_head')->findOrFail($id);

        $validated = $request->validate([
            'fName'         => 'required|string|max:255',
            'mName'         => 'nullable|string|max:255',
            'lName'         => 'required|string|max:255',
            'email'         => 'required|email|unique:users,email,' . $user->id,
            'username'      => 'required|string|max:255|unique:users,username,' . $user->id,
            'id_number'     => 'required|string|max:50|unique:users,id_number,' . $user->id,
            'department_id' => 'required|exists:departments,id',
            'contact_no'    => 'nullable|string|max:20',
            'suffix'        => 'nullable|string|max:10',
        ]);

        $user->update([
            'fName'         => $validated['fName'],
            'mName'         => $validated['mName'] ?? null,
            'lName'         => $validated['lName'],
            'suffix'        => $validated['suffix'] ?? null,
            'email'         => $validated['email'],
            'username'      => $validated['username'],
            'id_number'     => $validated['id_number'],
            'department_id' => $validated['department_id'],
            'contact_no'    => $validated['contact_no'] ?? null,
        ]);

        return back()->with('success', 'Program Head updated successfully.');
    }
}
