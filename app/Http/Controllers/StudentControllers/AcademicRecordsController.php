<?php

namespace App\Http\Controllers\StudentControllers;

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
        $student = $request->user();

        $gradeRecords = Grades::with([
            'enrollment.semester',
            'enrollment.schoolYear',
            'enrollment.yearLevel',
        ])
            ->whereHas('enrollment', function ($query) use ($student) {
                $query->where('student_id', $student->id);
            })
            ->whereIn('status', ['approved', 'confirmed'])
            ->get();

        $records = $gradeRecords
            ->groupBy('enrollment_id')
            ->map(function (Collection $records, $enrollmentId) {
                $firstRecord = $records->first();
                $enrollment = $firstRecord?->enrollment;

                $semester = optional($enrollment?->semester)->semester ?? 'Semester';
                $schoolYear = optional($enrollment?->schoolYear)->school_year ?? 'School Year';
                $yearLevel = optional($enrollment?->yearLevel)->name
                    ?? optional($enrollment?->yearLevel)->year_level
                    ?? 'Year Level';

                $average = $this->calculateAverage($records);
                $remarksSummary = $this->summarizeRemarks($records);
                $latestUpdate = $records->max(function ($item) {
                    return $item->updated_at;
                });

                return [
                    'enrollment_id'   => (int) $enrollmentId,
                    'term_label'      => trim($semester . ' (' . $schoolYear . ')'),
                    'semester'        => $semester,
                    'school_year'     => $schoolYear,
                    'year_level'      => $yearLevel,
                    'subjects_count'  => $records->count(),
                    'average'         => $average,
                    'remarks_summary' => $remarksSummary,
                    'updated_at'      => $latestUpdate ? $latestUpdate->toDateTimeString() : null,
                ];
            })
            ->sortByDesc('updated_at')
            ->values();

        $groups = $records
            ->groupBy(function ($record) {
                return $record['year_level'] ?? 'Year Level';
            })
            ->map(function (Collection $items, $yearLevel) {
                return [
                    'year_level' => $yearLevel,
                    'records'    => $items->values(),
                ];
            })
            ->values();

        return Inertia::render('Students/AcademicRecords/AcademicRecord', [
            'groups'  => $groups,
        ]);
    }

    public function show(Request $request, Enrollments $enrollment)
    {
        $student = $request->user();
        $this->authorizeEnrollment($student, $enrollment);

        $allGradeRecords = Grades::with([
            'enrollment.semester',
            'enrollment.schoolYear',
            'enrollment.yearLevel',
        ])
            ->whereHas('enrollment', function ($query) use ($student) {
                $query->where('student_id', $student->id);
            })
            ->whereIn('status', ['approved', 'confirmed'])
            ->get();

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

        $semester = optional($enrollment->semester)->semester;
        $schoolYear = optional($enrollment->schoolYear)->school_year;
        $yearLevel = $this->determineYearLevelLabelFromEnrollment($enrollment);

        return Inertia::render('Students/AcademicRecords/RecordDetail', [
            'record' => [
                'term_label'  => trim(($semester ?? 'Semester') . ' (' . ($schoolYear ?? 'School Year') . ')'),
                'semester'    => $semester,
                'school_year' => $schoolYear,
                'year_level'  => $yearLevel,
            ],
            'groups'              => $groups,
            'activeEnrollmentId'  => (int) $enrollment->id,
        ]);
    }

    protected function authorizeEnrollment($user, Enrollments $enrollment): void
    {
        abort_unless($enrollment->student_id === $user->id, 403);
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
            'remarks'    => $record->remarks ?? 'Pending',
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
