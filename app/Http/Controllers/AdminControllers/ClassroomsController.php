<?php

namespace App\Http\Controllers\AdminControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Classrooms;
use Inertia\Inertia;

class ClassroomsController extends Controller
{
    /**
     * Display a listing of classrooms.
     */
    public function index()
    {
        // Fetch all classrooms, latest first
        $classrooms = Classrooms::latest()->get();

        return Inertia::render('Admin/Classrooms/Classrooms', [
            'classrooms' => $classrooms,
        ]);
    }

    /**
     * Store a newly created classroom.
     */
    public function store(Request $request)
    {
       $request->validate([
            'room_number' => 'required|string|max:50|unique:classrooms,room_number',
            'capacity'    => 'required|integer|min:1',
        ], [
            'room_number.unique' => 'Classroom already exists.',
        ]);
        Classrooms::create($request->only('room_number', 'capacity'));

        return redirect()->back()->with('success', 'Classroom added!');
    }

    /**
     * Update an existing classroom.
     */
    public function update(Request $request, $id)
    {
        $classroom = Classrooms::findOrFail($id);

        $request->validate([
            'room_number' => 'required|string|max:50|unique:classrooms,room_number,' . $id,
            'capacity'    => 'required|integer|min:1',
        ], [
            'room_number.unique' => 'Classroom already exists.',
        ]);

        $classroom->update($request->only('room_number', 'capacity'));

        return redirect()->back()->with('success', 'Classroom updated!');
    }

    /**
     * Optional: Delete a classroom.
     */
    public function destroy($id)
    {
        $classroom = Classrooms::findOrFail($id);
        $classroom->delete();

        return redirect()->back()->with('success', 'Classroom deleted!');
    }
}
