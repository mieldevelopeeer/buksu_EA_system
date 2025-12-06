<?php

namespace App\Http\Controllers\FacultyControllers;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use App\Models\Class_Schedules;
use App\Models\Section;
use App\Models\EnrollmentSubject;
use App\Models\Enrollments;
use App\Models\Attendance;
use App\Models\CreditedSubject;
use App\Models\Grades;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ClassController extends Controller
{
    public function index()
    {
        // Get the numeric ID of the logged-in user
        $facultyId = Auth::user()->id; // this should be an integer

        \Log::info('Logged-in faculty numeric ID:', [$facultyId]);

        // Get all sections that have schedules assigned to this faculty
        $sections = Section::whereHas('class_schedules', function ($query) use ($facultyId) {
                $query->where('faculty_id', $facultyId);
            })
            ->with([
                'yearLevel',
                'department',
                'majors',
                'class_schedules' => function ($query) use ($facultyId) {
                    $query->where('faculty_id', $facultyId)
                        ->with([
                            'curriculumSubject.subject',
                            'curriculumSubject.course',
                            'curriculumSubject.curricula.major',
                            'classroom',
                            'schoolYear',
                            'semester',
                        ])
                        ->orderBy('schedule_day')
                        ->orderBy('start_time');
                },
            ])
            ->orderBy('section')
            ->get();

        // Fetch all schedules assigned to this faculty with related data
        $schedules = class_schedules::with([
                'curriculumSubject.subject',
                'curriculumSubject.course',
                'curriculumSubject.curricula.major',
                'classroom',
                'section',
                'schoolYear',
                'semester'
            ])
            ->where('faculty_id', $facultyId)
            ->orderBy('schedule_day')
            ->orderBy('start_time')
            ->get();
            
        // Log the raw schedule data for debugging
        \Log::info('Raw schedules data:', $schedules->toArray());

        \Log::info('Schedules fetched:', [$schedules->toArray()]);

        $sectionSummaries = $sections->map(function ($section) {
            $firstSchedule = $section->class_schedules->first();
            $courseSource = $firstSchedule?->curriculumSubject?->course;
            $majorSource = $firstSchedule?->curriculumSubject?->curricula?->major;

            $courseName = $courseSource->code
                ?? $courseSource->course_code
                ?? $courseSource->abbr
                ?? $courseSource->short_name
                ?? $courseSource->name
                ?? 'Course';

            $majorName = $majorSource->name
                ?? $majorSource->code
                ?? $majorSource->abbr
                ?? $majorSource->short_name
                ?? null;

            $schoolYear = $firstSchedule?->schoolYear?->school_year
                ?? $firstSchedule?->schoolYear?->name
                ?? null;

            $semester = $firstSchedule?->semester?->semester
                ?? $firstSchedule?->semester?->name
                ?? null;

            // Process all schedules for this section
            $schedulesPayload = $section->class_schedules
                ->sortBy(function ($sched) {
                    $dayIndex = $this->resolveDayOrder($sched->schedule_day);
                    $timeKey = $sched->start_time ?? '00:00';
                    return sprintf('%02d-%s', $dayIndex, $timeKey);
                })
                ->map(function ($sched) {
                    $subject = $sched->curriculumSubject?->subject;
                    $descriptiveTitle = $subject?->descriptive_title;
                    $subjectCode = $subject?->subject_code;
                    $subjectTitle = $sched->curriculumSubject?->subject_title;
                    
                    // Build the most appropriate subject display
                    $fallbackTitle = $descriptiveTitle 
                        ?? $subjectTitle
                        ?? $subjectCode
                        ?? 'N/A';

                    // Log the subject data for debugging
                    \Log::debug('Processing schedule subject:', [
                        'schedule_id' => $sched->id,
                        'subject' => $subject ? $subject->toArray() : null,
                        'curriculum_subject' => $sched->curriculumSubject ? [
                            'id' => $sched->curriculumSubject->id,
                            'subject_title' => $sched->curriculumSubject->subject_title,
                            'description' => $sched->curriculumSubject->description,
                        ] : null,
                        'result' => [
                            'title' => $fallbackTitle,
                            'code' => $subjectCode
                        ]
                    ]);

                    return [
                        'id' => $sched->id,
                        'day' => $sched->schedule_day ?? 'TBA',
                        'time' => $this->formatTimeRange($sched->start_time, $sched->end_time),
                        'start_time' => $sched->start_time,
                        'end_time' => $sched->end_time,
                        'subject' => $fallbackTitle,
                        'code' => $subjectCode,
                        'description' => $subject?->subject_description ?? $sched->curriculumSubject?->description,
                        'room' => $sched->classroom?->room_number ?? 'N/A',
                        'classroom' => $sched->classroom ? [
                            'id' => $sched->classroom->id,
                            'room_number' => $sched->classroom->room_number,
                            'building' => $sched->classroom->building,
                        ] : null,
                        'curriculum_subject_id' => $sched->curriculum_subject_id,
                        'subject_id' => $subject?->id,
                    ];
                })
                ->values();

            return [
                'id' => $section->id,
                'sectionName' => $section->section ?? 'No Section',
                'courseName' => $courseName,
                'majorName' => $majorName,
                'schoolYear' => $schoolYear,
                'semester' => $semester,
                'schedules' => $schedulesPayload,
            ];
        })->values();

        // Get active semester
        $activeSemester = DB::table('semesters')
            ->join('school_year', 'semesters.school_year_id', '=', 'school_year.id')
            ->where('semesters.is_active', 1)
            ->where('school_year.is_active', 1)
            ->select('semesters.*', 'school_year.school_year')
            ->first();

        // Get all semesters and school years for filters
        $semesters = DB::table('semesters')
            ->orderBy('semester')
            ->get();

        $schoolYears = DB::table('school_year')
            ->orderBy('school_year', 'desc')
            ->get();

        return Inertia::render('Faculty/MyClass/Classes', [
            'schedules' => $schedules,
            'sections' => $sections,
            'sectionSummaries' => $sectionSummaries,
            'activeSemester' => $activeSemester,
            'semesters' => $semesters,
            'schoolYears' => $schoolYears,
        ]);
    }

   public function show(Request $request, Section $section)
{
    $facultyId = $request->user()->id; // Logged-in faculty

    $section->load([
        'class_schedules' => function ($query) use ($facultyId) {
            $query->where('faculty_id', $facultyId);   // <-- Filter schedules assigned to this faculty
        },
        'class_schedules.curriculumSubject.subject',
        'class_schedules.curriculumSubject.course',
        'class_schedules.curriculumSubject.curricula.major',
        'class_schedules.classroom',
        'class_schedules.schoolYear',
        'class_schedules.semester',
    ]);

    $firstSchedule = $section->class_schedules->first();
    $courseSource = $firstSchedule?->curriculumSubject?->course;
    $majorSource = $firstSchedule?->curriculumSubject?->curricula?->major;

    $courseName = $courseSource->code
        ?? $courseSource->course_code
        ?? $courseSource->abbr
        ?? $courseSource->short_name
        ?? $courseSource->name
        ?? 'Course';

    $majorName = $majorSource->name
        ?? $majorSource->code
        ?? $majorSource->abbr
        ?? $majorSource->short_name
        ?? null;

    $schoolYear = $firstSchedule?->schoolYear?->school_year
        ?? $firstSchedule?->schoolYear?->name
        ?? null;

    $semester = $firstSchedule?->semester?->semester
        ?? $firstSchedule?->semester?->name
        ?? null;

    $schedules = $section->class_schedules
        ->sortBy(function ($sched) {
            $dayIndex = $this->resolveDayOrder($sched->schedule_day);
            $timeKey = $sched->start_time ?? '00:00';
            return sprintf('%02d-%s', $dayIndex, $timeKey);
        })
        ->map(function ($sched) {
            $subject = $sched->curriculumSubject?->subject;

            return [
                'id' => $sched->id,
                'day' => $sched->schedule_day ?? 'TBA',
                'time' => $this->formatTimeRange($sched->start_time, $sched->end_time),
                'start_time' => $sched->start_time,
                'end_time' => $sched->end_time,
                'subject' => $subject?->descriptive_title
                    ?? $subject?->subject_code
                    ?? $sched->curriculumSubject?->subject_title
                    ?? 'N/A',
                'code' => $subject?->subject_code,
                'description' => $subject?->subject_description
                    ?? $sched->curriculumSubject?->description,
                'room' => $sched->classroom?->room_number ?? 'N/A',
            ];
        })
        ->values();

    return Inertia::render('Faculty/MyClass/SectionDetailsPage', [
        'section' => [
            'id' => $section->id,
            'sectionName' => $section->section ?? 'No Section',
            'courseName' => $courseName,
            'majorName' => $majorName,
            'schoolYear' => $schoolYear,
            'semester' => $semester,
            'schedules' => $schedules,
        ],
    ]);
}

    private function resolveDayOrder(?string $day): int
    {
        $order = [
            'Mon' => 1,
            'Tue' => 2,
            'Wed' => 3,
            'Thu' => 4,
            'Fri' => 5,
            'Sat' => 6,
            'Sun' => 7,
        ];

        return $order[$day] ?? 99;
    }

    private function formatTimeRange(?string $start, ?string $end): string
    {
        if (!$start || !$end) {
            return 'TBA';
        }

        $format = function ($time) {
            return date('g:i A', strtotime($time));
        };

        return sprintf('%s – %s', $format($start), $format($end));
    }
    
    /**
     * Format grade value for display
     */
    private function formatGrade($grade)
    {
        if ($grade === null || $grade === '') {
            return null;
        }
        
        // Convert to float and round to 2 decimal places
        $formatted = round((float)$grade, 2);
        
        // If the decimal is .00, return as integer, otherwise keep 2 decimal places
        return $formatted == floor($formatted) ? (int)$formatted : $formatted;
    }

    public function showSubject(Class_Schedules $schedule)
    {
        $schedule->load(['curriculumSubject.subject', 'section', 'semester']);

        $semesterName = strtolower($schedule->semester?->semester ?? '');
        $isSummerTerm = str_contains($semesterName, 'summer');

        // Debug: Log the schedule ID being used for the query
        \Log::info('Fetching students for schedule ID: ' . $schedule->id);
        
        // Use the same base data as gradesEntrypoint, but keep enrollment_subject_id
        $enrollmentSubjects = EnrollmentSubject::with('enrollment.student')
            ->where('class_schedule_id', $schedule->id)
            ->get();

        // Debug: Log the raw enrollment subjects and their grades
        \Log::info('Enrollment Subjects with Grades (showSubject):', [
            'count' => $enrollmentSubjects->count(),
            'sample' => optional($enrollmentSubjects->first(), function ($record) use ($schedule) {
                $student = optional(optional($record->enrollment)->student);

                $lastName = $student?->lName;
                $firstName = $student?->fName;
                $middleName = $student?->mName;

                $formattedNameParts = [];
                if ($lastName) {
                    $formattedNameParts[] = trim($lastName) . ',';
                }
                if ($firstName) {
                    $formattedNameParts[] = trim($firstName);
                }
                if ($middleName) {
                    $formattedNameParts[] = trim($middleName);
                }

                $formattedName = trim(implode(' ', $formattedNameParts)) ?: null;

                $grade = Grades::where('enrollment_id', $record->enrollment_id)
                    ->where('class_schedule_id', $schedule->id)
                    ->first();

                return [
                    'enrollment_id' => $record->enrollment_id,
                    'student_name' => $formattedName ?? 'No student',
                    'grade' => $grade,
                ];
            }) ?? 'No enrollment subjects found',
        ]);

        $students = $enrollmentSubjects->map(function ($record) use ($schedule) {
            $enrollment = optional($record->enrollment);
            $student = optional($enrollment->student);

            $lastName = $student?->lName;
            $firstName = $student?->fName;
            $middleName = $student?->mName;

            $formattedNameParts = [];
            if ($lastName) {
                $formattedNameParts[] = trim($lastName) . ',';
            }
            if ($firstName) {
                $formattedNameParts[] = trim($firstName);
            }
            if ($middleName) {
                $formattedNameParts[] = trim($middleName);
            }

            $fullName = trim(implode(' ', $formattedNameParts));

            // Get the grade for this enrollment directly from the Grades table
            $grade = Grades::where('enrollment_id', $record->enrollment_id)
                ->where('class_schedule_id', $schedule->id)
                ->first();

            return [
                'enrollment_subject_id' => $record->id,
                'id' => $student?->id,
                'enrollment_id' => $record->enrollment_id,
                'class_schedule_id' => $record->class_schedule_id,
                'name' => $fullName ?: 'Unnamed',
                'last_name' => $lastName,
                'first_name' => $firstName,
                'middle_name' => $middleName,
                'id_number' => $student?->id_number,
                'status' => $record->status ?? 'enrolled',
                'midterm' => $grade?->midterm,
                'final' => $grade?->final,
                'remarks' => $grade?->remarks ?? 'Incomplete',
                'grade_status' => $grade?->status ?? 'draft',
                'midterm_status' => $grade?->midterm_status ?? 'draft',
                'final_status' => $grade?->final_status ?? 'draft',
                'midterm_change_status' => $grade?->midterm_change_status ?? 'none',
                'final_change_status' => $grade?->final_change_status ?? 'none',
            ];
        });
        
        // Debug: Log the final students array
        \Log::info('Final students array with grades:', [
            'students_count' => $students->count(),
            'sample_student' => $students->first()
        ]);

        $activeEnrollmentIds = $students
            ->pluck('enrollment_id')
            ->filter()
            ->unique()
            ->values();

        $sessionSummaries = Attendance::query()
            ->where('class_schedule_id', $schedule->id)
            ->when($activeEnrollmentIds->isNotEmpty(), function ($query) use ($activeEnrollmentIds) {
                $query->whereIn('enrollment_id', $activeEnrollmentIds);
            })
            ->select([
                DB::raw('DATE(`date`) as session_date'),
                DB::raw('COUNT(*) as total_records'),
                DB::raw("SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count"),
                DB::raw("SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count"),
                DB::raw("SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count"),
                DB::raw("SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_count"),
            ])
            ->groupBy(DB::raw('DATE(`date`)'))
            ->orderByDesc('session_date')
            ->limit(12)
            ->get();

        $sessionDates = $sessionSummaries->pluck('session_date')->filter()->values();

        $entriesByDate = Attendance::query()
            ->where('class_schedule_id', $schedule->id)
            ->when($activeEnrollmentIds->isNotEmpty(), function ($query) use ($activeEnrollmentIds) {
                $query->whereIn('enrollment_id', $activeEnrollmentIds);
            })
            ->when($sessionDates->isNotEmpty(), function ($query) use ($sessionDates) {
                $query->whereIn(DB::raw('DATE(`date`)'), $sessionDates);
            })
            ->with(['enrollment.student'])
            ->orderBy('date')
            ->get()
            ->groupBy(function ($record) {
                return $record->date ? Carbon::parse($record->date)->toDateString() : null;
            });

        $attendanceSessions = $sessionSummaries
            ->map(function ($session) use ($entriesByDate) {
                $date = $session->session_date ? Carbon::parse($session->session_date)->toDateString() : null;
                $label = $date ? Carbon::parse($date)->format('MMMM d, Y') : 'Undated session';
                $entries = $date && $entriesByDate->has($date) ? $entriesByDate->get($date) : collect();

                $entryData = $entries->map(function ($record) {
                    $student = optional(optional($record->enrollment)->student);
                    $fullName = trim(implode(' ', array_filter([
                        $student?->fName,
                        $student?->mName,
                        $student?->lName,
                    ])));

                    return [
                        'id' => $record->id,
                        'student_name' => $fullName ?: 'Unnamed',
                        'student_number' => $student?->id_number,
                        'status' => $record->status ?? '—',
                        'time_in' => optional($record->time_in)->format('H:i:s') ?? $record->time_in,
                        'time_out' => optional($record->time_out)->format('H:i:s') ?? $record->time_out,
                    ];
                })->values();

                return [
                    'date' => $date,
                    'label' => $label,
                    'totals' => [
                        'present' => (int) $session->present_count,
                        'absent' => (int) $session->absent_count,
                        'late' => (int) $session->late_count,
                        'excused' => (int) $session->excused_count,
                        'records' => (int) $session->total_records,
                    ],
                    'entries' => $entryData,
                ];
            })
            ->values();

        return Inertia::render('Faculty/MyClass/SubjectStudentsPage', [
            'schedule' => [
                'id' => $schedule->id,
                'subject' => $schedule->curriculumSubject?->subject?->descriptive_title ?? 'Subject',
                'section' => $schedule->section?->section ?? 'Section',
                'section_id' => $schedule->section?->id,
                'day' => $schedule->schedule_day,
                'time' => $this->formatTimeRange($schedule->start_time, $schedule->end_time),
                'isSummerTerm' => $isSummerTerm,
            ],
            'students' => $students,
            'attendanceSessions' => $attendanceSessions,
        ]);
    }

    public function attendanceEntrypoint(Request $request, Class_Schedules $schedule)
    {
        $schedule->load(['section', 'curriculumSubject.subject', 'curriculumSubject.course']);

        $section = $schedule->section;

        if (!$section) {
            abort(404, 'Section not found for this schedule.');
        }

        $section->loadMissing(['courses', 'majors']);

        $curriculumSubjectId = $schedule->curriculum_subject_id;

        $enrollmentSubjectStatuses = EnrollmentSubject::query()
            ->where('class_schedule_id', $schedule->id)
            ->get(['enrollment_id', 'status'])
            ->mapWithKeys(function ($subject) {
                return [
                    $subject->enrollment_id => strtolower((string) ($subject->status ?? 'enrolled')),
                ];
            });

        $absenceCounts = Attendance::select('enrollment_id', DB::raw('COUNT(*) as total_absent'))
            ->where('status', 'absent')
            ->where('class_schedule_id', $schedule->id)
            ->groupBy('enrollment_id')
            ->pluck('total_absent', 'enrollment_id');

        $students = Enrollments::with(['user'])
            ->where('section_id', $section->id)
            ->where('status', 'enrolled')
            ->get()
            ->map(function ($enrollment) use ($schedule, $absenceCounts, $enrollmentSubjectStatuses) {
                $user = $enrollment->user;
                $enrollmentId = $enrollment->id;
                $subjectStatus = $enrollmentSubjectStatuses->get($enrollmentId, 'enrolled');

                return [
                    'id' => $enrollmentId,
                    'enrollment_id' => $enrollmentId,
                    'student_id' => $enrollment->student_id,
                    'class_schedule_id' => $schedule->id,
                    'absence_count' => (int) ($absenceCounts[$enrollmentId] ?? 0),
                    'subject_status' => $subjectStatus,
                    'user' => $user ? [
                        'id' => $user->id,
                        'fName' => $user->fName,
                        'mName' => $user->mName,
                        'lName' => $user->lName,
                        'id_number' => $user->id_number,
                    ] : null,
                ];
            });

        $studentIds = $students->pluck('student_id')->filter()->unique();

        $creditedStudentIds = collect();
        if ($curriculumSubjectId && $studentIds->isNotEmpty()) {
            $creditedStudentIds = CreditedSubject::query()
                ->where('curriculum_subject_id', $curriculumSubjectId)
                ->whereIn('student_id', $studentIds)
                ->pluck('student_id')
                ->unique();
        }

        $students = $students
            ->reject(function ($student) use ($creditedStudentIds) {
                $status = strtolower($student['subject_status'] ?? 'enrolled');
                $hideByStatus = in_array($status, ['credited', 'completed', 'passed']);
                $hideByCreditRecord = $student['student_id'] && $creditedStudentIds->contains($student['student_id']);
                return $hideByStatus || $hideByCreditRecord;
            })
            ->values();

        $classSchedules = class_schedules::where('section_id', $section->id)
            ->with(['curriculumSubject.subject'])
            ->orderBy('schedule_day')
            ->orderBy('start_time')
            ->get()
            ->map(function ($sched) {
                $subject = optional(optional($sched->curriculumSubject)->subject);
                $subjectTitle = $subject->descriptive_title
                    ?? $subject->title
                    ?? optional($sched->curriculumSubject)->subject_title
                    ?? 'Subject';

                $timeRange = $sched->formatted_time
                    ?? implode(' - ', array_filter([
                        $sched->start_time ? Carbon::parse($sched->start_time)->format('g:i A') : null,
                        $sched->end_time ? Carbon::parse($sched->end_time)->format('g:i A') : null,
                    ]));

                return [
                    'id' => $sched->id,
                    'label' => implode(' • ', array_filter([$subjectTitle, $sched->schedule_day, $timeRange])),
                ];
            });

        return Inertia::render('Faculty/MyClass/AttendanceAdd', [
            'section' => [
                'id' => $section->id,
                'section' => $section->section,
                'course_alias' => $section->course_alias,
                'major_alias' => $section->major_alias,
            ],
            'students' => $students,
            'defaultDate' => now()->format('Y-m-d'),
            'classSchedules' => $classSchedules,
            'initialScheduleId' => $schedule->id,
        ]);
    }

    public function gradesEntrypoint(class_schedules $schedule)
    {
        $schedule->load([
            'section',
            'curriculumSubject.subject',
            'curriculumSubject.curriculum.course',
            'schoolYear',
            'semester',
        ]);

        $enrollmentSubjects = EnrollmentSubject::with('enrollment.student')
            ->where('class_schedule_id', $schedule->id)
            ->get();

        // Fetch all grades for this schedule
        $gradesMap = Grades::where('class_schedule_id', $schedule->id)
            ->pluck('id', 'enrollment_id')
            ->toArray();

        $students = $enrollmentSubjects
            ->filter(function ($record) {
                return optional($record->enrollment)->status === 'enrolled';
            })
            ->map(function ($record) use ($schedule, $gradesMap) {
                $student = optional($record->enrollment)->student;
                $fullName = trim(implode(' ', array_filter([
                    $student?->fName,
                    $student?->mName,
                    $student?->lName,
                ])));

                // Get the grade for this enrollment directly from the Grades table
                $grade = Grades::where('enrollment_id', $record->enrollment_id)
                    ->where('class_schedule_id', $schedule->id)
                    ->first();

                return [
                    'id' => $student?->id,
                    'enrollment_id' => $record->enrollment_id,
                    'class_schedule_id' => $record->class_schedule_id,
                    'name' => $fullName ?: 'Unnamed',
                    'last_name' => $student?->lName,
                    'first_name' => $student?->fName,
                    'middle_name' => $student?->mName,
                    'id_number' => $student?->id_number,
                    'midterm' => $grade?->midterm,
                    'final' => $grade?->final,
                    'summer' => $grade?->summer,
                    'remarks' => $grade?->remarks ?? 'Incomplete',
                    'status' => $grade?->status ?? 'draft',
                    'midterm_status' => $grade?->midterm_status ?? 'draft',
                    'final_status' => $grade?->final_status ?? 'draft',
                    'summer_status' => $grade?->summer_status ?? 'draft',
                    'midterm_change_status' => $grade?->midterm_change_status ?? 'none',
                    'final_change_status' => $grade?->final_change_status ?? 'none',
                    'summer_change_status' => $grade?->summer_change_status ?? 'none',
                ];
            })
            ->values();

        return Inertia::render('Faculty/MyClass/GradesPage', [
            'schedule' => [
                'id' => $schedule->id,
                'subject' => $schedule->curriculumSubject?->subject?->descriptive_title ?? 'Subject',
                'section' => $schedule->section?->section ?? 'Section',
                'course' => $schedule->curriculumSubject?->curriculum?->course?->name ?? 'Course',
                'school_year' => $schedule->schoolYear?->school_year
                    ?? $schedule->schoolYear?->name
                    ?? null,
                'semester' => $schedule->semester?->semester
                    ?? $schedule->semester?->name
                    ?? null,
            ],
            'students' => $students,
        ]);
    }
}