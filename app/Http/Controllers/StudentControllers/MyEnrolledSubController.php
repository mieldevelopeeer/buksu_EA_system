<?php

namespace App\Http\Controllers\StudentControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Enrollments;

class MyEnrolledSubController extends Controller
{
    /**
     * Display the student's enrolled subjects.
     */
    public function index(Request $request)
    {
        $student = auth()->user();

        // 1) Load enrollments (with semester and schoolYear)
        $enrollments = Enrollments::with([
                'semester',
                'schoolYear',
                'enrollmentSubjects.classSchedule.subject',
                'enrollmentSubjects.classSchedule.faculty',
                'enrollmentSubjects.classSchedule.classroom',
            ])
            ->where('student_id', $student->id)
            ->get();

        // 2) Build subjects payload
        $enrolledSubjects = $enrollments->flatMap(function ($enrollment) {
            return $enrollment->enrollmentSubjects->map(function ($enrollmentSubject) {
                $schedule = $enrollmentSubject->classSchedule;

                return [
                    'code'              => $schedule->subject->code ?? null,
                    'descriptive_title' => $schedule->subject->descriptive_title ?? null,
                    'lec_unit'          => $schedule->subject->lec_unit ?? 0,
                    'lab_unit'          => $schedule->subject->lab_unit ?? 0,
                    'schedule' => $schedule ? [
                        'day'         => $schedule->schedule_day ?? 'TBA',
                        'start_time'  => $schedule->start_time ?? null,
                        'end_time'    => $schedule->end_time ?? null,
                        'room_number' => $schedule->classroom->room_number ?? 'TBA',
                    ] : null,
                    'faculty'  => $schedule && $schedule->faculty ? [
                        'fName' => $schedule->faculty->fName ?? null,
                        'mName' => $schedule->faculty->mName ?? null,
                        'lName' => $schedule->faculty->lName ?? null,
                    ] : null,
                ];
            });
        });

        // 3) Safely get semester & school year (from first enrollment if exists)
        $firstEnrollment = $enrollments->first();

        $semester = null;
        if ($firstEnrollment) {
            $semester = [
                'id'          => $firstEnrollment->semester->id ?? null,
                'name'        => $firstEnrollment->semester->semester ?? null,
                'school_year' => $firstEnrollment->schoolYear->school_year ?? null,
            ];
        }

        // 4) Return to Inertia with semester + subjects
        return Inertia::render('Students/EnrolledSubjects/MyEnrolledSub', [
            'subjects' => $enrolledSubjects,
            'semester' => $semester,
            'auth'     => ['user' => $student],
        ]);
    }
}
