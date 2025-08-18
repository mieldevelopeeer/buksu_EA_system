<?php

namespace App\Http\Controllers\AdminControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Users;
use App\Models\ProgramHead; // ✅ Use proper PascalCase
use App\Models\Department;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class ProgramHeadController extends Controller
{
public function index()
{
    $programHeads = Users::with([
            'programHead.department:id,name' // load department too
        ])
        ->where('role', 'program_head') // ✅ Consistent role
        ->select('id', 'fName', 'mName', 'lName', 'username', 'email')
        ->latest()
        ->get();

    $departments = Department::select('id', 'name')->orderBy('name')->get();

    return Inertia::render('Admin/Users/ProgramHead', [
        'programHeads' => $programHeads,
        'departments'  => $departments,
    ]);
}


    public function store(Request $request)
    {
        $validated = $request->validate([
            'fName'         => 'required|string|max:255',
            'mName'         => 'nullable|string|max:255',
            'lName'         => 'required|string|max:255',
            'email'         => 'required|email|unique:users,email',
            'suffix'        => 'nullable|string|max:10',
            'username'      => 'required|string|max:255|unique:users,username',
            'password'      => 'required|string|min:6',
            'contact_no'    => 'nullable|string|max:20',
            'id_number'     => 'required|string|max:50|unique:program_head,id_number',
            'department_id' => 'required|exists:departments,id',
        ]);

        DB::transaction(function () use ($validated) {
            // Create User
            $user = Users::create([
                'fName'    => $validated['fName'],
                'mName'    => $validated['mName'] ?? null,
                'lName'    => $validated['lName'],
                'email'    => $validated['email'],
                'username' => $validated['username'],
                'password' => bcrypt($validated['password']),
                'role'     => 'program_head',
            ]);

            // Create related Program Head record
            $user->programHead()->create([
                'users_id'      => $user->id,
                'id_number'     => $validated['id_number'],
                'contact_no'    => $validated['contact_no'] ?? null,
                'department_id' => $validated['department_id'],
                'suffix'        => $validated['suffix'] ?? null,
            ]);
        });

        return back()->with('success', 'Program Head added successfully.');
    }

    public function update(Request $request, $id)
    {
        $user = Users::with('programHead')->where('role', 'program_head')->findOrFail($id);

        $validated = $request->validate([
            'fName'         => 'required|string|max:255',
            'mName'         => 'nullable|string|max:255',
            'lName'         => 'required|string|max:255',
            'email'         => 'required|email|unique:users,email,' . $user->id,
            'username'      => 'required|string|max:255|unique:users,username,' . $user->id,
            'contact_no'    => 'nullable|string|max:20',
            'id_number'     => 'required|string|max:50|unique:program_head,id_number,' . ($user->programHead->id ?? 'NULL'),
            'department_id' => 'required|exists:departments,id',
            'suffix'        => 'nullable|string|max:10',
        ]);

        DB::transaction(function () use ($user, $validated) {
            // Update User
            $user->update([
                'fName'    => $validated['fName'],
                'mName'    => $validated['mName'] ?? null,
                'lName'    => $validated['lName'],
                'email'    => $validated['email'],
                'username' => $validated['username'],
            ]);

            // Update or create Program Head record
            $user->programHead()->updateOrCreate(
                ['users_id' => $user->id],
                [
                    'id_number'     => $validated['id_number'],
                    'contact_no'    => $validated['contact_no'] ?? null,
                    'department_id' => $validated['department_id'],
                    'suffix'        => $validated['suffix'] ?? null,
                ]
            );
        });

        return back()->with('success', 'Program Head updated successfully.');
    }
}
