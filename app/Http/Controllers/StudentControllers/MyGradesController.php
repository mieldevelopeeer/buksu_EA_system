<?php

namespace App\Http\Controllers\StudentControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Enrollments;

class MyGradesController extends Controller
{
 public function index(Request $request)
{
    $student = auth()->user();
    \Log::info("Fetching grades for student ID: {$student->id}");

    // Get all enrollment IDs for this student
    $enrollmentIds = Enrollments::where('student_id', $student->id)
                        ->pluck('id');

    \Log::info("Enrollment IDs for student: " . $enrollmentIds->implode(', '));

    $gradeRecords = \App\Models\Grades::with([
        'enrollment.student',
        'enrollment.course',
        'enrollment.yearLevel',
        'enrollment.semester',
        'enrollment.schoolYear',
        'classSchedule.subject',
        'classSchedule.curriculumSubject.subject',
        'classSchedule.curriculumSubject.yearLevel',
        'classSchedule.curriculumSubject.semester',
    ])
    ->whereIn('enrollment_id', $enrollmentIds)
    ->get();

    $grades = $gradeRecords->map(function ($record) {
        $classSchedule = $record->classSchedule;
        $curriculumSubject = $classSchedule?->curriculumSubject;
        $subject = $curriculumSubject?->subject ?? $classSchedule?->subject;

        $midterm = is_numeric($record->midterm) ? (float) $record->midterm : null;
        $final = is_numeric($record->final) ? (float) $record->final : null;
        $gradeValue = is_numeric($record->grade) ? (float) $record->grade : null;

        $cumulative = null;
        if ($midterm !== null && $final !== null) {
            $cumulative = round(($midterm + $final) / 2, 2);
        } elseif ($gradeValue !== null) {
            $cumulative = round($gradeValue, 2);
        }

        $semesterLabel = $curriculumSubject?->semester->semester ?? optional($record->enrollment?->semester)->semester;
        $schoolYear = optional($record->enrollment?->schoolYear);
        $lec = (float) ($curriculumSubject->lec_unit ?? $subject->lec_unit ?? 0);
        $lab = (float) ($curriculumSubject->lab_unit ?? $subject->lab_unit ?? 0);

        return [
            'enrollment_id'   => $record->enrollment_id,
            'code'            => $subject->code ?? '',
            'title'           => $subject->descriptive_title ?? '',
            'midterm'         => $midterm,
            'final'           => $final,
            'grade'           => $gradeValue,
            'cumulative'      => $cumulative,
            'remarks'         => $record->remarks ?? 'Pending',
            'semester_label'  => $semesterLabel,
            'school_year'     => $schoolYear?->school_year,
            'school_year_start' => $schoolYear?->start_date,
            'school_year_end'   => $schoolYear?->end_date,
            'year_level'      => $curriculumSubject?->yearLevel?->year_level ?? optional($record->enrollment?->yearLevel)->year_level,
            'total_units'     => $lec + $lab,
            'midterm_status'  => $record->midterm_status,
            'final_status'    => $record->final_status,
        ];
    })->filter(function ($grade) {
        return !empty($grade['code']) || !empty($grade['title']);
    })->values()->toArray();

    \Log::info("Total confirmed grades fetched: " . count($grades));

    return Inertia::render('Students/Grades/Grades', [
        'grades' => $grades,
        'auth'   => ['user' => $student],
    ]);
}

}
