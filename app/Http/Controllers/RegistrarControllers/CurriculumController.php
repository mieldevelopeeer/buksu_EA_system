<?php

// app/Http/Controllers/Registrar/CurriculumController.php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Courses;
use App\Models\Curricula;
use App\Models\YearLevel;
use App\Models\Curriculum_Subject;
use App\Models\Curriculum;
use App\Models\Semester;
use App\Models\Major;

class CurriculumController extends Controller
{
        public function index()
{
    // 🔹 Get all courses with majors
    $courses = Courses::with('majors')->get();

    // 🔹 Fetch all curricula with their course + major
    $curricula = Curricula::with(['course', 'major'])
        ->latest()
        ->paginate(10);

    return Inertia::render('Registrar/Curriculum/Curriculum', [
        'curricula' => $curricula,
        'courses'   => $courses,
    ]);
}

public function show($id)
{
    $curriculum = Curricula::with([
        'course',
        'major',
        'curriculumSubjects.subject',
        'curriculumSubjects.semester',
        'curriculumSubjects.yearLevel',
        'curriculumSubjects.prerequisites.subject', // ✅ load prereq subjects
    ])->findOrFail($id);

    $semesters = Semester::select('id', 'semester')->get();
    $yearLevels = YearLevel::select('id', 'year_level')->get();

    $curriculumSubjects = $curriculum->curriculumSubjects->map(function ($subj) {
        return [
            'id'            => $subj->id,
            'subject_id'    => $subj->subject_id,
            'subject'       => $subj->subject,
            'semesters_id'  => $subj->semesters_id,
            'semester'      => $subj->semester,
            'year_level_id' => $subj->year_level_id,
            'year_level'    => $subj->yearLevel,
            'lec_unit'      => $subj->lec_unit,
            'lab_unit'      => $subj->lab_unit,
            'type'          => $subj->type,

            // ✅ expand prerequisites
            'prerequisites' => $subj->prerequisites->map(function ($pre) {
                return [
                    'id'    => $pre->id,
                    'code'  => $pre->subject?->code,
                    'title' => $pre->subject?->descriptive_title,
                ];
            }),
        ];
    });

    return Inertia::render('Registrar/Curriculum/ViewCurriculum', [
        'curriculum'         => $curriculum,
        'curriculumSubjects' => $curriculumSubjects,
        'semesters'          => $semesters,
        'yearLevels'         => $yearLevels,
    ]);
}

    
    
   public function showMajors($courseId)
{
    $course = Courses::findOrFail($courseId);
    $majors = Major::where('courses_id', $courseId)->get(); // ✅ match DB column

    return Inertia::render('Registrar/Curriculum/Majors', [
        'course' => $course,
        'majors' => $majors,
    ]);
}

    public function storeMajors(Request $request, $courseId)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:20|unique:majors,code',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        Major::create([
            'courses_id'  => $courseId, // ✅ use correct FK column
            'code'        => $validated['code'],
            'name'        => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        return redirect()
            ->route('registrar.courses.majors.index', $courseId)
            ->with('success', 'Major added successfully!');
    }


public function updateMajors(Request $request, $majorId)
{
    $major = Major::findOrFail($majorId);

    $validated = $request->validate([
        'code' => 'required|string|max:20|unique:majors,code,' . $major->id,
        'name' => 'required|string|max:255',
        'description' => 'nullable|string',
    ]);

    $major->update($validated);

    return redirect()
        ->back()
        ->with('success', 'Major updated successfully!');
}







}

