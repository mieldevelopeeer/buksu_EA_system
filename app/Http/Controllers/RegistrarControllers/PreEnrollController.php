<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Enrollments;
use App\Models\EnrollmentSubject;
use App\Models\Curriculum_Subject;
use App\Models\Semester;
use App\Models\StudentRequirement;
use Illuminate\Support\Facades\DB;

class PreEnrollController extends Controller
{
    /**
     * 📌 Show all pending students
     */
    public function index()
{
    $students = Enrollments::with([
            'user:id,id_number,fName,mName,lName',
            'course:id,code',
            'yearLevel:id,year_level',
            // ✅ Load requirements
            'user.studentRequirements.requirement'
        ])
        ->where('status', 'pending')
        ->get(['id', 'student_id', 'courses_id', 'year_level_id', 'status']);

    return Inertia::render('Registrar/Enrollment/PreEnroll', [
        'preEnrolledStudents' => $students,
    ]);
}


    /**
 * 📌 Review subject loads for a specific enrollment
 */
public function review($id)
{
    $enrollment = Enrollments::with([
            'user',
            'course.curriculum.curriculumSubjects.subject',
            'yearLevel',
            'major', 
            'semester',
            'enrollmentSubjects.classSchedule.curriculumSubject.subject',
            'enrollmentSubjects.classSchedule.faculty',
        ])->findOrFail($id);

    // ✅ Get active semester
    $activeSemesterId = Semester::where('is_active', 1)->value('id');

    // ✅ Available subjects from curriculum (filtered by year level & active semester)
    $curriculumSubjects = $enrollment->course->curriculum
        ? $enrollment->course->curriculum->curriculumSubjects()
            ->with(['subject', 'classSchedules.faculty', 'classSchedules.section'])
            ->where('year_level_id', $enrollment->year_level_id)
            ->whereHas('classSchedules', function ($query) use ($activeSemesterId) {
                $query->where('semester_id', $activeSemesterId);
            })
            ->get()
        : collect();

    // ✅ Already selected subject schedules
    $selectedSubjectIds = $enrollment->enrollmentSubjects->pluck('class_schedule_id');

    return Inertia::render('Registrar/Enrollment/ReviewSubjectLoads', [
        'enrollment'          => $enrollment,
        'student'             => $enrollment->user,
        'availableSubjects'   => $curriculumSubjects,
        'selectedSubjectIds'  => $selectedSubjectIds,
        'takenSubjects' => $enrollment->enrollmentSubjects->map(function ($es) {
    $schedule = $es->classSchedule;
    return [
        'id'            => $es->id,
        'enrollment_id' => $es->enrollment_id,
        'schedule_id'   => $schedule->id ?? null,
        'code'          => optional(optional($schedule->curriculumSubject)->subject)->code,
        'subject'       => optional(optional($schedule->curriculumSubject)->subject)->descriptive_title,
        'day'           => $schedule->schedule_day ?? null,
        'time'          => $schedule->formatted_time ?? null,
        'section'       => optional($schedule->section)->section_name,
        'faculty'       => optional($schedule->faculty)->full_name,
    ];
}),

    ]);
}

   /**
 * 📌 Update subject loads for a student
 */
public function updateSubjects(Request $request, $id)
{
    $validated = $request->validate([
        'class_schedule_ids'   => 'nullable|array',
        'class_schedule_ids.*' => 'exists:class_schedules,id',
    ]);

    DB::beginTransaction();
    try {
        // Remove old subject loads
        EnrollmentSubject::where('enrollment_id', $id)->delete();

        // Insert new subject loads if provided
        if (!empty($validated['class_schedule_ids'])) {
            foreach ($validated['class_schedule_ids'] as $scheduleId) {
                EnrollmentSubject::create([
                    'enrollment_id'     => $id,
                    'class_schedule_id' => $scheduleId,
                ]);
            }
        }

        DB::commit();
        return back()->with('success', 'Subjects updated successfully.');
    } catch (\Exception $e) {
        DB::rollBack();
        return back()->with('error', 'Failed to update subjects: ' . $e->getMessage());
    }
}

    /**
     * 📌 Confirm student enrollment (move to "enrolled")
     */
    public function confirm($id)
    {
        $enrollment = Enrollments::findOrFail($id);
        $enrollment->update(['status' => 'enrolled']);

        return back()->with('success', 'Student enrollment confirmed.');
    }

    /**
     * 📌 Drop student enrollment (move to "dropped")
     */
    public function reject($id)
    {
        $enrollment = Enrollments::findOrFail($id);
        $enrollment->update(['status' => 'dropped']);

        return back()->with('success', 'Student enrollment dropped.');
    }
}
