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
use App\Models\Notification;
use App\Models\Users;
use Illuminate\Support\Str;

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
     * Notify program heads within the curriculum's department about status updates.
     */
    protected function notifyProgramHeadsOfStatusChange(Curricula $curriculum, ?string $previousStatus = null): void
    {
        $departmentId = $curriculum->department_id;

        if (!$departmentId) {
            return;
        }

        $recipientIds = Users::query()
            ->where('role', 'program_head')
            ->where('department_id', $departmentId)
            ->pluck('id');

        if ($recipientIds->isEmpty()) {
            return;
        }

        $statusLabel = Str::headline($curriculum->status ?? 'Updated');
        $message = sprintf(
            'Curriculum "%s" was updated to %s.',
            $curriculum->name,
            strtolower($statusLabel)
        );

        if ($previousStatus) {
            $message .= ' Previous status: ' . Str::headline($previousStatus) . '.';
        }

        $url = route('program-head.curriculum.show', $curriculum->id);

        foreach ($recipientIds as $userId) {
            Notification::create([
                'user_id' => $userId,
                'type' => 'curriculum_status',
                'title' => $statusLabel . ' curriculum',
                'message' => $message,
                'url' => $url,
                'is_read' => false,
            ]);
        }
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
            'status' => 'required|in:approved,rejected,pending',
        ]);

        $curriculum = Curricula::findOrFail($id);
        $previousStatus = $curriculum->status;

        if ($previousStatus === $request->status) {
            return redirect()->back()->with('swal', [
                'icon'  => 'info',
                'title' => 'Curriculum is already ' . Str::headline($request->status) . '.',
            ]);
        }

        $curriculum->status = $request->status;
        $curriculum->save();

        $this->notifyProgramHeadsOfStatusChange($curriculum, $previousStatus);

        // ✅ Flash message for frontend SweetAlert
        return redirect()->back()->with('swal', [
            'icon'  => 'success',
            'title' => 'Curriculum status updated to ' . Str::headline($request->status) . '.',
        ]);
    }
}
