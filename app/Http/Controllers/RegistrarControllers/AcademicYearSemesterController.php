<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AcademicYear;
use App\Models\Semester;
use Illuminate\Validation\ValidationException;
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
        $validated = $request->validate([
            'school_year' => 'required|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_active' => 'nullable|boolean',
        ]);

        $academicYear = AcademicYear::firstOrCreate(
            ['school_year' => $validated['school_year']],
            [
                'is_active' => true,
                'start_date' => $validated['start_date'] ?? null,
                'end_date' => $validated['end_date'] ?? null,
            ]
        );

        $academicYear->fill([
            'start_date' => $validated['start_date'] ?? $academicYear->start_date,
            'end_date' => $validated['end_date'] ?? $academicYear->end_date,
        ])->save();

        $defaultSemesters = [
            'First Semester',
            'Second Semester',
            'Summer',
        ];

        $existingSemesters = Semester::where('school_year_id', $academicYear->id)
            ->whereIn('semester', $defaultSemesters)
            ->pluck('semester')
            ->all();

        if (count($existingSemesters) === count($defaultSemesters)) {
            throw ValidationException::withMessages([
                'school_year' => ['Semesters for this school year already exist.'],
            ]);
        }

        foreach ($defaultSemesters as $semesterName) {
            Semester::firstOrCreate(
                [
                    'school_year_id' => $academicYear->id,
                    'semester' => $semesterName,
                ],
                [
                    'is_active' => false,
                ]
            );
        }

        return redirect()->route('registrar.ay-semester.index')
            ->with('success', 'Semesters added successfully.');
    }

    // Update semester
    public function update(Request $request, $id)
    {
        $semester = Semester::findOrFail($id);

        $validated = $request->validate([
            'school_year' => 'required|string',
            'semester' => 'required|string',
            'is_active' => 'required|boolean',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $academicYear = AcademicYear::firstOrCreate(
            ['school_year' => $validated['school_year']],
            [
                'is_active' => true,
                'start_date' => $validated['start_date'] ?? null,
                'end_date' => $validated['end_date'] ?? null,
            ]
        );

        $academicYear->update([
            'start_date' => $validated['start_date'] ?? $academicYear->start_date,
            'end_date' => $validated['end_date'] ?? $academicYear->end_date,
        ]);

        $request->validate([
            'semester' => 'unique:semesters,semester,' . $id . ',id,school_year_id,' . $academicYear->id,
        ]);

        $semester->update([
            'school_year_id' => $academicYear->id,
            'semester' => $validated['semester'],
            'is_active' => $validated['is_active'],
        ]);

        return redirect()->route('registrar.ay-semester.index')
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

    public function updateAcademicYear(Request $request, $id)
    {
        $year = AcademicYear::findOrFail($id);

        $validated = $request->validate([
            'school_year' => 'required|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_active' => 'nullable|boolean',
        ]);

        $year->update([
            'school_year' => $validated['school_year'],
            'start_date' => $validated['start_date'] ?? $year->start_date,
            'end_date' => $validated['end_date'] ?? $year->end_date,
            'is_active' => $validated['is_active'] ?? $year->is_active,
        ]);

        return back()->with('success', 'School Year updated successfully.');
    }
}
