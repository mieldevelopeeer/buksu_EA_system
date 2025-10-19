<?php

namespace App\Http\Controllers\ProgramHeadControllers;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\class_schedules as ClassSchedule;
use App\Models\Enrollments;
use App\Models\Grades;
use App\Models\YearLevel;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportsController extends Controller
{
    public function enrollment(Request $request)
    {
        $departmentId = optional($request->user())->department_id;

        if (!$departmentId) {
            return Inertia::render('ProgramHead/Reports/Enrollment', [
                'summary' => $this->emptyEnrollmentSummary(),
                'recent'  => [],
            ]);
        }

        $baseQuery = Enrollments::query()
            ->whereHas('course', function ($query) use ($departmentId) {
                $query->where('department_id', $departmentId);
            });

        $totalEnrollments = (clone $baseQuery)->count();
        $distinctPrograms = (clone $baseQuery)->distinct('courses_id')->count('courses_id');

        $statusCounts = (clone $baseQuery)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        $yearCounts = (clone $baseQuery)
            ->select('year_level_id', DB::raw('COUNT(*) as total'))
            ->groupBy('year_level_id')
            ->get();

        $yearLevelLabels = YearLevel::whereIn('id', $yearCounts->pluck('year_level_id')->filter())
            ->pluck('year_level', 'id');

        $byYear = $yearCounts->map(function ($row) use ($yearLevelLabels) {
            $label = $yearLevelLabels[$row->year_level_id] ?? 'Unassigned';

            return [
                'year_level' => $label,
                'total'      => (int) $row->total,
            ];
        })->values();

        $recentEnrollments = (clone $baseQuery)
            ->with([
                'student:id,fName,mName,lName,id_number',
                'course:id,code,name',
                'yearLevel:id,year_level',
            ])
            ->latest('enrolled_at')
            ->limit(10)
            ->get()
            ->map(function (Enrollments $enrollment) {
                $student = $enrollment->student;
                $course = $enrollment->course;
                $yearLevel = $enrollment->yearLevel;

                return [
                    'id'           => (int) $enrollment->id,
                    'student_name' => $student
                        ? trim(sprintf('%s, %s %s', $student->lName ?? '', $student->fName ?? '', $student->mName ?? ''))
                        : 'Unnamed',
                    'student_id'   => $student->id_number ?? '—',
                    'program'      => $course->name ?? '—',
                    'year_level'   => $yearLevel->year_level ?? '—',
                    'status'       => $enrollment->status ?? 'unspecified',
                    'recorded_at'  => $enrollment->enrolled_at
                        ? Carbon::parse($enrollment->enrolled_at)->format('M d, Y')
                        : '—',
                ];
            })
            ->toArray();

        return Inertia::render('ProgramHead/Reports/Enrollment', [
            'summary' => [
                'total'     => $totalEnrollments,
                'programs'  => $distinctPrograms,
                'by_status' => $statusCounts,
                'by_year'   => $byYear,
            ],
            'recent' => $recentEnrollments,
        ]);
    }

    public function grades(Request $request)
    {
        $departmentId = optional($request->user())->department_id;

        if (!$departmentId) {
            return Inertia::render('ProgramHead/Reports/Grades', [
                'summary' => $this->emptyGradeSummary(),
                'recent'  => [],
            ]);
        }

        $gradeQuery = Grades::query()
            ->whereHas('enrollment.course', function ($query) use ($departmentId) {
                $query->where('department_id', $departmentId);
            });

        $totalGrades = (clone $gradeQuery)->count();

        $averageGrade = (clone $gradeQuery)
            ->select(DB::raw('AVG(COALESCE(final, grade, midterm)) as avg_grade'))
            ->value('avg_grade');

        $remarksCounts = (clone $gradeQuery)
            ->select('remarks', DB::raw('COUNT(*) as total'))
            ->groupBy('remarks')
            ->pluck('total', 'remarks')
            ->toArray();

        $topSubjectCounts = (clone $gradeQuery)
            ->select('class_schedule_id', DB::raw('COUNT(*) as total'))
            ->whereNotNull('class_schedule_id')
            ->groupBy('class_schedule_id')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        $classSchedules = ClassSchedule::with(['subject', 'course:id,code,name'])
            ->whereIn('id', $topSubjectCounts->pluck('class_schedule_id')->filter())
            ->get()
            ->keyBy('id');

        $topSubjects = $topSubjectCounts->map(function ($row) use ($classSchedules) {
            $schedule = $classSchedules->get($row->class_schedule_id);

            $subjectLabel = 'Subject';
            if ($schedule) {
                if ($schedule->subject) {
                    $subjectLabel = trim(sprintf('%s %s', $schedule->subject->code ?? '', $schedule->subject->descriptive_title ?? ''));
                } elseif ($schedule->curriculumSubject && $schedule->curriculumSubject->subject) {
                    $subjectLabel = trim(sprintf(
                        '%s %s',
                        $schedule->curriculumSubject->subject->code ?? '',
                        $schedule->curriculumSubject->subject->descriptive_title ?? ''
                    ));
                }
            }

            $subjectLabel = $subjectLabel ?: 'Subject';

            return [
                'subject' => $subjectLabel,
                'total'   => (int) $row->total,
            ];
        })->values();

        $recentGrades = (clone $gradeQuery)
            ->with([
                'enrollment.student:id,fName,mName,lName,id_number',
                'enrollment.course:id,code,name',
                'classSchedule.subject',
                'classSchedule.course:id,code,name',
            ])
            ->latest('updated_at')
            ->limit(10)
            ->get()
            ->map(function (Grades $grade) {
                $student = optional($grade->enrollment)->student;
                $course = optional($grade->enrollment)->course;
                $class = $grade->classSchedule;

                $finalGrade = $grade->final ?? $grade->grade ?? null;
                if ($finalGrade === null && $grade->midterm !== null) {
                    $finalGrade = ($grade->midterm + ($grade->final ?? $grade->midterm)) / 2;
                }

                $subjectLabel = '—';
                if ($class) {
                    if ($class->subject) {
                        $subjectLabel = trim(sprintf('%s %s', $class->subject->code ?? '', $class->subject->descriptive_title ?? '')) ?: '—';
                    } elseif ($class->curriculumSubject && $class->curriculumSubject->subject) {
                        $subjectLabel = trim(sprintf(
                            '%s %s',
                            $class->curriculumSubject->subject->code ?? '',
                            $class->curriculumSubject->subject->descriptive_title ?? ''
                        )) ?: '—';
                    }
                }

                return [
                    'id'          => (int) $grade->id,
                    'student'     => $student
                        ? trim(sprintf('%s, %s %s', $student->lName ?? '', $student->fName ?? '', $student->mName ?? ''))
                        : 'Unnamed',
                    'student_id'  => $student->id_number ?? '—',
                    'subject'     => $subjectLabel,
                    'course'      => $course->code ?? $course->name ?? '—',
                    'grade'       => $finalGrade !== null ? number_format($finalGrade, 2) : '—',
                    'remarks'     => $grade->remarks ?? $grade->status ?? '—',
                    'updated_at'  => $grade->updated_at
                        ? Carbon::parse($grade->updated_at)->format('M d, Y')
                        : '—',
                ];
            })
            ->toArray();

        return Inertia::render('ProgramHead/Reports/Grades', [
            'summary' => [
                'total'       => $totalGrades,
                'average'     => $averageGrade ? round($averageGrade, 2) : null,
                'by_remarks'  => $remarksCounts,
                'top_subjects'=> $topSubjects,
            ],
            'recent' => $recentGrades,
        ]);
    }

    public function attendance(Request $request)
    {
        $departmentId = optional($request->user())->department_id;

        if (!$departmentId) {
            return Inertia::render('ProgramHead/Reports/Attendance', [
                'summary' => $this->emptyAttendanceSummary(),
                'recent'  => [],
            ]);
        }

        $attendanceQuery = Attendance::query()
            ->whereHas('classSchedule.course', function ($query) use ($departmentId) {
                $query->where('department_id', $departmentId);
            });

        $totalSessions = (clone $attendanceQuery)->count();
        $distinctSections = (clone $attendanceQuery)
            ->whereHas('classSchedule.section')
            ->distinct('class_schedule_id')
            ->count('class_schedule_id');

        $latestSession = (clone $attendanceQuery)->max('date');

        $statusCounts = (clone $attendanceQuery)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        $sectionCounts = (clone $attendanceQuery)
            ->select('class_schedule_id', DB::raw('COUNT(*) as total'))
            ->whereNotNull('class_schedule_id')
            ->groupBy('class_schedule_id')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        $scheduleDetails = ClassSchedule::with(['section:id,section', 'course:id,code,name', 'faculty:id,fName,lName', 'subject'])
            ->whereIn('id', $sectionCounts->pluck('class_schedule_id')->filter())
            ->get()
            ->keyBy('id');

        $sectionBreakdown = $sectionCounts->map(function ($row) use ($scheduleDetails) {
            $schedule = $scheduleDetails->get($row->class_schedule_id);

            $sectionLabel = 'Section';
            if ($schedule) {
                $sectionLabel = $schedule->section->section ?? 'Section';
                if ($schedule->course) {
                    $sectionLabel = trim(sprintf('%s • %s', $schedule->course->code ?? $schedule->course->name, $sectionLabel));
                }
            }

            return [
                'section' => $sectionLabel,
                'total'   => (int) $row->total,
            ];
        })->values();

        $recentAttendance = (clone $attendanceQuery)
            ->with([
                'classSchedule.section:id,section',
                'classSchedule.subject',
                'classSchedule.faculty:id,fName,lName',
            ])
            ->latest('date')
            ->latest('created_at')
            ->limit(10)
            ->get()
            ->map(function (Attendance $attendance) {
                $schedule = $attendance->classSchedule;
                $section = optional($schedule)->section;
                $faculty = optional($schedule)->faculty;

                $subjectLabel = '—';
                if ($schedule && $schedule->subject) {
                    $subjectLabel = trim(sprintf('%s %s', $schedule->subject->code ?? '', $schedule->subject->descriptive_title ?? '')) ?: '—';
                }

                return [
                    'id'          => (int) $attendance->id,
                    'section'     => $section->section ?? '—',
                    'subject'     => $subjectLabel,
                    'status'      => $attendance->status ?? '—',
                    'date'        => $attendance->date
                        ? Carbon::parse($attendance->date)->format('M d, Y')
                        : '—',
                    'instructor'  => $faculty
                        ? trim(sprintf('%s %s', $faculty->fName ?? '', $faculty->lName ?? ''))
                        : 'TBA',
                    'recorded_at' => $attendance->created_at
                        ? Carbon::parse($attendance->created_at)->format('M d, Y h:i A')
                        : '—',
                ];
            })
            ->toArray();

        return Inertia::render('ProgramHead/Reports/Attendance', [
            'summary' => [
                'total'      => $totalSessions,
                'sections'   => $distinctSections,
                'latest'     => $latestSession ? Carbon::parse($latestSession)->format('M d, Y') : null,
                'by_status'  => $statusCounts,
                'by_section' => $sectionBreakdown,
            ],
            'recent' => $recentAttendance,
        ]);
    }

    protected function emptyEnrollmentSummary(): array
    {
        return [
            'total'     => 0,
            'programs'  => 0,
            'by_status' => [],
            'by_year'   => [],
        ];
    }

    protected function emptyGradeSummary(): array
    {
        return [
            'total'       => 0,
            'average'     => null,
            'by_remarks'  => [],
            'top_subjects'=> [],
        ];
    }

    protected function emptyAttendanceSummary(): array
    {
        return [
            'total'      => 0,
            'sections'   => 0,
            'latest'     => null,
            'by_status'  => [],
            'by_section' => [],
        ];
    }
}
