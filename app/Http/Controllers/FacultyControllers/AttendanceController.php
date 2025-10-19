<?php

namespace App\Http\Controllers\FacultyControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\Enrollments;
use App\Models\Section;
use App\Models\Attendance;
use App\Models\Class_Schedules;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    public function index()
    {
        // Fetch only enrolled students with related entities
        $students = Enrollments::with(['user', 'yearLevel', 'section.courses', 'section.majors'])
            ->where('status', 'enrolled') // only enrolled students
            ->get();

        // Get unique sections from enrollments
        $sectionIds = $students->pluck('section_id')->unique()->values();
        $sections = Section::with(['courses', 'majors'])
            ->whereIn('id', $sectionIds)
            ->get();

        return Inertia::render('Faculty/Attendance/StudentAttendance', [
            'students' => $students,
            'sections' => $sections,
        ]);
    }

    public function add(Section $section)
    {
        $students = Enrollments::with(['user', 'classSchedules:id,start_time,end_time,schedule_day,curriculum_subject_id'])
            ->where('section_id', $section->id)
            ->where('status', 'enrolled')
            ->get()
            ->map(function ($enrollment) {
                $enrollment->setAttribute('enrollment_id', $enrollment->id);
                $enrollment->setAttribute('class_schedule_id', optional($enrollment->classSchedules->first())->id);
                $enrollment->makeHidden(['classSchedules']);

                return $enrollment;
            });

        $classSchedulesCollection = class_schedules::with([
                'curriculumSubject.subject',
                'curriculumSubject.course',
                'enrollmentSubjects.enrollment' => function ($query) {
                    $query->where('status', 'enrolled')
                        ->with(['user:id,fName,mName,lName,id_number']);
                },
            ])
            ->where('section_id', $section->id)
            ->orderBy('schedule_day')
            ->orderBy('start_time')
            ->get();

        $scheduleIds = $classSchedulesCollection->pluck('id')->filter()->values();

        $absenceCounts = Attendance::select(
                'enrollment_id',
                'class_schedule_id',
                DB::raw('COUNT(*) as total_absent')
            )
            ->where('status', 'absent')
            ->whereIn('class_schedule_id', $scheduleIds)
            ->groupBy('enrollment_id', 'class_schedule_id')
            ->get()
            ->groupBy('class_schedule_id')
            ->map(function ($items) {
                return $items->keyBy('enrollment_id')->map(function ($record) {
                    return (int) $record->total_absent;
                });
            });

        $classSchedules = $classSchedulesCollection
            ->map(function ($schedule) use ($absenceCounts) {
                $subject = optional(optional($schedule->curriculumSubject)->subject);
                $subjectTitle = $subject->descriptive_title
                    ?? $subject->title
                    ?? optional($schedule->curriculumSubject)->subject_title
                    ?? 'Subject';

                $course = optional(optional($schedule->curriculumSubject)->course);
                $courseLabel = $course->code
                    ?? $course->course_code
                    ?? $course->abbr
                    ?? $course->short_name
                    ?? $course->name;

                $day = $schedule->schedule_day ?? '';

                $timeRange = $schedule->formatted_time ?? implode(' - ', array_filter([
                    $schedule->start_time ? Carbon::parse($schedule->start_time)->format('g:i A') : null,
                    $schedule->end_time ? Carbon::parse($schedule->end_time)->format('g:i A') : null,
                ]));

                $label = implode(' • ', array_filter([$subjectTitle, $day, $timeRange]));

                $students = $schedule->enrollmentSubjects
                    ? $schedule->enrollmentSubjects
                        ->map(function ($enrollmentSubject) use ($absenceCounts, $schedule) {
                            $enrollment = $enrollmentSubject->enrollment;
                            $user = optional($enrollment)->user;
                            $enrollmentId = optional($enrollment)->id;
                            $scheduleAbsences = $absenceCounts->get($schedule->id, collect());
                            $absenceCount = $scheduleAbsences instanceof \Illuminate\Support\Collection
                                ? (int) $scheduleAbsences->get($enrollmentId, 0)
                                : 0;

                            return [
                                'id' => $enrollmentId,
                                'student_number' => optional($enrollment)->student_number,
                                'user' => $user ? [
                                    'id' => $user->id,
                                    'fName' => $user->fName,
                                    'mName' => $user->mName,
                                    'lName' => $user->lName,
                                    'id_number' => $user->id_number,
                                ] : null,
                                'absence_count' => $absenceCount,
                            ];
                        })
                        ->filter(function ($student) {
                            return !empty($student['id']);
                        })
                        ->values()
                    : collect();

                return [
                    'id' => $schedule->id,
                    'label' => $label,
                    'subject' => $subjectTitle,
                    'course' => $courseLabel,
                    'day' => $day,
                    'time' => $timeRange,
                    'students' => $students,
                    'student_count' => $students->count(),
                ];
            })
            ->values();

        return Inertia::render('Faculty/Attendance/AddAttendance', [
            'section' => $section,
            'students' => $students,
            'defaultDate' => now()->format('Y-m-d'),
            'classSchedules' => $classSchedules,
        ]);
    }

    public function store(Request $request, Section $section)
    {
        $validated = $request->validate([
            'records' => 'required|array',
            'records.*.enrollment_id' => 'required|exists:enrollments,id',
            'records.*.class_schedule_id' => 'nullable|exists:class_schedules,id',
            'records.*.status' => 'required|in:present,absent,late,excused',
            'records.*.time_in' => 'nullable|date_format:H:i',
            'records.*.time_out' => 'nullable|date_format:H:i',
            'date' => 'required|date',
        ]);

        $date = $validated['date'];

        foreach ($validated['records'] as $record) {
            if (empty($record['status'])) {
                continue;
            }

            Attendance::updateOrCreate(
                [
                    'enrollment_id' => $record['enrollment_id'],
                    'class_schedule_id' => $record['class_schedule_id'] ?? null,
                    'date' => $date,
                    'type' => 'class',
                ],
                [
                    'status' => $record['status'],
                    'time_in' => $record['time_in'] ?? null,
                    'time_out' => $record['time_out'] ?? null,
                ]
            );
        }

        return redirect()
            ->route('faculty.attendance.records', $section->id)
            ->with('success', 'Attendance saved successfully.');
    }

    public function showRecords(Request $request, Section $section)
    {
        $faculty = auth()->user();

        if (!$faculty || $faculty->role !== 'faculty') {
            abort(403);
        }

        $studentCount = Enrollments::where('section_id', $section->id)
            ->where('status', 'enrolled')
            ->count();

        $perPage = max(1, min(15, (int) $request->input('per_page', 6)));

        $assignedSchedulesQuery = Class_Schedules::with([
                'curriculumSubject.subject',
                'curriculumSubject.course',
                'section',
                'enrollmentSubjects.enrollment' => function ($query) {
                    $query->where('status', 'enrolled')
                        ->with(['user:id,fName,mName,lName,id_number']);
                },
            ])
            ->where('section_id', $section->id)
            ->where('faculty_id', $faculty->id);

        $assignedSchedules = $assignedSchedulesQuery
            ->orderBy('schedule_day')
            ->orderBy('start_time')
            ->paginate($perPage)
            ->through(function (Class_Schedules $schedule) {
                $students = $schedule->enrollmentSubjects
                    ? $schedule->enrollmentSubjects
                        ->map(function ($enrollmentSubject) {
                            $enrollment = $enrollmentSubject->enrollment;
                            $user = optional($enrollment)->user;

                            return [
                                'id' => optional($enrollment)->id,
                                'student_number' => optional($enrollment)->student_number,
                                'user' => $user ? [
                                    'id' => $user->id,
                                    'fName' => $user->fName,
                                    'mName' => $user->mName,
                                    'lName' => $user->lName,
                                    'id_number' => $user->id_number,
                                ] : null,
                            ];
                        })
                        ->filter(function ($student) {
                            return !empty($student['id']);
                        })
                        ->values()
                    : collect();

                return [
                    'id' => $schedule->id,
                    'schedule_day' => $schedule->schedule_day,
                    'start_time' => $schedule->start_time,
                    'end_time' => $schedule->end_time,
                    'formatted_time' => $schedule->formatted_time,
                    'subject_title' => $schedule->subject_title,
                    'curriculum_subject' => $schedule->curriculumSubject ? [
                        'subject_title' => $schedule->curriculumSubject->subject_title,
                        'subject' => $schedule->curriculumSubject->subject ? [
                            'descriptive_title' => $schedule->curriculumSubject->subject->descriptive_title,
                            'title' => $schedule->curriculumSubject->subject->title,
                        ] : null,
                        'course' => $schedule->curriculumSubject->course ? [
                            'id' => $schedule->curriculumSubject->course->id,
                            'code' => $schedule->curriculumSubject->course->code,
                            'course_code' => $schedule->curriculumSubject->course->course_code,
                            'abbr' => $schedule->curriculumSubject->course->abbr,
                            'short_name' => $schedule->curriculumSubject->course->short_name,
                            'name' => $schedule->curriculumSubject->course->name,
                        ] : null,
                    ] : null,
                    'section' => $schedule->section ? [
                        'id' => $schedule->section->id,
                        'section' => $schedule->section->section,
                        'name' => $schedule->section->name,
                    ] : null,
                    'section_name' => $schedule->section_name,
                    'students' => $students,
                    'student_count' => $students->count(),
                ];
            });

        $scheduleIds = collect($assignedSchedules->items())
            ->pluck('id')
            ->filter()
            ->values();

        $recordsQuery = Attendance::with([
                'enrollment.user',
                'classSchedule.curriculumSubject.subject',
                'classSchedule.curriculumSubject.course',
                'classSchedule.section'
            ])
            ->where('type', 'class')
            ->whereHas('enrollment', function ($query) use ($section) {
                $query->where('section_id', $section->id)
                    ->where('status', 'enrolled');
            });

        if ($scheduleIds->isNotEmpty()) {
            $recordsQuery->whereIn('class_schedule_id', $scheduleIds);
        } else {
            $recordsQuery->whereRaw('1 = 0');
        }

        $records = $recordsQuery
            ->orderByDesc('date')
            ->get();

        $latestDate = optional($records->max('date'))?->toDateString();

        return Inertia::render('Faculty/Attendance/AttendanceRecord', [
            'section' => $section,
            'records' => $records,
            'latestDate' => $latestDate,
            'studentCount' => $studentCount,
            'assignedSchedules' => $assignedSchedules,
            'perPage' => $perPage,
        ]);
    }

    public function showSubject(Section $section, class_schedules $schedule)
    {
        if ((int) $schedule->section_id !== (int) $section->id) {
            abort(404);
        }

        $schedule->load([
            'curriculumSubject.subject',
            'curriculumSubject.course',
            'section',
        ]);

        $subject = optional(optional($schedule->curriculumSubject)->subject);
        $curriculumSubject = optional($schedule->curriculumSubject);
        $course = optional($curriculumSubject->course);

        $subjectTitle = $subject->descriptive_title
            ?? $subject->title
            ?? $curriculumSubject->subject_title
            ?? 'Subject';

        $courseLabel = $course->code
            ?? $course->course_code
            ?? $course->abbr
            ?? $course->short_name
            ?? $course->name
            ?? '';

        $sectionLabel = optional($schedule->section)->section
            ?? $section->section
            ?? $section->name
            ?? '';

        $scheduleDay = $schedule->schedule_day ?? $schedule->day ?? '';
        $timeRange = $schedule->formatted_time ?? implode(' - ', array_filter([
            $schedule->start_time ? Carbon::parse($schedule->start_time)->format('g:i A') : null,
            $schedule->end_time ? Carbon::parse($schedule->end_time)->format('g:i A') : null,
        ]));

        $records = Attendance::with(['enrollment.user'])
            ->where('type', 'class')
            ->where('class_schedule_id', $schedule->id)
            ->whereHas('enrollment', function ($query) use ($section) {
                $query->where('section_id', $section->id)
                    ->where('status', 'enrolled');
            })
            ->orderByDesc('date')
            ->get()
            ->map(function (Attendance $record) {
                $user = optional(optional($record->enrollment)->user);

                return [
                    'id' => $record->id,
                    'status' => $record->status,
                    'date' => $record->date,
                    'time_in' => $record->time_in,
                    'time_out' => $record->time_out,
                    'enrollment_id' => $record->enrollment_id,
                    'enrollment' => [
                        'id' => optional($record->enrollment)->id,
                        'student_number' => optional($record->enrollment)->student_number,
                        'user' => [
                            'id' => $user->id,
                            'fName' => $user->fName,
                            'mName' => $user->mName,
                            'lName' => $user->lName,
                            'id_number' => $user->id_number,
                        ],
                    ],
                    'created_at' => $record->created_at,
                ];
            });

        $dateSummaries = $records
            ->groupBy(function ($record) {
                $dateValue = $record['date'] ?? $record['created_at'];

                return $dateValue
                    ? Carbon::parse($dateValue)->format('Y-m-d')
                    : 'Unknown';
            })
            ->map(function ($items, $dateKey) {
                $reference = $items->first();
                $dateValue = $reference['date'] ?? $reference['created_at'];
                $readableDate = $dateValue
                    ? Carbon::parse($dateValue)->format('F d, Y')
                    : 'No date';

                return [
                    'dateKey' => $dateKey,
                    'readableDate' => $readableDate,
                    'present' => $items->where('status', 'present')->count(),
                    'absent' => $items->where('status', 'absent')->count(),
                    'late' => $items->where('status', 'late')->count(),
                    'excused' => $items->where('status', 'excused')->count(),
                ];
            })
            ->sortByDesc(function ($summary) {
                return $summary['dateKey'];
            })
            ->values();

        $studentCount = $records
            ->pluck('enrollment_id')
            ->filter()
            ->unique()
            ->count();

        $totals = [
            'present' => $records->where('status', 'present')->count(),
            'absent' => $records->where('status', 'absent')->count(),
            'late' => $records->where('status', 'late')->count(),
            'excused' => $records->where('status', 'excused')->count(),
        ];

        return Inertia::render('Faculty/Attendance/SubjectAttendance', [
            'section' => $section,
            'schedule' => [
                'id' => $schedule->id,
                'subjectName' => $subjectTitle,
                'courseLabel' => $courseLabel,
                'sectionLabel' => $sectionLabel,
                'scheduleDay' => $scheduleDay,
                'timeRange' => $timeRange,
            ],
            'dateSummaries' => $dateSummaries,
            'records' => $records,
            'studentCount' => $studentCount,
            'totals' => $totals,
        ]);
    }
}
