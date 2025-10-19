<?php

namespace App\Http\Controllers\FacultyControllers;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Class_Schedules;
use App\Models\EnrollmentSubject;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class FacultyReportsController extends Controller
{
    public function attendance(Request $request)
    {
        $facultyId = Auth::id();

        if (!$facultyId) {
            abort(403);
        }

        $activeSemester = $this->getActiveSemester();

        $schedules = Class_Schedules::with([
                'curriculumSubject.subject',
                'curriculumSubject.course',
                'section',
                'enrollmentSubjects.enrollment',
            ])
            ->where('faculty_id', $facultyId)
            ->when($activeSemester, fn ($query) => $query->where('semester_id', $activeSemester->id))
            ->orderBy('schedule_day')
            ->orderBy('start_time')
            ->get();

        $mappedSchedules = $this->mapSchedules($schedules);
        $attendanceSummaries = $this->buildAttendanceSummaries($schedules->pluck('id'));

        return Inertia::render('Faculty/Reports/AttendanceReport', [
            'schedules' => $mappedSchedules,
            'attendanceSummaries' => $attendanceSummaries,
            'activeSemester' => $activeSemester,
        ]);
    }

    public function grades(Request $request)
    {
        $facultyId = Auth::id();

        if (!$facultyId) {
            abort(403);
        }

        $activeSemester = $this->getActiveSemester();

        $scheduleQuery = Class_Schedules::with([
                'curriculumSubject.subject',
                'curriculumSubject.course',
                'section',
                'enrollmentSubjects.enrollment.student',
            ])
            ->where('faculty_id', $facultyId)
            ->when($activeSemester, fn ($query) => $query->where('semester_id', $activeSemester->id))
            ->orderBy('schedule_day')
            ->orderBy('start_time');

        $scheduleModels = $scheduleQuery->get();
        $mappedSchedules = $this->mapSchedules($scheduleModels)->map(function (array $schedule) use ($scheduleModels) {
            $original = $scheduleModels->firstWhere('id', $schedule['id']);

            $students = optional($original->enrollmentSubjects)
                ? $original->enrollmentSubjects
                    ->map(function (EnrollmentSubject $subject) {
                        $student = optional(optional($subject->enrollment)->student);

                        if (!$student) {
                            return null;
                        }

                        return [
                            'id' => (int) $student->id,
                            'name' => $this->formatStudentName($student),
                        ];
                    })
                    ->filter()
                    ->values()
                : collect();

            $schedule['students'] = $students;

            return $schedule;
        });

        $gradeSummaries = $this->buildGradeSummaries($scheduleModels->pluck('id'), $scheduleModels);

        return Inertia::render('Faculty/Reports/GradeReport', [
            'schedules' => $mappedSchedules,
            'gradeSummaries' => $gradeSummaries,
            'activeSemester' => $activeSemester,
        ]);
    }

    protected function getActiveSemester()
    {
        return DB::table('semesters')
            ->join('school_year', 'semesters.school_year_id', '=', 'school_year.id')
            ->where('semesters.is_active', 1)
            ->where('school_year.is_active', 1)
            ->select('semesters.*', 'school_year.school_year')
            ->first();
    }

    protected function mapSchedules(Collection $schedules): Collection
    {
        return $schedules->map(function (Class_Schedules $schedule) {
            $subject = optional(optional($schedule->curriculumSubject)->subject);
            $course = optional(optional($schedule->curriculumSubject)->course);
            $section = $schedule->section;

            $enrolledCount = optional($schedule->enrollmentSubjects)
                ? $schedule->enrollmentSubjects
                    ->filter(fn ($entry) => optional($entry->enrollment)->status === 'enrolled')
                    ->count()
                : null;

            return [
                'id' => (int) $schedule->id,
                'curriculum_subject' => $schedule->curriculumSubject ? [
                    'subject' => $subject ? [
                        'descriptive_title' => $subject->descriptive_title,
                        'title' => $subject->title,
                        'code' => $subject->code,
                    ] : null,
                    'course' => $course ? [
                        'code' => $course->code,
                        'name' => $course->name,
                    ] : null,
                ] : null,
                'subject' => $subject ? [
                    'descriptive_title' => $subject->descriptive_title,
                    'title' => $subject->title,
                    'code' => $subject->code,
                    'name' => $subject->name,
                ] : null,
                'subject_title' => $schedule->subject_title,
                'subject_code' => $subject->code ?? null,
                'section' => $section ? [
                    'id' => (int) $section->id,
                    'section' => $section->section,
                    'name' => $section->name,
                ] : null,
                'section_name' => $section->name ?? null,
                'schedule_day' => $schedule->schedule_day,
                'day' => $schedule->schedule_day,
                'start_time' => $schedule->start_time,
                'end_time' => $schedule->end_time,
                'formatted_time' => $schedule->formatted_time,
                'student_count' => $enrolledCount,
            ];
        })->values();
    }

    protected function buildAttendanceSummaries(Collection $scheduleIds): Collection
    {
        $ids = $scheduleIds->filter()->unique();

        if ($ids->isEmpty()) {
            return collect();
        }

        $records = Attendance::whereIn('class_schedule_id', $ids)
            ->where('type', 'class')
            ->orderByDesc('date')
            ->get()
            ->groupBy('class_schedule_id');

        return $ids->map(function ($scheduleId) use ($records) {
            $scheduleRecords = $records->get($scheduleId, collect());

            $totals = [
                'present' => $scheduleRecords->where('status', 'present')->count(),
                'absent' => $scheduleRecords->where('status', 'absent')->count(),
                'late' => $scheduleRecords->where('status', 'late')->count(),
                'excused' => $scheduleRecords->whereIn('status', ['excused', 'excuse'])->count(),
            ];

            $sessions = $scheduleRecords
                ->groupBy(function ($record) {
                    $dateValue = $record->date ?? $record->attendance_date ?? $record->created_at;
                    return $dateValue ? Carbon::parse($dateValue)->format('Y-m-d') : 'unknown';
                })
                ->map(function ($items, $dateKey) {
                    $reference = $items->first();
                    $dateValue = $reference->date ?? $reference->attendance_date ?? $reference->created_at;

                    return [
                        'dateKey' => $dateKey,
                        'date' => $dateValue,
                        'attendance_date' => $dateValue,
                        'recorded_at' => $dateValue,
                        'present' => $items->where('status', 'present')->count(),
                        'absent' => $items->where('status', 'absent')->count(),
                        'late' => $items->where('status', 'late')->count(),
                        'excused' => $items->whereIn('status', ['excused', 'excuse'])->count(),
                    ];
                })
                ->sortKeysDesc()
                ->values();

            return [
                'class_schedule_id' => (int) $scheduleId,
                'totals' => $totals,
                'sessions' => $sessions->take(10)->values(),
            ];
        })->values();
    }

    protected function buildGradeSummaries(Collection $scheduleIds, Collection $schedules): Collection
    {
        $ids = $scheduleIds->filter()->unique();

        if ($ids->isEmpty()) {
            return collect();
        }

        $lookup = $schedules->keyBy('id');

        $subjects = EnrollmentSubject::with(['enrollment.student', 'grades'])
            ->whereIn('class_schedule_id', $ids)
            ->get()
            ->groupBy('class_schedule_id');

        return $ids->map(function ($scheduleId) use ($subjects, $lookup) {
            $entries = $subjects->get($scheduleId, collect())
                ->filter(fn (EnrollmentSubject $subject) => optional($subject->enrollment)->status === 'enrolled')
                ->map(function (EnrollmentSubject $subject) {
                    $enrollment = $subject->enrollment;
                    $student = optional($enrollment)->student;
                    $grade = $subject->grades;

                    $statusLabel = strtolower(optional($grade)->status ?? 'draft');
                    $finalGrade = optional($grade)->final ?? optional($grade)->grade;

                    if ($finalGrade === null && $grade && $grade->midterm !== null) {
                        $finalGrade = $grade->midterm;
                    }

                    $remarks = optional($grade)->remarks;

                    if (!$remarks && $finalGrade !== null) {
                        $remarks = $finalGrade <= 3.0 ? 'Passed' : 'Failed';
                    }

                    return [
                        'enrollment_id' => optional($enrollment)->id,
                        'student_id' => optional($student)->id,
                        'student_name' => $this->formatStudentName($student),
                        'midterm' => optional($grade)->midterm,
                        'final' => $finalGrade,
                        'remarks' => $remarks,
                        'midterm_status' => $statusLabel,
                        'final_status' => $statusLabel,
                    ];
                })
                ->filter(fn ($entry) => !empty($entry['student_id']))
                ->values();

            $submitted = $entries->where('final_status', 'submitted')->count();
            $drafts = max($entries->count() - $submitted, 0);
            $failing = $entries
                ->filter(fn ($entry) => str_contains(strtolower((string) ($entry['remarks'] ?? '')), 'fail'))
                ->count();
            $passed = $entries
                ->filter(fn ($entry) => str_contains(strtolower((string) ($entry['remarks'] ?? '')), 'pass'))
                ->count();

            $gradeSum = 0;
            $gradeCount = 0;

            foreach ($entries as $entry) {
                $value = $entry['final'] ?? $entry['midterm'];

                if ($value !== null && is_numeric($value)) {
                    $gradeSum += (float) $value;
                    $gradeCount++;
                }
            }

            $average = $gradeCount > 0 ? $gradeSum / $gradeCount : null;

            return [
                'class_schedule_id' => (int) $scheduleId,
                'reference' => optional($lookup->get($scheduleId))->only([
                    'id',
                    'schedule_day',
                    'start_time',
                    'end_time',
                    'formatted_time',
                ]),
                'records' => $entries->take(25)->values(),
                'totals' => [
                    'submitted' => $submitted,
                    'drafts' => $drafts,
                    'failing' => $failing,
                    'passed' => $passed,
                ],
                'average' => $average,
            ];
        })->values();
    }

    protected function formatStudentName($student): ?string
    {
        if (!$student) {
            return null;
        }

        $parts = [];

        if ($student->lName) {
            $parts[] = trim($student->lName);
        }

        $given = $student->fName ? trim($student->fName) : null;
        $middle = $student->mName ? trim($student->mName) : null;

        if ($given) {
            if ($middle) {
                $given .= ' ' . mb_substr($middle, 0, 1) . '.';
            }

            $parts[] = $given;
        }

        return $parts ? implode(', ', $parts) : null;
    }
}
