<?php

namespace App\Http\Controllers\AdminControllers;

use App\Http\Controllers\Controller;
use App\Models\Enrollments;
use App\Models\Grades;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class ReportsController extends Controller
{
    public function enrollment()
    {
        $enrollments = Enrollments::with([
            'course:id,code,name',
            'major:id,name,courses_id',
            'schoolYear:id,school_year',
            'semester:id,semester',
            'yearLevel:id,year_level',
            'student:id,fName,mName,lName,lName as last_name',
        ])
            ->latest('enrolled_at')
            ->get([
                'id',
                'student_id',
                'courses_id',
                'majors_id',
                'year_level_id',
                'school_year_id',
                'semester_id',
                'status',
                'enrolled_at',
            ]);

        $totals = [
            'total' => $enrollments->count(),
            'enrolled' => $enrollments->where('status', 'enrolled')->count(),
            'pending' => $enrollments->whereIn('status', ['pending', 'processing'])->count(),
            'withdrawn' => $enrollments->whereIn('status', ['withdrawn', 'cancelled', 'dropped'])->count(),
        ];

        $statusSummary = $enrollments
            ->groupBy(function ($enrollment) {
                return strtolower($enrollment->status ?? 'unspecified');
            })
            ->map(function ($group, $status) {
                return [
                    'status' => ucfirst($status),
                    'count' => $group->count(),
                ];
            })
            ->values()
            ->all();

        $byCourse = $enrollments
            ->groupBy('courses_id')
            ->map(function ($group) {
                $course = $group->first()->course;

                $statusBreakdown = $group
                    ->groupBy(function ($item) {
                        return strtolower($item->status ?? 'unspecified');
                    })
                    ->map(function ($items, $status) {
                        return [
                            'status' => ucfirst($status),
                            'count' => $items->count(),
                        ];
                    })
                    ->values()
                    ->all();

                return [
                    'course_id' => $course->id ?? null,
                    'course_code' => $course->code ?? 'Unassigned',
                    'course_name' => $course->name ?? 'Unassigned Course',
                    'total' => $group->count(),
                    'statusBreakdown' => $statusBreakdown,
                ];
            })
            ->values()
            ->all();

        $bySchoolYear = $enrollments
            ->groupBy(function ($enrollment) {
                return optional($enrollment->schoolYear)->school_year ?? 'Unassigned';
            })
            ->map(function ($group, $schoolYear) {
                $semesters = $group
                    ->groupBy(function ($item) {
                        return optional($item->semester)->semester ?? 'N/A';
                    })
                    ->map(function ($items, $semester) {
                        return [
                            'semester' => $semester,
                            'count' => $items->count(),
                        ];
                    })
                    ->values()
                    ->all();

                return [
                    'school_year' => $schoolYear,
                    'total' => $group->count(),
                    'semesters' => $semesters,
                ];
            })
            ->values()
            ->all();

        $recentEnrollments = $enrollments
            ->sortByDesc('enrolled_at')
            ->take(10)
            ->map(function ($enrollment) {
                $student = $enrollment->student;
                $studentNameParts = collect([
                    $student->lName ?? null,
                    $student->fName ?? null,
                    $student->mName ?? null,
                ])->filter()->all();

                $course = $enrollment->course;
                $major = $enrollment->major;

                return [
                    'id' => $enrollment->id,
                    'student' => empty($studentNameParts)
                        ? 'Unknown Student'
                        : sprintf('%s, %s%s',
                            $studentNameParts[0],
                            $studentNameParts[1] ?? '',
                            isset($studentNameParts[2]) ? ' ' . $studentNameParts[2] : ''
                        ),
                    'course_code' => $course->code ?? 'N/A',
                    'course_name' => $course->name ?? 'N/A',
                    'major' => $major->name ?? null,
                    'school_year' => optional($enrollment->schoolYear)->school_year,
                    'semester' => optional($enrollment->semester)->semester,
                    'status' => ucfirst(strtolower($enrollment->status ?? 'Unspecified')),
                    'enrolled_at' => $enrollment->enrolled_at
                        ? Carbon::parse($enrollment->enrolled_at)->toDateTimeString()
                        : null,
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Admin/Reports/EnrollmentReport', [
            'totals' => $totals,
            'statusSummary' => $statusSummary,
            'byCourse' => $byCourse,
            'bySchoolYear' => $bySchoolYear,
            'recentEnrollments' => $recentEnrollments,
        ]);
    }

    public function grades()
    {
        $grades = Grades::with([
            'enrollment.course:id,code,name',
            'enrollment.schoolYear:id,school_year',
            'enrollment.semester:id,semester',
            'enrollment.student:id,fName,mName,lName',
            'faculty:id,fName,mName,lName',
        ])
            ->latest('updated_at')
            ->get([
                'id',
                'enrollment_id',
                'class_schedule_id',
                'faculty_id',
                'grade',
                'remarks',
                'status',
                'updated_at',
            ]);

        $numericGrades = $grades
            ->pluck('grade')
            ->filter(fn ($grade) => is_numeric($grade))
            ->map(fn ($grade) => (float) $grade);

        $totals = [
            'records' => $grades->count(),
            'withGrades' => $numericGrades->count(),
            'average' => $numericGrades->count() ? round($numericGrades->avg(), 2) : null,
        ];

        $statusSummary = $grades
            ->groupBy(function ($grade) {
                return strtolower($grade->status ?? 'unspecified');
            })
            ->map(function ($group, $status) {
                return [
                    'status' => ucfirst($status),
                    'count' => $group->count(),
                ];
            })
            ->values()
            ->all();

        $byCourse = $grades
            ->groupBy(function ($grade) {
                return optional(optional($grade->enrollment)->course)->id ?? 'unassigned';
            })
            ->map(function ($group) {
                $course = optional(optional($group->first())->enrollment)->course;

                $numeric = $group
                    ->pluck('grade')
                    ->filter(fn ($grade) => is_numeric($grade))
                    ->map(fn ($grade) => (float) $grade);

                $statusBreakdown = $group
                    ->groupBy(function ($grade) {
                        return strtolower($grade->status ?? 'unspecified');
                    })
                    ->map(function ($items, $status) {
                        return [
                            'status' => ucfirst($status),
                            'count' => $items->count(),
                        ];
                    })
                    ->values()
                    ->all();

                return [
                    'course_id' => $course->id ?? null,
                    'course_code' => $course->code ?? 'Unassigned',
                    'course_name' => $course->name ?? 'Unassigned Course',
                    'records' => $group->count(),
                    'average' => $numeric->count() ? round($numeric->avg(), 2) : null,
                    'statusBreakdown' => $statusBreakdown,
                ];
            })
            ->values()
            ->all();

        $bySchoolYear = $grades
            ->groupBy(function ($grade) {
                return optional(optional($grade->enrollment)->schoolYear)->school_year ?? 'Unassigned';
            })
            ->map(function ($group, $schoolYear) {
                $records = $group->count();
                $numeric = $group
                    ->pluck('grade')
                    ->filter(fn ($grade) => is_numeric($grade))
                    ->map(fn ($grade) => (float) $grade);

                return [
                    'school_year' => $schoolYear,
                    'records' => $records,
                    'average' => $numeric->count() ? round($numeric->avg(), 2) : null,
                ];
            })
            ->values()
            ->all();

        $recentGrades = $grades
            ->sortByDesc('updated_at')
            ->take(10)
            ->map(function ($grade) {
                $enrollment = $grade->enrollment;
                $student = $enrollment?->student;
                $studentNameParts = collect([
                    $student->lName ?? null,
                    $student->fName ?? null,
                    $student->mName ?? null,
                ])->filter()->all();

                $course = optional($enrollment)->course;

                return [
                    'id' => $grade->id,
                    'student' => empty($studentNameParts)
                        ? 'Unknown Student'
                        : sprintf('%s, %s%s',
                            $studentNameParts[0],
                            $studentNameParts[1] ?? '',
                            isset($studentNameParts[2]) ? ' ' . $studentNameParts[2] : ''
                        ),
                    'course_code' => $course->code ?? 'N/A',
                    'course_name' => $course->name ?? 'N/A',
                    'grade' => $grade->grade,
                    'status' => ucfirst(strtolower($grade->status ?? 'unspecified')),
                    'recorded_at' => $grade->updated_at
                        ? Carbon::parse($grade->updated_at)->toDateTimeString()
                        : null,
                    'remarks' => $grade->remarks,
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Admin/Reports/GradeReport', [
            'totals' => $totals,
            'statusSummary' => $statusSummary,
            'byCourse' => $byCourse,
            'bySchoolYear' => $bySchoolYear,
            'recentGrades' => $recentGrades,
        ]);
    }
}
