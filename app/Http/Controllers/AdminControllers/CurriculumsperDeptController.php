<?php

namespace App\Http\Controllers\AdminControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Courses;
use App\Models\Curricula;
use App\Models\Semester;
use App\Models\YearLevel;
use App\Models\Major;

class CurriculumsperDeptController extends Controller
{
    /**
     * 📘 Display all curricula for admin (with courses + majors)
     */
    public function index()
    {
        // 🔹 Fetch all courses with majors (for filter dropdowns)
        $courses = Courses::with('majors')->get();

        // 🔹 Fetch all curricula with course and major
        $curricula = Curricula::with(['course', 'major'])
            ->latest()
            ->paginate(10);

        return Inertia::render('Admin/Curriculums/Curriculums', [
            'curricula' => $curricula,
            'courses'   => $courses,
        ]);
    }

    /**
     * 📖 Display full details of a specific curriculum (Admin View)
     */
    public function show($id)
    {
        // ✅ Load curriculum with all related data
        $curriculum = Curricula::with([
            'course',
            'major',
            'curriculumSubjects.subject',
            'curriculumSubjects.semester',
            'curriculumSubjects.yearLevel',
            'curriculumSubjects.prerequisites.subject', // include prerequisite info
        ])->findOrFail($id);

        // ✅ Supporting data for layout
        $semesters  = Semester::select('id', 'semester')->get();
        $yearLevels = YearLevel::select('id', 'year_level')->get();

        // ✅ Transform subjects data for Inertia
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

                // ✅ Include prerequisites if any
                'prerequisites' => $subj->prerequisites->map(function ($pre) {
                    return [
                        'id'    => $pre->id,
                        'code'  => $pre->subject?->code,
                        'title' => $pre->subject?->descriptive_title,
                    ];
                }),
            ];
        });

        return Inertia::render('Admin/Curriculums/DeptCurriculums', [
            'curriculum'         => $curriculum,
            'curriculumSubjects' => $curriculumSubjects,
            'semesters'          => $semesters,
            'yearLevels'         => $yearLevels,
        ]);
    }

    /**
     * 🧩 Update the status (approve/reject) of a curriculum
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected',
        ]);

        $curriculum = Curricula::findOrFail($id);
        $curriculum->status = $request->status;
        $curriculum->save();

        // ✅ Flash message for frontend SweetAlert
        return redirect()->back()->with('swal', [
            'icon'  => 'success',
            'title' => "Curriculum has been {$request->status}.",
        ]);
    }
}
