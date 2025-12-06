<?php

namespace App\Http\Controllers\ProgramHeadControllers;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\class_schedules as ClassSchedule;
use App\Models\Courses;
use App\Models\Enrollments;
use App\Models\Grades;
use App\Models\semester as SemesterModel;
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

        $yearLevelIds = $yearCounts->pluck('year_level_id')->filter();
        $yearLevelLabels = YearLevel::whereIn('id', $yearLevelIds)
            ->pluck('year_level', 'id');

        $byYear = $yearCounts->map(function ($row) use ($yearLevelLabels) {
            $label = $yearLevelLabels[$row->year_level_id] ?? 'Unassigned';

            return [
                'year_level' => $label,
                'total'      => (int) $row->total,
            ];
        })->values();

        $programCounts = (clone $baseQuery)
            ->select('courses_id', DB::raw('COUNT(*) as total'))
            ->groupBy('courses_id')
            ->get();

        $courseIds = $programCounts->pluck('courses_id')->filter()->unique();
        $courseMap = Courses::whereIn('id', $courseIds)
            ->get(['id', 'code', 'name'])
            ->keyBy('id');

        $byProgram = $programCounts->map(function ($row) use ($courseMap) {
            $course = $courseMap->get($row->courses_id);
            $label = $course?->code ?? $course?->name ?? 'Program';

            return [
                'program' => $label,
                'total'   => (int) $row->total,
            ];
        })->values();

        $programYearCounts = (clone $baseQuery)
            ->leftJoin('users', 'users.id', '=', 'enrollments.student_id')
            ->select(
                'enrollments.courses_id',
                'enrollments.year_level_id',
                DB::raw('LOWER(users.gender) as gender'),
                DB::raw('COUNT(*) as total')
            )
            ->groupBy('enrollments.courses_id', 'enrollments.year_level_id', 'gender')
            ->get();

        $programYearCourseIds = $programYearCounts->pluck('courses_id')->filter()->unique();
        $programYearCourseMap = Courses::whereIn('id', $programYearCourseIds)
            ->get(['id', 'code', 'name'])
            ->keyBy('id');

        $programYearRows = [];
        $courseTotals = [];
        $grandTotals = ['male' => 0, 'female' => 0, 'overall' => 0];

        foreach ($programYearCounts as $row) {
            $courseId = $row->courses_id;
            $yearLevelId = $row->year_level_id;
            $count = (int) $row->total;
            $course = $programYearCourseMap->get($courseId);
            $courseCode = $course?->code ?? $course?->name ?? 'Program';
            $courseLabel = $course?->name ?? $courseCode;
            $yearLabel = $yearLevelLabels[$yearLevelId] ?? 'Year Level';
            $normalizedYear = strtolower($yearLabel);
            $yearShort = match (true) {
                str_contains($normalizedYear, 'first') || str_contains($normalizedYear, '1st') => 'I',
                str_contains($normalizedYear, 'second') || str_contains($normalizedYear, '2nd') => 'II',
                str_contains($normalizedYear, 'third') || str_contains($normalizedYear, '3rd') => 'III',
                str_contains($normalizedYear, 'fourth') || str_contains($normalizedYear, '4th') => 'IV',
                default => strtoupper($yearLabel),
            };

            $key = sprintf('%s::%s', $courseId, $yearLevelId);
            if (!isset($programYearRows[$key])) {
                $programYearRows[$key] = [
                    'course_id'     => $courseId,
                    'course_code'   => $courseCode,
                    'course_label'  => $courseLabel,
                    'year_level_id' => $yearLevelId,
                    'year_label'    => $yearLabel,
                    'year_short'    => $yearShort,
                    'male'          => 0,
                    'female'        => 0,
                    'total'         => 0,
                ];
            }

            $genderKey = in_array($row->gender, ['male', 'female'], true) ? $row->gender : null;
            if ($genderKey) {
                $programYearRows[$key][$genderKey] += $count;
            }
            $programYearRows[$key]['total'] += $count;

            if (!isset($courseTotals[$courseId])) {
                $courseTotals[$courseId] = [
                    'course_id'    => $courseId,
                    'course_code'  => $courseCode,
                    'course_label' => $courseLabel,
                    'male'         => 0,
                    'female'       => 0,
                    'total'        => 0,
                ];
            }

            if ($genderKey) {
                $courseTotals[$courseId][$genderKey] += $count;
                $grandTotals[$genderKey] += $count;
            }
            $courseTotals[$courseId]['total'] += $count;
            $grandTotals['overall'] += $count;
        }

        $programBreakdown = collect($programYearRows)
            ->groupBy('course_id')
            ->map(function (Collection $rows, $courseId) use ($courseTotals) {
                $sortedRows = $rows->sortBy('year_label')->values()->map(function ($row) {
                    $row['label'] = trim(sprintf(
                        '%s %s',
                        $row['course_code'],
                        $row['year_short'] ?? $row['year_label']
                    ));

                    return [
                        'label'  => $row['label'],
                        'male'   => $row['male'],
                        'female' => $row['female'],
                        'total'  => $row['total'],
                    ];
                });

                $courseTotal = $courseTotals[$courseId] ?? ['male' => 0, 'female' => 0, 'total' => 0];

                return [
                    'course_id'    => $courseId,
                    'course_label' => $courseTotals[$courseId]['course_label'] ?? 'Program',
                    'course_code'  => $courseTotals[$courseId]['course_code'] ?? $courseTotals[$courseId]['course_label'] ?? 'Program',
                    'rows'         => $sortedRows,
                    'totals'       => [
                        'label'  => 'TOTAL ' . ($courseTotals[$courseId]['course_code'] ?? 'PROGRAM'),
                        'male'   => $courseTotal['male'] ?? 0,
                        'female' => $courseTotal['female'] ?? 0,
                        'total'  => $courseTotal['total'] ?? 0,
                    ],
                ];
            })
            ->sortBy('course_code')
            ->values();

        $activeSchoolYear = AcademicYear::where('is_active', 1)->orderByDesc('id')->first();
        $activeSemester = SemesterModel::where('is_active', 1)->orderByDesc('id')->first();
        $user = $request->user();
        $preparedBy = $user
            ? trim(sprintf('%s %s %s', $user->fName ?? '', $user->mName ?? '', $user->lName ?? ''))
            : null;

        $summaryMeta = [
            'campus'       => strtoupper(optional(optional($user)->department)->campus ?? 'ALUBIJID'),
            'semester'     => $activeSemester->semester ?? null,
            'school_year'  => $activeSchoolYear->school_year ?? null,
            'prepared_by'  => $preparedBy,
            'prepared_role'=> optional($user)->role ? ucwords(str_replace('_', ' ', $user->role)) : 'Program Head',
            'date'         => Carbon::now()->format('F d, Y'),
        ];

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
                'total'             => $totalEnrollments,
                'programs'          => $distinctPrograms,
                'by_status'         => $statusCounts,
                'by_year'           => $byYear,
                'by_program'        => $byProgram,
                'program_breakdown' => $programBreakdown,
                'grand_totals'      => $grandTotals,
                'meta'              => $summaryMeta,
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
            ->select(DB::raw('AVG(COALESCE(CASE WHEN final IS NOT NULL AND midterm IS NOT NULL THEN (final + midterm) / 2 END, final, midterm)) as avg_grade'))
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

        $recentGradesCollection = (clone $gradeQuery)
            ->with([
                'enrollment.student:id,fName,mName,lName,id_number',
                'enrollment.course:id,code,name',
                'classSchedule.subject',
                'classSchedule.course:id,code,name',
                'classSchedule.semester:id,semester,school_year_id',
                'classSchedule.schoolYear:id,school_year',
                'classSchedule.faculty:id,fName,mName,lName',
            ])
            ->latest('updated_at')
            ->limit(10)
            ->get();

        $recentGrades = $recentGradesCollection
            ->map(function (Grades $grade) {
                $student = optional($grade->enrollment)->student;
                $course = optional($grade->enrollment)->course;
                $class = $grade->classSchedule;

                $finalGrade = null;
                $hasMidterm = $grade->midterm !== null;
                $hasFinal = $grade->final !== null;

                if ($hasMidterm && $hasFinal) {
                    $finalGrade = ($grade->midterm + $grade->final) / 2;
                } elseif ($hasFinal) {
                    $finalGrade = $grade->final;
                } elseif ($hasMidterm) {
                    $finalGrade = $grade->midterm;
                } elseif ($grade->grade !== null) {
                    $finalGrade = $grade->grade;
                }

                $subjectLabel = '—';
                $subjectCode = null;
                $subjectDescription = null;
                $scheduleLabel = '—';
                $semesterLabel = null;
                $schoolYearLabel = null;
                $instructorName = null;

                if ($class) {
                    if ($class->subject) {
                        $subjectCode = $class->subject->code ?? null;
                        $subjectDescription = $class->subject->descriptive_title ?? null;
                        $subjectLabel = trim(sprintf('%s %s', $subjectCode ?? '', $subjectDescription ?? '')) ?: '—';
                    } elseif ($class->curriculumSubject && $class->curriculumSubject->subject) {
                        $subjectCode = $class->curriculumSubject->subject->code ?? null;
                        $subjectDescription = $class->curriculumSubject->subject->descriptive_title ?? null;
                        $subjectLabel = trim(sprintf('%s %s', $subjectCode ?? '', $subjectDescription ?? '')) ?: '—';
                    }

                    $day = $class->schedule_day;
                    $startTime = $class->start_time ? Carbon::parse($class->start_time)->format('h:i A') : null;
                    $endTime = $class->end_time ? Carbon::parse($class->end_time)->format('h:i A') : null;
                    if ($day || ($startTime && $endTime)) {
                        $timeRange = $startTime && $endTime ? sprintf('%s - %s', $startTime, $endTime) : null;
                        $scheduleLabel = trim(sprintf('%s %s', $day ?? '', $timeRange ?? '')) ?: '—';
                    }

                    $semesterLabel = optional($class->semester)->semester;
                    $schoolYearLabel = optional($class->schoolYear)->school_year;
                    $instructor = optional($class->faculty);
                    if ($instructor) {
                        $instructorName = trim(sprintf('%s, %s %s', $instructor->lName ?? '', $instructor->fName ?? '', $instructor->mName ?? '')) ?: null;
                    }
                }

                return [
                    'id'          => (int) $grade->id,
                    'student'     => $student
                        ? trim(sprintf('%s, %s %s', $student->lName ?? '', $student->fName ?? '', $student->mName ?? ''))
                        : 'Unnamed',
                    'student_id'  => $student->id_number ?? '—',
                    'subject'     => $subjectLabel,
                    'subject_code' => $subjectCode,
                    'subject_description' => $subjectDescription,
                    'course'      => $course->code ?? $course->name ?? '—',
                    'grade'       => $finalGrade !== null ? number_format($finalGrade, 2) : '—',
                    'remarks'     => $grade->remarks ?? $grade->status ?? '—',
                    'updated_at'  => $grade->updated_at
                        ? Carbon::parse($grade->updated_at)->format('M d, Y')
                        : '—',
                    'schedule'    => $scheduleLabel,
                    'semester'    => $semesterLabel,
                    'school_year' => $schoolYearLabel,
                    'instructor'  => $instructorName,
                ];
            })
            ->toArray();

        $metaSource = collect($recentGrades)->first();
        $programHeadName = $request->user()
            ? trim(sprintf('%s %s %s', $request->user()->fName ?? '', $request->user()->mName ?? '', $request->user()->lName ?? ''))
            : null;

        if (!$programHeadName && $request->user()) {
            $programHeadName = $request->user()->name ?? null;
        }

        $summaryMeta = [
            'campus' => 'BukSU Satellite Campus',
            'semester' => $metaSource['semester'] ?? null,
            'school_year' => $metaSource['school_year'] ?? null,
            'subject_code' => $metaSource['subject_code'] ?? null,
            'subject_description' => $metaSource['subject_description'] ?? null,
            'schedule' => $metaSource['schedule'] ?? null,
            'instructor' => $metaSource['instructor'] ?? null,
            'program_head' => $programHeadName,
            'campus_head' => null,
            'date' => Carbon::now()->format('F d, Y'),
        ];

        return Inertia::render('ProgramHead/Reports/Grades', [
            'summary' => [
                'total'       => $totalGrades,
                'average'     => $averageGrade ? round($averageGrade, 2) : null,
                'by_remarks'  => $remarksCounts,
                'top_subjects'=> $topSubjects,
                'meta'        => $summaryMeta,
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
                'classSchedule.course:id,code,name',
                'classSchedule.faculty:id,fName,lName',
                'enrollment.student:id,fName,mName,lName,id_number',
            ])
            ->latest('date')
            ->latest('created_at')
            ->limit(300)
            ->get()
            ->map(function (Attendance $attendance) {
                $schedule = $attendance->classSchedule;
                $section = optional($schedule)->section;
                $faculty = optional($schedule)->faculty;
                $course = optional($schedule)->course;
                $student = optional(optional($attendance->enrollment)->student);

                $studentNameParts = collect([
                    $student?->lName,
                    $student?->fName,
                    $student?->mName,
                ])->filter()->all();

                $studentName = empty($studentNameParts)
                    ? null
                    : sprintf('%s, %s%s',
                        $studentNameParts[0],
                        $studentNameParts[1] ?? '',
                        isset($studentNameParts[2]) ? ' ' . $studentNameParts[2] : ''
                    );

                $sessionDate = $attendance->date
                    ? Carbon::parse($attendance->date)->format('Y-m-d')
                    : null;
                $subjectLabel = '—';
                if ($schedule && $schedule->subject) {
                    $subjectLabel = trim(sprintf('%s %s', $schedule->subject->code ?? '', $schedule->subject->descriptive_title ?? '')) ?: '—';
                }

                $recorded = $attendance->created_at
                    ? Carbon::parse($attendance->created_at)->format('M d, Y h:i A')
                    : '—';

                return [
                    'id'                 => (int) $attendance->id,
                    'class_schedule_id'  => optional($schedule)->id,
                    'section_id'         => optional($section)->id,
                    'section'            => $section->section ?? '—',
                    'subject'            => $subjectLabel,
                    'subject_code'       => optional(optional($schedule)->subject)->code,
                    'course'             => $course?->code ?? $course?->name,
                    'status'             => $attendance->status ?? '—',
                    'date'               => $attendance->date
                        ? Carbon::parse($attendance->date)->format('M d, Y')
                        : '—',
                    'date_raw'           => $sessionDate,
                    'instructor'         => $faculty
                        ? trim(sprintf('%s %s', $faculty->fName ?? '', $faculty->lName ?? ''))
                        : 'TBA',
                    'instructor_id'      => $faculty?->id,
                    'recorded_at'        => $recorded,
                    'student'            => $studentName,
                    'student_id'         => $student?->id_number,
                    'session_key'        => sprintf('%s|%s', optional($schedule)->id ?? 'session', $sessionDate ?? 'undated'),
                ];
            })
            ->toArray();

        $sessionEntries = collect($recentAttendance)
            ->groupBy('session_key')
            ->map(function (Collection $entries) {
                $first = $entries->first();
                $statusCounts = $entries->groupBy(function ($entry) {
                    return strtolower($entry['status'] ?? 'unspecified');
                })->map->count()->toArray();

                return [
                    'session_key'       => $first['session_key'],
                    'class_schedule_id' => $first['class_schedule_id'],
                    'section_id'        => $first['section_id'],
                    'section'           => $first['section'],
                    'subject'           => $first['subject'],
                    'subject_code'      => $first['subject_code'],
                    'course'            => $first['course'],
                    'instructor'        => $first['instructor'],
                    'instructor_id'     => $first['instructor_id'],
                    'date'              => $first['date'],
                    'date_raw'          => $first['date_raw'],
                    'recorded_at'       => $first['recorded_at'],
                    'status_counts'     => $statusCounts,
                    'student_total'     => $entries->count(),
                    'students'          => $entries->map(function ($entry) {
                        return [
                            'student'    => $entry['student'] ?? '—',
                            'student_id' => $entry['student_id'],
                            'status'     => $entry['status'] ?? '—',
                        ];
                    })->values(),
                ];
            })
            ->sortByDesc(function ($entry) {
                return $entry['date_raw'] ?? '0000-00-00';
            })
            ->values();

        $filterMetadata = [
            'sections'    => $sessionEntries->pluck('section')->filter()->unique()->sort()->values(),
            'subjects'    => $sessionEntries->map(function ($entry) {
                $label = trim($entry['subject'] ?? '');
                if ($entry['subject_code']) {
                    $label = trim($entry['subject_code'] . ' · ' . $label);
                }
                return $label ?: null;
            })->filter()->unique()->sort()->values(),
            'courses'     => $sessionEntries->pluck('course')->filter()->unique()->sort()->values(),
            'instructors' => $sessionEntries->pluck('instructor')->filter()->unique()->sort()->values(),
        ];

        $activeSchoolYear = AcademicYear::where('is_active', 1)->orderByDesc('id')->first();
        $activeSemester = SemesterModel::where('is_active', 1)->orderByDesc('id')->first();
        $user = $request->user();
        $preparedBy = $user
            ? trim(sprintf('%s %s %s', $user->fName ?? '', $user->mName ?? '', $user->lName ?? ''))
            : null;

        $summaryMeta = [
            'campus'       => strtoupper(optional(optional($user)->department)->campus ?? 'ALUBIJID'),
            'semester'     => $activeSemester->semester ?? null,
            'school_year'  => $activeSchoolYear->school_year ?? null,
            'prepared_by'  => $preparedBy ?? '—',
            'prepared_role'=> $user?->role ? ucwords(str_replace('_', ' ', $user->role)) : 'Program Head',
            'date'         => Carbon::now()->format('F d, Y'),
        ];

        return Inertia::render('ProgramHead/Reports/Attendance', [
            'summary' => [
                'total'     => $totalSessions,
                'sections'  => $distinctSections,
                'latest'    => $latestSession ? Carbon::parse($latestSession)->format('M d, Y') : null,
                'by_status' => $statusCounts,
                'by_section'=> $sectionBreakdown,
                'meta'      => $summaryMeta,
                'filters'   => $filterMetadata,
            ],
            'recent' => $sessionEntries,
        ]);
    }
}
