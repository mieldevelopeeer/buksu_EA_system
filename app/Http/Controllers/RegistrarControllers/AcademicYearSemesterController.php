<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AcademicYear;
use App\Models\Semester;
use Inertia\Inertia;

class AcademicYearSemesterController extends Controller
{
    // Fetch all semesters with their academic year
    public function index()
{
    $semesters = Semester::with('academicYear') // <- Eager load!
        ->orderBy('school_year_id')
        ->get();

    return Inertia::render('Registrar/SySemester/AcademicYearSemester', [
        'semesters' => $semesters,
    ]);
}

    // Store semester (with school_year_id)
    public function store(Request $request)
    {
        $request->validate([
            'school_year_id' => 'required|exists:academic_years,id',
            'semester' => 'required|string|unique:semesters,semester,NULL,id,school_year_id,' . $request->school_year_id,
            'is_active' => 'required|boolean',
        ]);

        Semester::create($request->only(['school_year_id', 'semester', 'is_active']));

        return redirect()->route('registrar.academic-year-semester.index')
            ->with('success', 'Semester added successfully.');
    }

    // Update semester
    public function update(Request $request, $id)
    {
        $semester = Semester::findOrFail($id);

        $request->validate([
            'school_year_id' => 'required|exists:academic_years,id',
            'semester' => 'required|string|unique:semesters,semester,' . $id . ',id,school_year_id,' . $request->school_year_id,
        ]);

        $semester->update($request->only(['school_year_id', 'semester', 'is_active']));

        return redirect()->route('registrar.academic-year-semester.index')
            ->with('success', 'Semester updated successfully.');
    }

    // Toggle semester status
public function toggleSemester($id)
{
    $semester = Semester::findOrFail($id);
    $semester->is_active = !$semester->is_active;
    $semester->save();

    return back()->with('success', 'Semester status updated successfully.');
}



     // ✅ Toggle academic year active/inactive
    public function toggleYear($id)
    {
        $year = AcademicYear::findOrFail($id);
        $year->is_active = !$year->is_active;
        $year->save();

     return back()->with('success', 'School Year status updated successfully.');
    }
}
