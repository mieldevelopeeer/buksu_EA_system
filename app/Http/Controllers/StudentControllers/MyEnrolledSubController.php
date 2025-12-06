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
                'enrollmentSubjects.classSchedule.faculty',
                'enrollmentSubjects.classSchedule.classroom',
                'enrollmentSubjects.curriculumSubject.subject',
                'enrollmentSubjects.curriculumSubject.yearLevel',
                'enrollmentSubjects.curriculumSubject.semester',
                'enrollmentSubjects.droppedBy:id,fName,lName',
            ])
            ->where('student_id', $student->id)
            ->orderByDesc('enrolled_at')
            ->get();

        // 2) Build subjects payload
        $enrolledSubjects = $enrollments->flatMap(function ($enrollment) {
            $semesterLabel = $enrollment->semester->semester ?? null;
            $schoolYearModel = $enrollment->schoolYear;
            $schoolYear = $schoolYearModel->school_year ?? null;
            $schoolYearStart = optional($schoolYearModel)->start_date;
            $schoolYearEnd = optional($schoolYearModel)->end_date;

            return $enrollment->enrollmentSubjects->map(function ($enrollmentSubject) use ($semesterLabel, $schoolYear, $schoolYearStart, $schoolYearEnd) {
                $schedule = $enrollmentSubject->classSchedule;
                $curriculumSubject = $enrollmentSubject->curriculumSubject;
                $subject = $curriculumSubject?->subject;
                $lec = (float) ($curriculumSubject->lec_unit ?? $subject->lec_unit ?? 0);
                $lab = (float) ($curriculumSubject->lab_unit ?? $subject->lab_unit ?? 0);

                return [
                    'id'                 => $enrollmentSubject->id,
                    'enrollment_id'      => $enrollmentSubject->enrollment_id,
                    'status'             => $enrollmentSubject->status,
                    'drop_reason'        => $enrollmentSubject->drop_reason,
                    'dropped_at'         => optional($enrollmentSubject->dropped_at)->toDateTimeString(),
                    'dropped_by'         => $enrollmentSubject->droppedBy ? [
                        'id'   => $enrollmentSubject->droppedBy->id,
                        'name' => trim(($enrollmentSubject->droppedBy->fName ?? '') . ' ' . ($enrollmentSubject->droppedBy->lName ?? '')),
                    ] : null,
                    'code'               => $subject->code ?? null,
                    'descriptive_title'  => $subject->descriptive_title ?? null,
                    'lec_unit'           => $lec,
                    'lab_unit'           => $lab,
                    'total_units'        => $lec + $lab,
                    'semester_label'     => $curriculumSubject?->semester->semester ?? $semesterLabel,
                    'school_year'        => $schoolYear,
                    'school_year_start'  => $schoolYearStart,
                    'school_year_end'    => $schoolYearEnd,
                    'year_level'         => $curriculumSubject?->yearLevel?->year_level,
                    'schedule' => $schedule ? [
                        'day'         => $schedule->schedule_day ?? 'TBA',
                        'start_time'  => $schedule->start_time ?? null,
                        'end_time'    => $schedule->end_time ?? null,
                        'room_number' => optional($schedule->classroom)->room_number ?? 'TBA',
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
                'id'                 => $firstEnrollment->semester->id ?? null,
                'name'               => $firstEnrollment->semester->semester ?? null,
                'school_year'        => $firstEnrollment->schoolYear->school_year ?? null,
                'school_year_start'  => optional($firstEnrollment->schoolYear)->start_date,
                'school_year_end'    => optional($firstEnrollment->schoolYear)->end_date,
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
