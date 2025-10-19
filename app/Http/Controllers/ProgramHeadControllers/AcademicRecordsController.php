<?php

namespace App\Http\Controllers\ProgramHeadControllers;

use App\Http\Controllers\Controller;
use App\Models\Class_Schedules;
use App\Models\Enrollments;
use App\Models\Grades;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;

class AcademicRecordsController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->input('search', ''));
        $year = $request->input('year');
        $schoolYear = $request->input('school_year');
        $departmentId = optional($request->user())->department_id;

        $enrollmentsQuery = Enrollments::with([
                'student',
                'course',
                'yearLevel',
                'schoolYear',
            ])
            ->when($departmentId, function ($query) use ($departmentId) {
                $query->whereHas('course', function ($courseQuery) use ($departmentId) {
                    $courseQuery->where('department_id', $departmentId);
                });
            })
            ->when($search !== '', function ($query) use ($search) {
                $like = "%{$search}%";

                $query->where(function ($builder) use ($like) {
                    $builder->whereHas('student', function ($studentQuery) use ($like) {
                        $studentQuery->where('fName', 'like', $like)
                            ->orWhere('mName', 'like', $like)
                            ->orWhere('lName', 'like', $like)
                            ->orWhere('id_number', 'like', $like);
                    })
                    ->orWhereHas('course', function ($courseQuery) use ($like) {
                        $courseQuery->where('code', 'like', $like)
                            ->orWhere('name', 'like', $like);
                    });
                });
            })
            ->when($year && $year !== 'all', function ($query) use ($year) {
                $query->whereHas('yearLevel', function ($yearQuery) use ($year) {
                    $yearQuery->where('year_level', $year);
                });
            })
            ->when($schoolYear && $schoolYear !== 'all', function ($query) use ($schoolYear) {
                $query->whereHas('schoolYear', function ($syQuery) use ($schoolYear) {
                    $syQuery->where('school_year', $schoolYear);
                });
            })
            ->orderByDesc('enrolled_at')
            ->when(!$departmentId, function ($query) {
                $query->whereRaw('1 = 0');
            });

        $enrollments = $enrollmentsQuery->get();

        $gradeGroups = Grades::whereIn('enrollment_id', $enrollments->pluck('id'))
            ->get()
            ->groupBy('enrollment_id');

        $records = $enrollments->map(function (Enrollments $enrollment) use ($gradeGroups) {
            $grades = $gradeGroups->get($enrollment->id, collect());
            $average = $this->calculateAverage($grades);
            $remarksSummary = $this->summarizeRemarks($grades);

            return [
                'enrollment_id'    => (int) $enrollment->id,
                'student'          => optional($enrollment->student)?->only(['id', 'fName', 'mName', 'lName', 'id_number']),
                'course'           => optional($enrollment->course)?->only(['id', 'code', 'name']),
                'year_level_label' => optional($enrollment->yearLevel)->year_level,
                'school_year'      => optional($enrollment->schoolYear)->school_year,
                'remarks_summary'  => $remarksSummary,
                'average'          => $average,
                'subjects_count'   => $grades->count(),
            ];
        })->values();

        return Inertia::render('ProgramHead/Students/StudentRecords', [
            'records' => $records,
            'filters' => [
                'search' => $search,
                'year' => $year ?: 'all',
                'school_year' => $schoolYear ?: 'all',
            ],
        ]);
    }

    public function show(Enrollments $enrollment)
    {
        $enrollment->load([
            'student',
            'course',
            'yearLevel',
            'section',
            'semester',
            'schoolYear',
        ]);

        $studentId = $enrollment->student_id;

        $allGradeRecords = Grades::with([
                'enrollment.semester',
                'enrollment.schoolYear',
                'enrollment.yearLevel',
            ])
            ->whereHas('enrollment', function ($query) use ($studentId) {
                $query->where('student_id', $studentId);
            })
            ->whereIn('status', ['approved', 'confirmed'])
            ->get();

        $recordsByEnrollment = $allGradeRecords->groupBy('enrollment_id');

        $groups = $allGradeRecords
            ->groupBy(function (Grades $record) {
                return $this->determineYearLevelLabel($record);
            })
            ->map(function (Collection $recordsByYear) {
                $yearLabel = $this->determineYearLevelLabel($recordsByYear->first());

                $semesters = $recordsByYear
                    ->groupBy(function (Grades $record) {
                        return optional($record->enrollment?->semester)->semester ?? 'Semester';
                    })
                    ->map(function (Collection $semesterRecords) {
                        $first = $semesterRecords->first();
                        $semester = optional($first->enrollment?->semester)->semester ?? 'Semester';
                        $schoolYear = optional($first->enrollment?->schoolYear)->school_year ?? 'School Year';
                        $enrollmentId = (int) optional($first->enrollment)->id;

                        return [
                            'enrollment_id'   => $enrollmentId,
                            'semester'        => $semester,
                            'school_year'     => $schoolYear,
                            'term_label'      => trim($semester . ' (' . $schoolYear . ')'),
                            'average'         => $this->calculateAverage($semesterRecords),
                            'remarks_summary' => $this->summarizeRemarks($semesterRecords),
                            'subjects'        => $semesterRecords
                                ->map(fn (Grades $record) => $this->buildSubjectPayload($record))
                                ->values(),
                        ];
                    })
                    ->values();

                return [
                    'year_level' => $yearLabel,
                    'semesters'  => $semesters,
                ];
            })
            ->sortBy(function (array $group) {
                $order = $this->yearLevelOrder();
                $index = array_search($group['year_level'], $order, true);

                return $index === false ? count($order) : $index;
            })
            ->values();

        $enrollmentHistory = Enrollments::with([
                'course:id,code,name',
                'yearLevel:id,year_level',
                'semester:id,semester',
                'schoolYear:id,school_year',
            ])
            ->where('student_id', $studentId)
            ->orderByDesc('enrolled_at')
            ->get([
                'id',
                'student_id',
                'courses_id',
                'year_level_id',
                'semester_id',
                'school_year_id',
                'status',
                'enrolled_at',
            ])
            ->map(function (Enrollments $historyEnrollment) use ($recordsByEnrollment, $enrollment) {
                $grades = $recordsByEnrollment->get($historyEnrollment->id, collect());

                $semester = optional($historyEnrollment->semester)->semester;
                $schoolYear = optional($historyEnrollment->schoolYear)->school_year;

                return [
                    'id'              => (int) $historyEnrollment->id,
                    'term_label'      => trim(($semester ?? 'Semester') . ' (' . ($schoolYear ?? 'School Year') . ')'),
                    'semester'        => $semester,
                    'school_year'     => $schoolYear,
                    'year_level'      => optional($historyEnrollment->yearLevel)->year_level,
                    'status'          => $historyEnrollment->status,
                    'course'          => optional($historyEnrollment->course)?->only(['id', 'code', 'name']),
                    'average'         => $this->calculateAverage($grades),
                    'remarks_summary' => $this->summarizeRemarks($grades),
                    'is_active'       => (int) $historyEnrollment->id === (int) $enrollment->id,
                ];
            })
            ->values();

        $activeSubjects = $recordsByEnrollment
            ->get($enrollment->id, collect())
            ->map(function (Grades $record) {
                $payload = $this->buildSubjectPayload($record);
                $payload['semester'] = optional($record->enrollment?->semester)->semester;
                $payload['school_year'] = optional($record->enrollment?->schoolYear)->school_year;

                return $payload;
            })
            ->values();

        $semester = optional($enrollment->semester)->semester;
        $schoolYear = optional($enrollment->schoolYear)->school_year;
        $yearLevel = $this->determineYearLevelLabelFromEnrollment($enrollment);

        return Inertia::render('ProgramHead/Students/StudentRecordDetail', [
            'record' => [
                'term_label'  => trim(($semester ?? 'Semester') . ' (' . ($schoolYear ?? 'School Year') . ')'),
                'semester'    => $semester,
                'school_year' => $schoolYear,
                'year_level'  => $yearLevel,
            ],
            'groups'             => $groups,
            'activeEnrollmentId' => (int) $enrollment->id,
            'student'            => optional($enrollment->student)?->only(['id', 'fName', 'mName', 'lName', 'id_number']),
            'history'            => $enrollmentHistory,
            'activeSubjects'     => $activeSubjects,
        ]);
    }

    protected function calculateCumulative(?float $midterm, ?float $final, ?float $grade): ?float
    {
        if ($midterm !== null && $final !== null) {
            return round(($midterm + $final) / 2, 2);
        }

        if ($grade !== null) {
            return round($grade, 2);
        }

        return null;
    }

    protected function calculateAverage(Collection $records): ?float
    {
        $cumulatives = $records
            ->map(function (Grades $record) {
                $midterm = is_numeric($record->midterm) ? (float) $record->midterm : null;
                $final = is_numeric($record->final) ? (float) $record->final : null;
                $grade = is_numeric($record->grade) ? (float) $record->grade : null;

                return $this->calculateCumulative($midterm, $final, $grade);
            })
            ->filter(fn ($value) => $value !== null);

        if ($cumulatives->isEmpty()) {
            return null;
        }

        return round($cumulatives->avg(), 2);
    }

    protected function summarizeRemarks(Collection $records): string
    {
        if ($records->isEmpty()) {
            return 'Pending';
        }

        $remarks = $records->pluck('remarks')->filter()->map(fn ($remark) => strtolower($remark));

        if ($remarks->contains(fn ($remark) => str_contains($remark, 'fail'))) {
            return 'Contains failing marks';
        }

        if ($remarks->isNotEmpty() && $remarks->every(fn ($remark) => str_contains($remark, 'pass'))) {
            return 'All passed';
        }

        return $remarks->isEmpty() ? 'Pending' : 'Mixed';
    }

    protected function buildSubjectPayload(Grades $record): array
    {
        $classSchedule = Class_Schedules::with('subject')->find($record->class_schedule_id);
        $subject = $classSchedule?->subject;

        $midterm = is_numeric($record->midterm) ? (float) $record->midterm : null;
        $final = is_numeric($record->final) ? (float) $record->final : null;
        $grade = is_numeric($record->grade) ? (float) $record->grade : null;

        return [
            'code'       => $subject->code ?? '—',
            'title'      => $subject->descriptive_title ?? 'Untitled Subject',
            'cumulative' => $this->calculateCumulative($midterm, $final, $grade),
            'midterm'    => $midterm,
            'final'      => $final,
            'grade'      => $grade,
            'remarks'    => $record->remarks ?? 'Pending',
            'status'     => $record->status ?? null,
        ];
    }

    protected function determineYearLevelLabel(?Grades $record): string
    {
        if (!$record) {
            return 'Year Level';
        }

        $yearLevel = optional($record->enrollment?->yearLevel)->name
            ?? optional($record->enrollment?->yearLevel)->year_level
            ?? null;

        return $this->normalizeYearLevelLabel($yearLevel);
    }

    protected function determineYearLevelLabelFromEnrollment(?Enrollments $enrollment): string
    {
        if (!$enrollment) {
            return 'Year Level';
        }

        $yearLevel = optional($enrollment->yearLevel)->name
            ?? optional($enrollment->yearLevel)->year_level
            ?? null;

        return $this->normalizeYearLevelLabel($yearLevel);
    }

    protected function normalizeYearLevelLabel($value): string
    {
        if ($value === null) {
            return 'Year Level';
        }

        $normalized = strtolower(trim((string) $value));

        return match ($normalized) {
            '1', '1st year', 'first year'   => 'First Year',
            '2', '2nd year', 'second year' => 'Second Year',
            '3', '3rd year', 'third year'  => 'Third Year',
            '4', '4th year', 'fourth year' => 'Fourth Year',
            '5', '5th year', 'fifth year'  => 'Fifth Year',
            default                        => $value !== '' ? (string) $value : 'Year Level',
        };
    }

    protected function yearLevelOrder(): array
    {
        return ['First Year', 'Second Year', 'Third Year', 'Fourth Year', 'Fifth Year', 'Year Level'];
    }
}
