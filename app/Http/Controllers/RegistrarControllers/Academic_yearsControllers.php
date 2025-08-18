<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AcademicYear;
use Inertia\Inertia;

class Academic_yearsControllers extends Controller
{
    public function index()
    {
        $academicYear = AcademicYear::paginate(10);

        return Inertia::render('Registrar/SySemester/Academic_Year', [
            'academicYears' => $academicYear,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'school_year' => 'required|string|unique:school_year',
            'is_active' => 'required|boolean',
        ]);

        AcademicYear::create([
            'school_year' => $request->school_year,
            'is_active' => $request->is_active,
        ]);

        return redirect()->route('registrar.academic_year.index')->with('success', 'Academic Year created successfully.');
    }
public function update(Request $request, $id)
{
    $academicYear = AcademicYear::findOrFail($id);

    $request->validate([
        'school_year' => 'required|string|unique:school_year,school_year,' . $id,
    ]);

    $academicYear->update([
        'school_year' => $request->school_year,
    ]);

    return redirect()
        ->route('registrar.academic_year.index')
        ->with('success', 'Academic Year updated successfully.');
}



    public function toggleStatus($id)
    {
        $academicYear = AcademicYear::findOrFail($id);

        $academicYear->is_active = !$academicYear->is_active;
        $academicYear->save();

        return redirect()->route('registrar.academic_year.index')->with('success', 'Academic Year status updated successfully.');
    }
}
