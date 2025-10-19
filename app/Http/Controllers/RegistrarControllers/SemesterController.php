<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\semester;
use Inertia\Inertia;

class SemesterController extends Controller
{
   public function index()
    {
        $semester = semester::paginate(10);

        return Inertia::render('Registrar/SySemester/Semester', [
            'semesters' => $semester,
        ]);
    }


      public function store(Request $request)
    {
        $request->validate([
            'semester' => 'required|string|unique:semesters,semester',
            'is_active' => 'required|boolean',
        ]);

        semester::create([
            'semester' => $request->semester,
            'is_active' => $request->is_active,
        ]);

        return redirect()->route('registrar.semester.index')->with('success', 'Semester created successfully.');
    }


    
    public function toggleStatus($id)
    {
        $semester = Semester::findOrFail($id);

        $semester->is_active = !$semester->is_active;
        $semester->save();

        return redirect()->route('registrar.semester.index')->with('success', 'Semester status updated successfully.');
    }
}
