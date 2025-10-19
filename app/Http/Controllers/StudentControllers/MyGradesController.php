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
    ])
    ->whereIn('enrollment_id', $enrollmentIds)
    ->when($request->input('status'), function ($query, $status) {
        $query->where('status', $status);
    }, function ($query) {
        $query->whereIn('status', ['approved', 'confirmed']);
    })
    ->get();

    $grades = $gradeRecords->map(function ($record) {
        $classSchedule = \App\Models\Class_Schedules::with('subject')
            ->find($record->class_schedule_id);

        $midterm = is_numeric($record->midterm) ? (float) $record->midterm : null;
        $final = is_numeric($record->final) ? (float) $record->final : null;
        $gradeValue = is_numeric($record->grade) ? (float) $record->grade : null;

        $cumulative = null;
        if ($midterm !== null && $final !== null) {
            $cumulative = round(($midterm + $final) / 2, 2);
        } elseif ($gradeValue !== null) {
            $cumulative = round($gradeValue, 2);
        }

        return [
            'enrollment_id' => $record->enrollment_id,
            'code'          => optional($classSchedule?->subject)->code ?? '',
            'title'         => optional($classSchedule?->subject)->descriptive_title ?? '',
            'midterm'       => $midterm,
            'final'         => $final,
            'grade'         => $gradeValue,
            'cumulative'    => $cumulative,
            'remarks'       => $record->remarks ?? 'Pending',
            'semester'      => optional($record->enrollment?->semester)->semester ?? null,
            'school_year'   => optional($record->enrollment?->schoolYear)->school_year ?? null,
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
