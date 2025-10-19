<?php

namespace App\Http\Controllers\FacultyControllers;

use App\Http\Controllers\Controller;
use App\Models\class_schedules;
use App\Models\EnrollmentSubject;
use App\Models\Users;
use App\Models\semester as SemesterModel;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StudentsListController extends Controller
{
    public function index()
    {
        $facultyId = Auth::id();

        $activeSemester = SemesterModel::with('academicYear')
            ->where('is_active', 1)
            ->first();

        $perPage = (int) request()->input('perPage', 5);

        if ($perPage <= 0) {
            $perPage = 5;
        } elseif ($perPage > 50) {
            $perPage = 50;
        }

        $relations = [
            'curriculumSubject.subject',
            'curriculumSubject.course',
            'section.yearLevel',
            'section.enrollments.student',
            'section.enrollments.course',
            'section.enrollments.yearLevel',
            'section.enrollments.section',
            'enrollmentSubjects.enrollment.student',
            'enrollmentSubjects.enrollment.course',
            'enrollmentSubjects.enrollment.yearLevel',
            'enrollmentSubjects.enrollment.section',
            'classroom',
        ];

        $scheduleQuery = class_schedules::query()
            ->with($relations)
            ->where('faculty_id', $facultyId)
            ->when($activeSemester, function ($query) use ($activeSemester) {
                $query->where('semester_id', $activeSemester->id);
            })
            ->orderBy('section_id')
            ->orderBy('schedule_day')
            ->orderBy('start_time');

        $paginatedSchedules = $scheduleQuery
            ->paginate($perPage)
            ->withQueryString();

        if ($paginatedSchedules->total() === 0) {
            \Log::warning('Faculty students list primary query returned no schedules, using fallback.', [
                'faculty_id' => $facultyId,
                'active_semester_id' => $activeSemester?->id,
            ]);

            $paginatedSchedules = class_schedules::query()
                ->with($relations)
                ->orderBy('section_id')
                ->orderBy('schedule_day')
                ->orderBy('start_time')
                ->paginate($perPage)
                ->withQueryString();
        }

        \Log::info('Faculty students list fetched schedules', [
            'faculty_id' => $facultyId,
            'schedule_count' => $paginatedSchedules->count(),
            'page' => $paginatedSchedules->currentPage(),
            'per_page' => $paginatedSchedules->perPage(),
        ]);

        $teachingLoads = $paginatedSchedules->through(function (class_schedules $schedule) {
            $subjectModel = optional($schedule->curriculumSubject)->subject;
            $courseModel = optional($schedule->curriculumSubject)->course;
            $section = $schedule->section;

            $students = collect();

            foreach ($schedule->enrollmentSubjects as $enrollmentSubject) {
                $enrollment = $enrollmentSubject->enrollment;

                if (!$enrollment || strcasecmp((string) $enrollment->status, 'enrolled') !== 0) {
                    continue;
                }

                $student = $enrollment->student;

                if (!$student || ($student->role && strcasecmp((string) $student->role, 'student') !== 0)) {
                    continue;
                }

                $subjectStatus = strtolower((string) ($enrollmentSubject->status ?? 'enrolled'));
                $isDropped = $subjectStatus === 'dropped';

                $students->push([
                    'id' => $student->id ?? $enrollment->student_id,
                    'enrollmentId' => $enrollment->id,
                    'studentId' => $enrollment->student_id,
                    'student_number' => $student->id_number ?? null,
                    'studentNo' => $student->id_number ?? null,
                    'fName' => $student->fName ?? null,
                    'mName' => $student->mName ?? null,
                    'lName' => $student->lName ?? null,
                    'name' => $this->formatStudentName($student),
                    'program' => optional($enrollment->course)->code ?? optional($enrollment->course)->name,
                    'course' => optional($enrollment->course)->code ?? optional($enrollment->course)->name,
                    'year_level' => optional($enrollment->yearLevel)->year_level,
                    'yearLevel' => optional($enrollment->yearLevel)->year_level,
                    'section' => optional($enrollment->section)->section ?? optional($section)->section,
                    'email' => $student->email ?? null,
                    'status' => $isDropped ? 'Dropped' : ucfirst(strtolower((string) $enrollment->status)),
                    'statusRaw' => $isDropped ? 'dropped' : strtolower((string) $enrollment->status),
                    'dropReason' => $enrollmentSubject->drop_reason,
                    'droppedAt' => $enrollmentSubject->dropped_at,
                    'enrollment_subject_id' => $enrollmentSubject->id,
                    'sourceType' => 'schedule',
                    'canDrop' => !$isDropped,
                ]);
            }

            $existingEnrollmentIds = $students
                ->pluck('enrollmentId')
                ->filter()
                ->all();

            if ($section && $section->relationLoaded('enrollments')) {
                foreach ($section->enrollments as $sectionEnrollment) {
                    if (strcasecmp((string) $sectionEnrollment->status, 'enrolled') !== 0) {
                        continue;
                    }

                    if (in_array($sectionEnrollment->id, $existingEnrollmentIds, true)) {
                        continue;
                    }

                    $student = $sectionEnrollment->student;

                    if (!$student || ($student->role && strcasecmp((string) $student->role, 'student') !== 0)) {
                        continue;
                    }

                    $students->push([
                        'id' => $student->id ?? $sectionEnrollment->student_id,
                        'enrollmentId' => $sectionEnrollment->id,
                        'studentId' => $sectionEnrollment->student_id,
                        'student_number' => $student->id_number ?? null,
                        'studentNo' => $student->id_number ?? null,
                        'fName' => $student->fName ?? null,
                        'mName' => $student->mName ?? null,
                        'lName' => $student->lName ?? null,
                        'name' => $this->formatStudentName($student),
                        'program' => optional($sectionEnrollment->course)->code ?? optional($sectionEnrollment->course)->name,
                        'course' => optional($sectionEnrollment->course)->code ?? optional($sectionEnrollment->course)->name,
                        'year_level' => optional($sectionEnrollment->yearLevel)->year_level,
                        'yearLevel' => optional($sectionEnrollment->yearLevel)->year_level,
                        'section' => optional($sectionEnrollment->section)->section ?? optional($section)->section,
                        'email' => $student->email ?? null,
                        'status' => ucfirst(strtolower((string) $sectionEnrollment->status)),
                        'statusRaw' => strtolower((string) $sectionEnrollment->status),
                        'enrollment_subject_id' => null,
                        'dropReason' => null,
                        'droppedAt' => null,
                        'sourceType' => 'section',
                        'canDrop' => false,
                    ]);
                }
            }

            $students = $students->values();

            \Log::debug('Faculty students list schedule processed', [
                'schedule_id' => $schedule->id,
                'students_count' => $students->count(),
            ]);

            return [
                'class_schedule_id' => $schedule->id,
                'classScheduleId' => $schedule->id,
                'faculty_id' => $schedule->faculty_id,
                'subject' => [
                    'id' => $subjectModel->id ?? null,
                    'code' => $subjectModel->code ?? null,
                    'name' => $subjectModel->descriptive_title ?? $subjectModel->name ?? null,
                ],
                'course' => [
                    'id' => $courseModel->id ?? null,
                    'code' => $courseModel->code ?? null,
                    'name' => $courseModel->name ?? null,
                ],
                'section' => [
                    'id' => $section->id ?? null,
                    'name' => $section->section ?? null,
                    'year_level' => optional(optional($section)->yearLevel)->year_level,
                ],
                'schedule' => $this->formatSchedule($schedule),
                'students' => $students,
            ];
        })->values();

        $termLabel = null;

        if ($activeSemester) {
            $parts = array_filter([
                optional($activeSemester->academicYear)->school_year ?? optional($activeSemester->academicYear)->name,
                $activeSemester->semester ?? $activeSemester->name,
            ]);

            $termLabel = $parts ? implode(' • ', $parts) : null;
        }

        return Inertia::render('Faculty/studentlists/StudentsList', [
            'teachingLoads' => $teachingLoads,
            'termLabel' => $termLabel,
            'filters' => [
                'perPage' => $perPage,
            ],
            'pagination' => [
                'currentPage' => $paginatedSchedules->currentPage(),
                'lastPage' => $paginatedSchedules->lastPage(),
                'perPage' => $paginatedSchedules->perPage(),
                'total' => $paginatedSchedules->total(),
                'from' => $paginatedSchedules->firstItem(),
                'to' => $paginatedSchedules->lastItem(),
            ],
        ]);
    }

    protected function formatSchedule(class_schedules $schedule): ?string
    {
        $parts = [];

        if ($schedule->schedule_day) {
            $parts[] = $schedule->schedule_day;
        }

        $start = $schedule->start_time;
        $end = $schedule->end_time;

        if ($start || $end) {
            $startFormatted = $start ? Carbon::parse($start)->format('g:i A') : null;
            $endFormatted = $end ? Carbon::parse($end)->format('g:i A') : null;

            $timeRange = trim(implode(' - ', array_filter([$startFormatted, $endFormatted])));

            if ($timeRange !== '') {
                $parts[] = $timeRange;
            }
        }

        if ($schedule->classroom && $schedule->classroom->room_number) {
            $parts[] = 'Room ' . $schedule->classroom->room_number;
        }

        return $parts ? implode(' • ', $parts) : null;
    }

    protected function formatStudentName(?Users $student): ?string
    {
        if (!$student) {
            return null;
        }

        $surname = $student->lName ? trim($student->lName) : null;
        $given = $student->fName ? trim($student->fName) : null;
        $middle = $student->mName ? trim($student->mName) : null;

        $primary = [];

        if ($surname) {
            $primary[] = $surname;
        }

        if ($given) {
            $givenWithMiddle = $given;

            if ($middle) {
                $givenWithMiddle .= ' ' . mb_substr($middle, 0, 1) . '.';
            }

            $primary[] = $givenWithMiddle;
        }

        if (!$primary) {
            return null;
        }

        return implode(', ', $primary);
    }

    public function dropStudent()
    {
        request()->validate([
            'enrollment_subject_id' => ['required', 'integer', 'exists:enrollment_subjects,id'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $userId = Auth::id();
        $enrollmentSubjectId = (int) request('enrollment_subject_id');
        $reason = request('reason');

        $enrollmentSubject = EnrollmentSubject::with([
                'enrollment',
                'enrollment.student',
                'classSchedule',
            ])
            ->findOrFail($enrollmentSubjectId);

        $enrollment = $enrollmentSubject->enrollment;
        $student = $enrollment?->student;

        DB::transaction(function () use ($enrollmentSubject, $reason, $userId) {
            $enrollmentSubject->update([
                'status' => 'dropped',
                'dropped_at' => now(),
                'dropped_by' => $userId,
                'drop_reason' => $reason,
            ]);
        });

        \Log::notice('Faculty dropped student from schedule.', [
            'faculty_id' => $userId,
            'enrollment_subject_id' => $enrollmentSubjectId,
            'enrollment_id' => $enrollment?->id,
            'student_id' => $student?->id,
        ]);

        return redirect()->back()->with('success', 'Student dropped successfully.');
    }

    public function undoDropStudent()
    {
        request()->validate([
            'enrollment_subject_id' => ['required', 'integer', 'exists:enrollment_subjects,id'],
        ]);

        $userId = Auth::id();
        $enrollmentSubjectId = (int) request('enrollment_subject_id');

        $enrollmentSubject = EnrollmentSubject::with([
                'enrollment',
                'enrollment.student',
                'classSchedule',
            ])
            ->findOrFail($enrollmentSubjectId);

        $enrollment = $enrollmentSubject->enrollment;
        $student = $enrollment?->student;

        DB::transaction(function () use ($enrollmentSubject) {
            $enrollmentSubject->update([
                'status' => 'enrolled',
                'dropped_at' => null,
                'dropped_by' => null,
                'drop_reason' => null,
            ]);
        });

        \Log::notice('Faculty restored dropped student to schedule.', [
            'faculty_id' => $userId,
            'enrollment_subject_id' => $enrollmentSubjectId,
            'enrollment_id' => $enrollment?->id,
            'student_id' => $student?->id,
        ]);

        return redirect()->back()->with('success', 'Student restored successfully.');
    }
}

