<?php

namespace App\Http\Controllers\FacultyControllers;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Class_Schedules;
use App\Models\EnrollmentPeriod;
use App\Models\EnrollmentSubject;
use App\Models\Enrollments;
use App\Models\Grades;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class FacultyDashboardController extends Controller
{
    public function index(Request $request)
    {
        $faculty = $request->user();

        if (!$faculty) {
            abort(403, 'Unable to resolve authenticated faculty.');
        }

        $activeSemester = $this->getActiveSemester();
        $scheduleModels = $this->loadSchedules((int) $faculty->id, $activeSemester);
        $scheduleIds = $scheduleModels->pluck('id')->all();
        $scheduleIndex = $scheduleModels->keyBy('id');

        $today = Carbon::now();
        $tomorrow = Carbon::now()->addDay();

        $stats = $this->buildStats($scheduleModels, (int) $faculty->id, $scheduleIds, $activeSemester);
        $gradeOverview = $this->buildGradeTrend($scheduleIds);
        $attendanceSummary = $this->buildAttendanceSummary($scheduleModels, $scheduleIds);
        $absenceAlerts = $this->buildAbsenceAlerts($scheduleIds, $scheduleIndex);
        $enrollmentPeriod = $this->resolveEnrollmentPeriod();
        
        // Get academic year start and end dates for refresh logic
        $academicYear = $this->getActiveAcademicYear();

        return Inertia::render('Faculty/Dashboard', [
            'stats' => $stats,
            'gradeOverview' => $gradeOverview,
            'attendanceSummary' => $attendanceSummary,
            'schedulesToday' => $this->schedulesForDay($scheduleModels, $today),
            'schedulesTomorrow' => $this->schedulesForDay($scheduleModels, $tomorrow),
            'absenceAlerts' => $absenceAlerts,
            'enrollmentPeriod' => $enrollmentPeriod,
            'activeSemester' => $activeSemester,
            'academicYear' => $academicYear ? [
                'id' => $academicYear->id,
                'schoolYear' => $academicYear->school_year,
                'startDate' => $academicYear->start_date,
                'endDate' => $academicYear->end_date,
            ] : null,
        ]);
    }

    protected function loadSchedules(int $facultyId, $activeSemester): Collection
    {
        $scheduleQuery = Class_Schedules::with([
                'curriculumSubject.subject',
                'curriculumSubject.course',
                'section',
                'classroom',
                'enrollmentSubjects.enrollment.student',
            ])
            ->when($facultyId, fn ($query) => $query->where('faculty_id', $facultyId))
            ->when($activeSemester, fn ($query) => $query->where('semester_id', $activeSemester->id))
            ->orderBy('schedule_day')
            ->orderBy('start_time');

        $schedules = $scheduleQuery->get();

        if ($schedules->isEmpty()) {
            $sectionIds = $this->findFacultySectionIds($facultyId);

            if ($sectionIds->isNotEmpty()) {
                $schedules = Class_Schedules::with([
                        'curriculumSubject.subject',
                        'curriculumSubject.course',
                        'section',
                        'classroom',
                        'enrollmentSubjects.enrollment.student',
                    ])
                    ->whereIn('section_id', $sectionIds)
                    ->when($activeSemester, fn ($query) => $query->where('semester_id', $activeSemester->id))
                    ->orderBy('schedule_day')
                    ->orderBy('start_time')
                    ->get();
            }
        }

        if ($schedules->isEmpty()) {
            $schedules = Class_Schedules::with([
                    'curriculumSubject.subject',
                    'curriculumSubject.course',
                    'section',
                    'classroom',
                    'enrollmentSubjects.enrollment.student',
                ])
                ->when($activeSemester, fn ($query) => $query->where('semester_id', $activeSemester->id))
                ->orderBy('schedule_day')
                ->orderBy('start_time')
                ->get();
        }

        return $schedules;
    }

    protected function schedulesForDay(Collection $schedules, Carbon $day): array
    {
        return $schedules
            ->filter(fn (Class_Schedules $schedule) => $this->scheduleMatchesDay($schedule, $day))
            ->map(fn (Class_Schedules $schedule) => $this->formatScheduleCard($schedule))
            ->values()
            ->all();
    }

    protected function scheduleMatchesDay(Class_Schedules $schedule, Carbon $day): bool
    {
        $targetFull = strtolower($day->format('l'));
        $targetShort = strtolower($day->format('D'));
        $value = strtolower((string) $schedule->schedule_day);

        if ($value === '') {
            return false;
        }

        if (str_contains($value, $targetFull) || str_contains($value, $targetShort)) {
            return true;
        }

        $normalized = preg_replace('/[^a-z]/', ' ', $value);
        $tokens = array_filter(explode(' ', $normalized));

        return in_array($targetFull, $tokens, true) || in_array($targetShort, $tokens, true);
    }

    protected function formatScheduleCard(Class_Schedules $schedule): array
    {
        $subject = optional(optional($schedule->curriculumSubject)->subject);
        $section = $schedule->section;

        return [
            'id' => (int) $schedule->id,
            'subject' => $subject->descriptive_title
                ?? $subject->title
                ?? $subject->name
                ?? $schedule->subject_title
                ?? 'Subject',
            'section' => $section?->name ?? $section?->section ?? 'Section',
            'time' => $this->formatTimeRange($schedule->start_time, $schedule->end_time),
            'room' => optional($schedule->classroom)->room_number ?? 'Room TBA',
            'day' => $schedule->schedule_day,
        ];
    }

    protected function buildStats(Collection $schedules, int $facultyId, array $scheduleIds, $activeSemester): array
    {
        $studentIds = $schedules
            ->flatMap(function (Class_Schedules $schedule) {
                return optional($schedule->enrollmentSubjects)
                    ? $schedule->enrollmentSubjects
                        ->map(fn (EnrollmentSubject $subject) => optional(optional($subject->enrollment)->student)->id)
                        ->filter()
                    : collect();
            })
            ->unique();

        $pendingGrades = Grades::query()
            ->when(!empty($scheduleIds), fn ($query) => $query->whereIn('class_schedule_id', $scheduleIds))
            ->when($activeSemester, function ($query) use ($activeSemester) {
                $query->whereHas('classSchedule', fn ($scheduleQuery) =>
                    $scheduleQuery->where('semester_id', $activeSemester->id)
                );
            })
            ->where(function ($query) {
                $query->whereNull('midterm_status')
                    ->orWhere('midterm_status', '!=', 'confirmed')
                    ->orWhereNull('final_status')
                    ->orWhere('final_status', '!=', 'confirmed');
            })
            ->count();

        $attendanceStatusCounts = Attendance::query()
            ->when(!empty($scheduleIds), fn ($query) => $query->whereIn('class_schedule_id', $scheduleIds))
            ->select(DB::raw('LOWER(status) as status'), DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $totalMarked = $attendanceStatusCounts->sum();
        $presentCount = (int) $attendanceStatusCounts->get('present', 0);
        $attendanceRate = $totalMarked > 0
            ? round(($presentCount / $totalMarked) * 100)
            : 0;

        return [
            'classes' => $schedules->count(),
            'students' => $studentIds->count(),
            'pendingGrades' => $pendingGrades,
            'attendanceRate' => $attendanceRate,
        ];
    }

    protected function buildGradeTrend(array $scheduleIds): array
    {
        if (empty($scheduleIds)) {
            return [];
        }

        $start = Carbon::now()->subDays(4)->startOfDay();

        $dailyCounts = Grades::query()
            ->whereIn('class_schedule_id', $scheduleIds)
            ->where('updated_at', '>=', $start)
            ->select(DB::raw('DATE(updated_at) as day'), DB::raw('COUNT(*) as total'))
            ->groupBy('day')
            ->pluck('total', 'day');

        $data = [];
        $cursor = $start->copy();
        while ($cursor->lte(Carbon::now())) {
            $dateKey = $cursor->format('Y-m-d');
            $data[] = [
                'name' => $cursor->format('D'),
                'submitted' => (int) ($dailyCounts[$dateKey] ?? 0),
            ];
            $cursor->addDay();
        }

        return $data;
    }

    protected function buildAttendanceSummary(Collection $schedules, array $scheduleIds): array
    {
        if (empty($scheduleIds)) {
            return [];
        }

        $attendanceAggregates = Attendance::query()
            ->whereIn('class_schedule_id', $scheduleIds)
            ->select(
                'class_schedule_id',
                DB::raw("SUM(CASE WHEN LOWER(status) = 'present' THEN 1 ELSE 0 END) as present_count"),
                DB::raw('COUNT(*) as total_count')
            )
            ->groupBy('class_schedule_id')
            ->get()
            ->keyBy('class_schedule_id');

        return $schedules
            ->map(function (Class_Schedules $schedule) use ($attendanceAggregates) {
                $aggregate = $attendanceAggregates->get($schedule->id);
                $total = (int) ($aggregate->total_count ?? 0);
                $present = (int) ($aggregate->present_count ?? 0);
                $rate = $total > 0 ? round(($present / $total) * 100) : 0;

                return [
                    'section' => $schedule->section->name
                        ?? $schedule->section->section
                        ?? 'Section',
                    'rate' => $rate,
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    protected function buildAbsenceAlerts(array $scheduleIds, Collection $scheduleIndex): array
    {
        if (empty($scheduleIds)) {
            return [
                'warning' => [],
                'critical' => [],
            ];
        }

        $absenceRows = Attendance::query()
            ->whereIn('class_schedule_id', $scheduleIds)
            ->whereRaw("LOWER(status) = 'absent'")
            ->select('enrollment_id', 'class_schedule_id', DB::raw('COUNT(*) as total_absences'))
            ->groupBy('enrollment_id', 'class_schedule_id')
            ->having('total_absences', '>=', 3)
            ->get();

        if ($absenceRows->isEmpty()) {
            return [
                'warning' => [],
                'critical' => [],
            ];
        }

        $enrollments = Enrollments::with('student')
            ->whereIn('id', $absenceRows->pluck('enrollment_id')->unique())
            ->get()
            ->keyBy('id');

        $warnings = [];
        $criticals = [];

        foreach ($absenceRows as $row) {
            $enrollment = $enrollments->get($row->enrollment_id);
            $schedule = $scheduleIndex->get($row->class_schedule_id);

            if (!$enrollment || !$schedule) {
                continue;
            }

            $student = optional($enrollment->student);
            $section = $schedule->section;
            $subject = optional(optional($schedule->curriculumSubject)->subject);

            $payload = [
                'student' => trim(implode(' ', array_filter([
                    $student->lName ?? null,
                    $student->fName ?? null,
                    $student->mName ?? null,
                ]))) ?: ($student->name ?? 'Student'),
                'absences' => (int) $row->total_absences,
                'section' => $section->name ?? $section->section ?? 'Section',
                'subject' => $subject->code ?? $subject->title ?? $schedule->subject_title ?? 'Subject',
            ];

            if ($row->total_absences >= 5) {
                $criticals[] = $payload;
            } else {
                $warnings[] = $payload;
            }
        }

        return [
            'warning' => $warnings,
            'critical' => $criticals,
        ];
    }

    protected function resolveEnrollmentPeriod(): array
    {
        $today = Carbon::today();

        $current = EnrollmentPeriod::with(['schoolYear', 'semester'])
            ->where('status', 'Open')
            ->orderByDesc('start_date')
            ->first();

        $upcoming = EnrollmentPeriod::with(['schoolYear', 'semester'])
            ->whereDate('start_date', '>', $today)
            ->orderBy('start_date')
            ->first();

        return [
            'current' => $current ? $this->formatEnrollmentPeriod($current) : null,
            'upcoming' => $upcoming ? $this->formatEnrollmentPeriod($upcoming) : null,
        ];
    }

    protected function formatEnrollmentPeriod(?EnrollmentPeriod $period): ?array
    {
        if (!$period) {
            return null;
        }

        return [
            'status' => $period->status,
            'start' => optional($period->start_date) ? Carbon::parse($period->start_date)->toDateString() : null,
            'end' => optional($period->end_date) ? Carbon::parse($period->end_date)->toDateString() : null,
            'schoolYear' => optional($period->schoolYear)->school_year,
            'semester' => optional($period->semester)->semester,
        ];
    }

    protected function formatTimeRange(?string $start, ?string $end): string
    {
        if (!$start || !$end) {
            return 'Schedule to follow';
        }

        try {
            return Carbon::createFromFormat('H:i:s', $start)->format('g:i A') . ' - '
                . Carbon::createFromFormat('H:i:s', $end)->format('g:i A');
        } catch (\Exception $e) {
            try {
                return Carbon::createFromFormat('H:i', $start)->format('g:i A') . ' - '
                    . Carbon::createFromFormat('H:i', $end)->format('g:i A');
            } catch (\Exception $ignored) {
                return trim($start . ' - ' . $end);
            }
        }
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

    protected function getActiveAcademicYear()
    {
        return DB::table('school_year')
            ->where('is_active', 1)
            ->first();
    }

    protected function findFacultySectionIds(int $facultyId): Collection
    {
        // Sections are managed by program heads, not faculty directly
        // Faculty access sections through class schedules with faculty_id
        // This method is kept for backward compatibility but returns empty collection
        return collect();
    }
}
