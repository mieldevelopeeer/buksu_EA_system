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

        $enrollments = $this->loadStudentEnrollments($student->id);
        $groups = $this->groupEnrollmentsByYearLevel($enrollments);

        return Inertia::render('Students/AcademicRecords/AcademicRecord', [
            'groups'  => $groups,
        ]);
    }

    public function show(Request $request, Enrollments $enrollment)
    {
        $student = $request->user();
        $this->authorizeEnrollment($student, $enrollment);

        $enrollments = $this->loadStudentEnrollments($student->id);
        $groups = $this->groupEnrollmentsByYearLevel($enrollments);

        $enrollment->loadMissing([
            'course',
            'major',
            'yearLevel',
            'semester',
            'schoolYear',
            'section',
            'enrollmentSubjects.curriculumSubject.subject',
            'enrollmentSubjects.curriculumSubject.yearLevel',
            'enrollmentSubjects.curriculumSubject.semester',
            'enrollmentSubjects.classSchedule.faculty',
            'enrollmentSubjects.classSchedule.classroom',
            'enrollmentSubjects.droppedBy:id,fName,lName',
        ]);

        $subjects = $enrollment->enrollmentSubjects
            ->map(fn ($subject) => $this->buildEnrollmentSubjectPayload($subject))
            ->values();

        $semester = optional($enrollment->semester)->semester;
        $schoolYear = optional($enrollment->schoolYear)->school_year;
        $yearLevel = $this->determineYearLevelLabelFromEnrollment($enrollment);

        $subjectStatuses = [
            'enrolled' => $subjects->where('status', 'enrolled')->count(),
            'reserved' => $subjects->where('status', 'reserved')->count(),
            'dropped'  => $subjects->where('status', 'dropped')->count(),
        ];

        return Inertia::render('Students/AcademicRecords/RecordDetail', [
            'record' => [
                'term_label'     => trim(($semester ?? 'Semester') . ' (' . ($schoolYear ?? 'School Year') . ')'),
                'semester'       => $semester,
                'school_year'    => $schoolYear,
                'year_level'     => $yearLevel,
                'status'         => $enrollment->status,
                'subjects_count' => $subjects->count(),
                'status_counts'  => $subjectStatuses,
            ],
            'groups'              => $groups,
            'subjects'            => $subjects,
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

    protected function buildEnrollmentSubjectPayload($enrollmentSubject): array
    {
        $curriculumSubject = $enrollmentSubject->curriculumSubject;
        $subject = $curriculumSubject?->subject;
        $schedule = $enrollmentSubject->classSchedule;
        $grade = $enrollmentSubject->grade; // Now properly filtered by class_schedule_id

        $lec = (float) ($curriculumSubject->lec_unit ?? $subject->lec_unit ?? 0);
        $lab = (float) ($curriculumSubject->lab_unit ?? $subject->lab_unit ?? 0);
        
        // Safely extract grade values with null checks
        $midterm = null;
        $final = null;
        $gradeValue = null;
        
        if ($grade) {
            $midterm = is_numeric($grade->midterm ?? null) ? (float) $grade->midterm : null;
            $final = is_numeric($grade->final ?? null) ? (float) $grade->final : null;
            $gradeValue = is_numeric($grade->grade ?? null) ? (float) $grade->grade : null;
        }
        
        $cumulative = $this->calculateCumulative($midterm, $final, $gradeValue);

        return [
            'id'            => $enrollmentSubject->id,
            'status'        => $enrollmentSubject->status,
            'drop_reason'   => $enrollmentSubject->drop_reason,
            'dropped_at'    => optional($enrollmentSubject->dropped_at)->toDateTimeString(),
            'dropped_by'    => $enrollmentSubject->droppedBy ? [
                'id'   => $enrollmentSubject->droppedBy->id,
                'name' => trim(($enrollmentSubject->droppedBy->fName ?? '') . ' ' . ($enrollmentSubject->droppedBy->lName ?? '')),
            ] : null,
            'code'          => $subject->code ?? '—',
            'title'         => $subject->descriptive_title ?? 'Untitled Subject',
            'units'         => $lec + $lab,
            'schedule'      => $schedule ? [
                'day'        => $schedule->schedule_day ?? 'TBA',
                'start_time' => $schedule->start_time ?? null,
                'end_time'   => $schedule->end_time ?? null,
                'room'       => optional($schedule->classroom)->room_number ?? 'TBA',
            ] : null,
            'faculty'       => $schedule && $schedule->faculty ? trim(($schedule->faculty->fName ?? '') . ' ' . ($schedule->faculty->lName ?? '')) : 'TBA',
            'midterm'       => $midterm,
            'final'         => $final,
            'grade'         => $gradeValue,
            'cumulative'    => $cumulative,
            'remarks'       => $grade?->remarks ?? null,
        ];
    }

    protected function loadStudentEnrollments(int $studentId)
    {
        return Enrollments::with([
            'course',
            'major',
            'yearLevel',
            'semester',
            'schoolYear',
            'enrollmentSubjects.curriculumSubject.subject',
            'enrollmentSubjects.curriculumSubject.yearLevel',
            'enrollmentSubjects.curriculumSubject.semester',
            'enrollmentSubjects.classSchedule.faculty',
            'enrollmentSubjects.classSchedule.classroom',
            'enrollmentSubjects.droppedBy:id,fName,lName',
            'enrollmentSubjects.grade',
        ])
            ->where('student_id', $studentId)
            ->orderByDesc('enrolled_at')
            ->get();
    }

    protected function groupEnrollmentsByYearLevel(Collection $enrollments)
    {
        $records = $enrollments->map(function (Enrollments $enrollment) {
            $subjects = $enrollment->enrollmentSubjects
                ->map(fn ($subject) => $this->buildEnrollmentSubjectPayload($subject));

            $semester = optional($enrollment->semester)->semester ?? 'Semester';
            $schoolYearModel = $enrollment->schoolYear;
            $schoolYear = optional($schoolYearModel)->school_year ?? 'School Year';
            $schoolYearStart = optional($schoolYearModel)->start_date;
            $schoolYearEnd = optional($schoolYearModel)->end_date;
            $yearLevel = $this->determineYearLevelLabelFromEnrollment($enrollment);
            $statusCounts = [
                'enrolled' => $subjects->where('status', 'enrolled')->count(),
                'reserved' => $subjects->where('status', 'reserved')->count(),
                'dropped'  => $subjects->where('status', 'dropped')->count(),
            ];

            return [
                'enrollment_id'  => (int) $enrollment->id,
                'term_label'     => trim($semester . ' (' . $schoolYear . ')'),
                'semester'       => $semester,
                'school_year'    => $schoolYear,
                'school_year_start' => $schoolYearStart,
                'school_year_end'   => $schoolYearEnd,
                'year_level'     => $yearLevel,
                'subjects_count' => $subjects->count(),
                'status'         => $enrollment->status,
                'subjects'       => $subjects,
                'status_counts'  => $statusCounts,
                'updated_at'     => optional($enrollment->updated_at)->toDateTimeString(),
            ];
        });

        return $records
            ->groupBy(fn ($record) => $record['year_level'] ?? 'Year Level')
            ->map(function (Collection $items, $yearLevel) {
                return [
                    'year_level' => $yearLevel,
                    'records'    => $items->values(),
                ];
            })
            ->values();
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
