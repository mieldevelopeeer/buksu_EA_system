<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Grades;
use App\Models\Courses;
use App\Models\YearLevel;
use App\Models\Semester;
use Illuminate\Support\Str;

class GradeReportsController extends Controller
{
    public function index(Request $request)
    {
        // Eager load necessary relationships
        $gradesQuery = Grades::with([
            'enrollment.student',
            'enrollment.course',
            'enrollment.yearLevel',
            'enrollment.semester',
            'faculty',
            'classSchedule.curriculumSubject.subject',
        ]);

        // Filters
        if ($request->filled('course_id')) {
            $gradesQuery->whereHas('enrollment.course', function($q) use ($request) {
                $q->where('id', $request->course_id);
            });
        }

        if ($request->filled('year_level_id')) {
            $gradesQuery->whereHas('enrollment.yearLevel', function($q) use ($request) {
                $q->where('id', $request->year_level_id);
            });
        }

        if ($request->filled('semester_id')) {
            $gradesQuery->whereHas('enrollment.semester', function($q) use ($request) {
                $q->where('id', $request->semester_id);
            });
        }

        if ($request->filled('status')) {
            $gradesQuery->where('status', $request->status); // e.g., 'passed', 'failed', 'inc', 'withdrawn'
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $gradesQuery->whereHas('enrollment.student', function($q) use ($search) {
                $q->where('fName', 'like', "%{$search}%")
                  ->orWhere('mName', 'like', "%{$search}%")
                  ->orWhere('lName', 'like', "%{$search}%")
                  ->orWhere('student_id', 'like', "%{$search}%");
            });
        }

        if ($request->filled('subject')) {
            $subject = $request->subject;

            if (Str::startsWith($subject, 'curriculum-')) {
                $subjectId = (int) Str::after($subject, 'curriculum-');
                $gradesQuery->whereHas('classSchedule.curriculumSubject', function ($query) use ($subjectId) {
                    $query->where('id', $subjectId);
                });
            } elseif (Str::startsWith($subject, 'schedule-')) {
                $scheduleId = (int) Str::after($subject, 'schedule-');
                $gradesQuery->where('class_schedule_id', $scheduleId);
            }
        }

        $perPage = $request->integer('per_page', 15);

        $paginatedGrades = $gradesQuery
            ->latest('updated_at')
            ->paginate($perPage)
            ->withQueryString();

        $transformedGrades = $paginatedGrades->getCollection()->map(function ($grade) {
            $classSchedule = $grade->classSchedule;
            $curriculumSubject = optional($classSchedule)->curriculumSubject;
            $subjectData = optional($curriculumSubject)->subject;
            $student = optional($grade->enrollment)->student;

            $subjectCode = collect([
                $grade->subject_code ?? null,
                $curriculumSubject?->subject_code,
                $curriculumSubject?->code,
                $subjectData?->code,
                optional($classSchedule)->subject_code,
                $subjectData?->subject_code,
            ])->first(function ($value) {
                if ($value === null) {
                    return false;
                }
                $trimmed = trim((string) $value);
                return $trimmed !== '' && strtolower($trimmed) !== 'null';
            });

            $subjectTitle = collect([
                $grade->subject_title ?? null,
                $curriculumSubject?->subject_title,
                $subjectData?->descriptive_title,
                $subjectData?->title,
                $subjectData?->name,
            ])->first(function ($value) {
                if ($value === null) {
                    return false;
                }
                return trim((string) $value) !== '';
            });

            $subjectKey = $curriculumSubject
                ? 'curriculum-' . $curriculumSubject->id
                : 'schedule-' . ($grade->class_schedule_id ?? 'unassigned');

            $grade->subject_code = $subjectCode;
            $grade->subject_title = $subjectTitle;
            $grade->subject_key = $subjectKey;
            $grade->setRelation('curriculum_subject', $curriculumSubject);

            $studentNameParts = collect([
                $student?->lName ?? $student?->last_name ?? $student?->surname ?? $student?->lastname,
                $student?->fName ?? $student?->first_name ?? $student?->given_name ?? $student?->firstname,
                $student?->mName ?? $student?->middle_name ?? $student?->middlename ?? $student?->middle,
            ])->map(function ($value) {
                return $value !== null ? trim((string) $value) : null;
            })->filter(function ($value) {
                return $value !== null && $value !== '' && strtolower($value) !== 'null';
            })->values();

            if ($studentNameParts->isNotEmpty()) {
                $last = $studentNameParts->get(0) ?? null;
                $first = $studentNameParts->get(1) ?? null;
                $middle = $studentNameParts->get(2) ?? null;

                $base = $last && $first
                    ? sprintf('%s, %s', $last, $first)
                    : $studentNameParts->implode(' ');

                $grade->student_display = $middle && $last && $first
                    ? sprintf('%s %s', $base, $middle)
                    : $base;
            } else {
                $grade->student_display = null;
            }

            $course = optional($grade->enrollment)->course;
            $yearLevel = optional($grade->enrollment)->yearLevel;
            $semester = optional($grade->enrollment)->semester;

            $grade->course_code_display = $course?->full_course_code
                ?? $course?->code
                ?? null;
            $grade->course_name_display = $course?->name ?? null;
            $grade->year_level_display = $yearLevel?->year_level ?? null;
            $grade->semester_display = $semester?->semester ?? $semester?->name ?? null;

            return $grade;
        });

        $paginatedGrades->setCollection($transformedGrades);

        // Filters for dropdowns
        $courses = Courses::all();
        $yearLevels = YearLevel::all();
        $semesters = Semester::all();

        return inertia('Registrar/Reports/GradeReports', [
            'grades' => $paginatedGrades,
            'courses' => $courses,
            'yearLevels' => $yearLevels,
            'semesters' => $semesters,
            'filters' => [
                'search' => $request->input('search'),
                'course_id' => $request->input('course_id'),
                'year_level_id' => $request->input('year_level_id'),
                'semester_id' => $request->input('semester_id'),
                'status' => $request->input('status'),
                'subject' => $request->input('subject'),
            ],
        ]);
    }
}
