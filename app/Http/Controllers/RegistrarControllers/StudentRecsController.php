<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Class_Schedules;
use App\Models\EnrollmentSubject;
use App\Models\Grades;
use Illuminate\Validation\ValidationException;
use App\Models\Users; 
use App\Models\Enrollments; 
use App\Models\StudentDetail;
use App\Models\Curriculum_Subject;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use App\Mail\StudentCreated;
use App\Models\Requirement;
use App\Models\StudentRequirement;
use App\Models\CreditedSubject;
use App\Models\Notification;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class StudentRecsController extends Controller
{
    public function addEnrollmentSubject(Request $request, Enrollments $enrollment)
    {
        $request->merge([
            'class_schedule_id' => $request->input('class_schedule_id') ?: null,
        ]);

        $validated = $request->validate([
            'curriculum_subject_id' => ['required', 'integer', 'exists:curriculum_subject,id'],
            'class_schedule_id' => ['nullable', 'integer', 'exists:class_schedules,id'],
        ]);

        $enrollment->loadMissing('enrollmentSubjects');

        $curriculumSubjectId = (int) $validated['curriculum_subject_id'];
        $classScheduleId = $validated['class_schedule_id'] ?? null;

        if ($classScheduleId) {
            $scheduleMatchesSubject = Class_Schedules::where('id', $classScheduleId)
                ->where('curriculum_subject_id', $curriculumSubjectId)
                ->exists();

            if (!$scheduleMatchesSubject) {
                throw ValidationException::withMessages([
                    'class_schedule_id' => 'Selected schedule does not belong to the chosen subject.',
                ]);
            }
        }

        DB::transaction(function () use ($enrollment, $curriculumSubjectId, $classScheduleId) {
            $existing = $enrollment->enrollmentSubjects()
                ->where('curriculum_subject_id', $curriculumSubjectId)
                ->lockForUpdate()
                ->first();

            if ($existing && $existing->status === 'enrolled') {
                throw ValidationException::withMessages([
                    'curriculum_subject_id' => 'This subject is already enrolled.',
                ]);
            }

            if ($existing) {
                $existing->update([
                    'class_schedule_id' => $classScheduleId,
                    'status' => 'enrolled',
                    'drop_reason' => null,
                    'dropped_at' => null,
                    'dropped_by' => null,
                ]);
            } else {
                $enrollment->enrollmentSubjects()->create([
                    'enrollment_id' => $enrollment->id,
                    'curriculum_subject_id' => $curriculumSubjectId,
                    'class_schedule_id' => $classScheduleId,
                    'status' => 'enrolled',
                    'drop_reason' => null,
                    'dropped_at' => null,
                    'dropped_by' => null,
                ]);
            }
        });

        return back()->with('success', 'Subject added successfully.');
    }

    public function addEnrollmentSubjectsBatch(Request $request, Enrollments $enrollment)
    {
        $validated = $request->validate([
            'subjects' => ['required', 'array', 'min:1'],
            'subjects.*.curriculum_subject_id' => ['required', 'integer', 'exists:curriculum_subject,id'],
            'subjects.*.class_schedule_id' => ['nullable', 'integer', 'exists:class_schedules,id'],
        ]);

        $subjects = collect($validated['subjects'])
            ->map(function ($subject) {
                return [
                    'curriculum_subject_id' => (int) $subject['curriculum_subject_id'],
                    'class_schedule_id' => isset($subject['class_schedule_id'])
                        ? (int) $subject['class_schedule_id']
                        : null,
                ];
            })
            ->values();

        $seenSubjectIds = [];
        foreach ($subjects as $index => $subject) {
            if (in_array($subject['curriculum_subject_id'], $seenSubjectIds, true)) {
                throw ValidationException::withMessages([
                    "subjects.$index.curriculum_subject_id" => 'Subject selected more than once.',
                ]);
            }
            $seenSubjectIds[] = $subject['curriculum_subject_id'];
        }

        $enrollment->loadMissing('enrollmentSubjects');

        DB::transaction(function () use ($subjects, $enrollment) {
            foreach ($subjects as $index => $subjectData) {
                $curriculumSubjectId = $subjectData['curriculum_subject_id'];
                $classScheduleId = $subjectData['class_schedule_id'];

                if ($classScheduleId) {
                    $scheduleMatchesSubject = Class_Schedules::where('id', $classScheduleId)
                        ->where('curriculum_subject_id', $curriculumSubjectId)
                        ->exists();

                    if (!$scheduleMatchesSubject) {
                        throw ValidationException::withMessages([
                            "subjects.$index.class_schedule_id" => 'Selected schedule does not belong to the chosen subject.',
                        ]);
                    }
                }

                $existing = $enrollment->enrollmentSubjects()
                    ->where('curriculum_subject_id', $curriculumSubjectId)
                    ->lockForUpdate()
                    ->first();

                if ($existing && $existing->status === 'enrolled') {
                    throw ValidationException::withMessages([
                        "subjects.$index.curriculum_subject_id" => 'This subject is already enrolled.',
                    ]);
                }

                if ($existing) {
                    $existing->update([
                        'class_schedule_id' => $classScheduleId,
                        'status' => 'enrolled',
                        'drop_reason' => null,
                        'dropped_at' => null,
                        'dropped_by' => null,
                    ]);
                } else {
                    $enrollment->enrollmentSubjects()->create([
                        'enrollment_id' => $enrollment->id,
                        'curriculum_subject_id' => $curriculumSubjectId,
                        'class_schedule_id' => $classScheduleId,
                        'status' => 'enrolled',
                        'drop_reason' => null,
                        'dropped_at' => null,
                        'dropped_by' => null,
                    ]);
                }
            }
        });

        return back()->with('success', 'Subjects added successfully.');
    }

    public function dropEnrollmentSubjectsBatch(Request $request, Enrollments $enrollment)
    {
        $validated = $request->validate([
            'subjects' => ['required', 'array', 'min:1'],
            'subjects.*.enrollment_subject_id' => [
                'required',
                'integer',
                'exists:enrollment_subjects,id',
            ],
            'subjects.*.reason' => ['required', 'string', 'max:500'],
        ]);

        $enrollment->loadMissing('enrollmentSubjects');

        $enrollmentSubjectMap = $enrollment->enrollmentSubjects
            ->keyBy(fn ($subject) => (int) $subject->id);

        $seenIds = [];
        foreach ($validated['subjects'] as $index => $payload) {
            $subjectId = (int) $payload['enrollment_subject_id'];

            if (in_array($subjectId, $seenIds, true)) {
                throw ValidationException::withMessages([
                    "subjects.$index.enrollment_subject_id" => 'Subject selected more than once.',
                ]);
            }
            $seenIds[] = $subjectId;

            if (!$enrollmentSubjectMap->has($subjectId)) {
                throw ValidationException::withMessages([
                    "subjects.$index.enrollment_subject_id" => 'Subject does not belong to this enrollment.',
                ]);
            }

            $subject = $enrollmentSubjectMap->get($subjectId);
            if ($subject->status === 'dropped') {
                throw ValidationException::withMessages([
                    "subjects.$index.enrollment_subject_id" => 'Subject is already dropped.',
                ]);
            }
        }

        $dropWindowDays = (int) config('enrollment.drop_window_days', 3);
        if ($dropWindowDays <= 0) {
            $dropWindowDays = 3;
        }

        $withinWindow = true;
        if ($enrollment->enrolled_at) {
            $deadline = Carbon::parse($enrollment->enrolled_at)->addDays($dropWindowDays);
            $withinWindow = now()->lessThanOrEqualTo($deadline);
        }

        $authUser = $request->user();
        $droppedById = null;

        if ($authUser) {
            $rawId = $authUser->id ?? $authUser->getAuthIdentifier();
            if (is_numeric($rawId)) {
                $droppedById = (int) $rawId;
            }
        }

        DB::transaction(function () use ($validated, $enrollmentSubjectMap, $droppedById) {
            foreach ($validated['subjects'] as $payload) {
                $subjectId = (int) $payload['enrollment_subject_id'];
                /** @var \App\Models\EnrollmentSubject $subject */
                $subject = $enrollmentSubjectMap->get($subjectId);

                $subject->update([
                    'status' => 'dropped',
                    'drop_reason' => $payload['reason'],
                    'dropped_at' => now(),
                    'dropped_by' => $droppedById,
                ]);
            }
        });

        \Log::info('Registrar dropped enrollment subjects (batch)', [
            'enrollment_id' => $enrollment->id,
            'student_id' => $enrollment->student_id,
            'processed_by' => auth()->id(),
            'subject_count' => count($validated['subjects']),
            'within_window' => $withinWindow,
        ]);

        return back()->with('success', 'Subjects dropped successfully.');
    }

    public function showAddSubjectPage(Request $request, Enrollments $enrollment)
    {
        $payload = $this->buildManageSubjectsPayload($request, $enrollment, 'add');

        return Inertia::render('Registrar/Students/AddDrop', $payload);
    }

    public function showDropSubjectPage(Request $request, Enrollments $enrollment)
    {
        $payload = $this->buildManageSubjectsPayload($request, $enrollment, 'drop');

        return Inertia::render('Registrar/Students/AddDrop', $payload);
    }

    protected function buildManageSubjectsPayload(Request $request, Enrollments $enrollment, string $mode): array
    {
        $enrollment->loadMissing([
            'student:id,fName,mName,lName,suffix',
            'course:id,code,department_id',
            'yearLevel:id,year_level',
            'semester:id,semester',
            'enrollmentSubjects.curriculumSubject:id,lec_unit,lab_unit,subject_id,year_level_id,semesters_id',
            'enrollmentSubjects.curriculumSubject.subject:id,code,descriptive_title',
            'enrollmentSubjects.curriculumSubject.yearLevel:id,year_level',
            'enrollmentSubjects.curriculumSubject.semester:id,semester',
            'enrollmentSubjects.classSchedule.classroom:id,room_number',
            'enrollmentSubjects.classSchedule.faculty:id,fName,lName',
        ]);

        $courseId = $enrollment->courses_id;
        $majorId = $enrollment->majors_id;
        $departmentId = $enrollment->course?->department_id;

        $availableSubjects = Curriculum_Subject::with([
            'subject:id,code,descriptive_title',
            'yearLevel:id,year_level',
            'semester:id,semester',
            'prerequisites' => function ($query) {
                $query->with('subject:id,code,descriptive_title');
            },
            'classSchedules' => function ($query) {
                $query
                    ->select([
                        'id',
                        'curriculum_subject_id',
                        'schedule_day',
                        'start_time',
                        'end_time',
                        'classroom_id',
                        'faculty_id',
                    ])
                    ->with([
                        'classroom:id,room_number',
                        'faculty:id,fName,lName',
                    ]);
            },
            'curriculum:id,courses_id,majors_id,department_id',
        ])
            ->when($courseId, function ($query) use ($courseId) {
                $query->whereHas('curriculum', function ($curriculumQuery) use ($courseId) {
                    $curriculumQuery->where('courses_id', $courseId);
                });
            })
            ->when(!$courseId && $departmentId, function ($query) use ($departmentId) {
                $query->whereHas('curriculum', function ($curriculumQuery) use ($departmentId) {
                    $curriculumQuery->where('department_id', $departmentId);
                });
            })
            ->when($majorId, function ($query) use ($majorId) {
                $query->whereHas('curriculum', function ($curriculumQuery) use ($majorId) {
                    $curriculumQuery->where(function ($inner) use ($majorId) {
                        $inner->whereNull('majors_id')->orWhere('majors_id', $majorId);
                    });
                });
            })
            ->get([
                'id',
                'curricula_id',
                'subject_id',
                'year_level_id',
                'semesters_id',
                'lec_unit',
                'lab_unit',
            ]);

        $academicHistory = $this->buildStudentAcademicSnapshot((int) $enrollment->student_id);
        $passedSubjectIds = collect($academicHistory['passed_subject_ids'] ?? [])
            ->filter(fn ($id) => is_numeric($id))
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $latestGradesBySubject = collect($academicHistory['subjects'] ?? [])
            ->filter(fn ($record) => isset($record['subject_id']))
            ->groupBy(fn ($record) => (int) $record['subject_id'])
            ->map(function ($records) {
                return collect($records)->sortByDesc(fn ($entry) => $entry['recorded_at'] ?? null)->first();
            });

        $availableSubjects = $availableSubjects
            ->map(function (Curriculum_Subject $subject) use ($passedSubjectIds, $latestGradesBySubject) {
                $prerequisites = $subject->prerequisites ?? collect();
                $prerequisiteRecords = $prerequisites
                    ->map(function (Curriculum_Subject $prereq) use ($passedSubjectIds, $latestGradesBySubject) {
                        $latestGrade = $latestGradesBySubject->get((int) $prereq->subject_id);

                        return [
                            'curriculum_subject_id' => $prereq->id,
                            'subject_id' => $prereq->subject_id,
                            'code' => $prereq->subject?->code,
                            'title' => $prereq->subject?->descriptive_title,
                            'met' => $passedSubjectIds->contains((int) $prereq->subject_id),
                            'comment' => $prereq->pivot?->comment,
                            'latest_grade' => $latestGrade ? [
                                'grade' => $latestGrade['grade'] ?? null,
                                'remarks' => $latestGrade['remarks'] ?? null,
                                'is_passed' => (bool) ($latestGrade['is_passed'] ?? false),
                            ] : null,
                        ];
                    })
                    ->values();

                $latestGrade = $latestGradesBySubject->get((int) $subject->subject_id);

                return [
                    'id' => $subject->id,
                    'curricula_id' => $subject->curricula_id,
                    'subject_id' => $subject->subject_id,
                    'lec_unit' => $subject->lec_unit,
                    'lab_unit' => $subject->lab_unit,
                    'subject' => $subject->subject ? [
                        'id' => $subject->subject->id,
                        'code' => $subject->subject->code,
                        'descriptive_title' => $subject->subject->descriptive_title,
                    ] : null,
                    'yearLevel' => $subject->yearLevel ? [
                        'id' => $subject->yearLevel->id,
                        'year_level' => $subject->yearLevel->year_level,
                    ] : null,
                    'semester' => $subject->semester ? [
                        'id' => $subject->semester->id,
                        'semester' => $subject->semester->semester,
                    ] : null,
                    'class_schedules' => $subject->classSchedules
                        ->map(function (Class_Schedules $schedule) {
                            return [
                                'id' => $schedule->id,
                                'schedule_day' => $schedule->schedule_day,
                                'start_time' => $schedule->start_time,
                                'end_time' => $schedule->end_time,
                                'classroom' => $schedule->classroom ? [
                                    'id' => $schedule->classroom->id,
                                    'room_number' => $schedule->classroom->room_number,
                                ] : null,
                                'faculty' => $schedule->faculty ? [
                                    'id' => $schedule->faculty->id,
                                    'fName' => $schedule->faculty->fName,
                                    'lName' => $schedule->faculty->lName,
                                ] : null,
                            ];
                        })
                        ->values(),
                    'prerequisites' => $prerequisiteRecords,
                    'prerequisites_met' => $prerequisiteRecords->every(fn ($record) => $record['met'] === true),
                    'has_passed' => $passedSubjectIds->contains((int) $subject->subject_id),
                    'latest_grade' => $latestGrade ? [
                        'grade' => $latestGrade['grade'] ?? null,
                        'remarks' => $latestGrade['remarks'] ?? null,
                        'is_passed' => (bool) ($latestGrade['is_passed'] ?? false),
                    ] : null,
                ];
            })
            ->values();

        $enrollment->setRelation('enrollmentSubjects', $enrollment->enrollmentSubjects->sortBy('id')->values());

        $alreadyEnrolledIds = $enrollment->enrollmentSubjects
            ->pluck('curriculum_subject_id')
            ->filter()
            ->unique()
            ->values();

        $currentUnits = $enrollment->enrollmentSubjects
            ->where('status', 'enrolled')
            ->sum(function (EnrollmentSubject $subject) {
                $curriculum = $subject->curriculumSubject;
                $lec = (int) ($curriculum?->lec_unit ?? 0);
                $lab = (int) ($curriculum?->lab_unit ?? 0);

                return $lec + $lab;
            });

        $student = $enrollment->student;
        $studentName = $student
            ? collect([$student->fName, $student->mName, $student->lName, $student->suffix])
                ->filter()
                ->implode(' ')
            : null;

        $enrolledSubjects = $enrollment->enrollmentSubjects
            ->map(function (EnrollmentSubject $subject) {
                $curriculum = $subject->curriculumSubject;
                $schedule = $subject->classSchedule;

                $totalUnits = null;
                if ($curriculum) {
                    $lec = (int) ($curriculum->lec_unit ?? 0);
                    $lab = (int) ($curriculum->lab_unit ?? 0);
                    $totalUnits = $lec + $lab;
                }

                return [
                    'enrollment_subject_id' => $subject->id,
                    'code' => $curriculum?->subject?->code,
                    'title' => $curriculum?->subject?->descriptive_title,
                    'units' => $totalUnits,
                    'year_label' => $curriculum?->yearLevel?->year_level,
                    'semester_label' => $curriculum?->semester?->semester,
                    'schedule_label' => $this->formatScheduleLabel($schedule),
                    'status' => $subject->status,
                ];
            })
            ->values();

        $dropWindowDays = (int) config('enrollment.drop_window_days', 3);
        if ($dropWindowDays <= 0) {
            $dropWindowDays = 3;
        }

        $withinWindow = true;
        $deadline = null;
        if ($enrollment->enrolled_at) {
            $deadline = Carbon::parse($enrollment->enrolled_at)->addDays($dropWindowDays);
            $withinWindow = now()->lessThanOrEqualTo($deadline);
        }

        return [
            'enrollment' => [
                'id' => $enrollment->id,
                'student_id' => $enrollment->student_id,
                'student_name' => $studentName,
                'course' => $enrollment->course
                    ? ['id' => $enrollment->course->id, 'code' => $enrollment->course->code]
                    : null,
                'year_level' => $enrollment->yearLevel
                    ? ['id' => $enrollment->yearLevel->id, 'year_level' => $enrollment->yearLevel->year_level]
                    : null,
                'semester' => $enrollment->semester
                    ? ['id' => $enrollment->semester->id, 'semester' => $enrollment->semester->semester]
                    : null,
                'current_units' => $currentUnits,
            ],
            'availableSubjects' => $availableSubjects,
            'alreadyEnrolledIds' => $alreadyEnrolledIds,
            'enrolledSubjects' => $enrolledSubjects,
            'yearLabel' => $request->input('year_label') ?: null,
            'initialMode' => $mode,
            'prefillDropSubjectId' => $request->input('subject_id') ?: null,
            'dropWindowDays' => $dropWindowDays,
            'dropDeadline' => $deadline?->toIso8601String(),
            'isWithinDropWindow' => $withinWindow,
        ];
    }

    // Fetch submitted grades
    public function studentGrades(Request $request)
    {
        $selectedSemester = $this->resolveSemester($request);

        if (!$selectedSemester) {
            return Inertia::render('Registrar/Students/StudentGrades', [
                'courses' => [],
                'activeSemester' => null,
                'majorFilters' => [],
            ]);
        }

        $courses = array_values(array_map(function ($course) {
            $years = array_map(function ($year) {
                $sections = array_map(function ($section) {
                    $studentCount = array_reduce($section['subjects'], function ($carry, $subject) {
                        return $carry + count($subject['students'] ?? []);
                    }, 0);

                    return [
                        'section_id' => $section['section_id'],
                        'section' => $section['section'],
                        'subject_count' => count($section['subjects']),
                        'student_count' => $studentCount,
                    ];
                }, $year['sections']);

                $studentCount = array_reduce($sections, function ($carry, $section) {
                    return $carry + ($section['student_count'] ?? 0);
                }, 0);

                return [
                    'year_id' => $year['year_id'],
                    'label' => $year['label'],
                    'section_count' => count($sections),
                    'student_count' => $studentCount,
                    'sections' => $sections,
                ];
            }, $course['years']);

            return [
                'course_id' => $course['course_id'],
                'course_code' => $course['course_code'],
                'course_name' => $course['course_name'],
                'major_id' => $course['major_id'],
                'major_name' => $course['major_name'],
                'year_count' => count($course['years']),
                'section_count' => $course['counts']['sections'],
                'student_count' => $course['counts']['students'],
                'years' => $years,
            ];
        }, $this->buildSubmittedGradeHierarchy($selectedSemester->id)));

        return Inertia::render('Registrar/Students/StudentGrades', [
            'courses' => $courses,
            'activeSemester' => $selectedSemester,
        ]);
    }

    public function studentGradesSectionSubjects(Request $request, $courseId, $yearId, $sectionId)
    {
        $selectedSemester = $this->resolveSemester($request);
        if (!$selectedSemester) {
            return $this->handleMissingSemesterResponse();
        }

        $majorId = $request->query('major_id');
        $courses = $this->buildSubmittedGradeHierarchy($selectedSemester->id);
        $course = $this->findCourseEntry($courses, $courseId, $majorId);

        if (!$course) {
            abort(404);
        }

        $year = collect($course['years'])->first(fn($entry) => (string) ($entry['year_id'] ?? '0') === (string) $yearId);

        if (!$year) {
            abort(404);
        }

        $section = collect($year['sections'])->first(fn($entry) => (string) ($entry['section_id'] ?? '0') === (string) $sectionId);

        if (!$section) {
            abort(404);
        }

        $subjects = array_map(function ($subject) {
            return [
                'class_schedule_id' => $subject['class_schedule_id'],
                'subject' => $subject['subject'],
                'faculty' => $subject['faculty'],
                'student_count' => count($subject['students']),
            ];
        }, $section['subjects']);

        $totalStudents = array_reduce($section['subjects'], function ($carry, $subject) {
            return $carry + count($subject['students']);
        }, 0);

        return Inertia::render('Registrar/Students/StudentGradesSectionSubjects', [
            'course' => [
                'id' => $course['course_id'],
                'code' => $course['course_code'],
                'name' => $course['course_name'],
                'major_id' => $course['major_id'],
                'major_name' => $course['major_name'],
            ],
            'year' => [
                'id' => $year['year_id'],
                'label' => $year['label'],
            ],
            'section' => [
                'id' => $section['section_id'],
                'name' => $section['section'],
                'subject_count' => count($section['subjects']),
                'student_count' => $totalStudents,
            ],
            'subjects' => $subjects,
            'activeSemester' => $selectedSemester,
        ]);
    }

    public function studentGradesSectionSubjectReview(Request $request, $courseId, $yearId, $sectionId, $subjectId)
    {
        $selectedSemester = $this->resolveSemester($request);
        if (!$selectedSemester) {
            return $this->handleMissingSemesterResponse();
        }

        $majorId = $request->query('major_id');
        $courses = $this->buildSubmittedGradeHierarchy($selectedSemester->id);
        $course = $this->findCourseEntry($courses, $courseId, $majorId);

        if (!$course) {
            abort(404);
        }

        $year = collect($course['years'])->first(fn($entry) => (string) ($entry['year_id'] ?? '0') === (string) $yearId);

        if (!$year) {
            abort(404);
        }

        $section = collect($year['sections'])->first(fn($entry) => (string) ($entry['section_id'] ?? '0') === (string) $sectionId);

        if (!$section) {
            abort(404);
        }

        $subject = collect($section['subjects'])->first(fn($entry) => (string) ($entry['class_schedule_id'] ?? '0') === (string) $subjectId);

        if (!$subject) {
            abort(404);
        }

        $focus = [
            'student_id' => $request->query('student_id'),
            'term' => $request->query('term'),
        ];

        return Inertia::render('Registrar/Students/StudentGradesSectionReview', [
            'course' => [
                'id' => $course['course_id'],
                'code' => $course['course_code'],
                'name' => $course['course_name'],
                'major_id' => $course['major_id'],
                'major_name' => $course['major_name'],
            ],
            'year' => [
                'id' => $year['year_id'],
                'label' => $year['label'],
            ],
            'section' => [
                'id' => $section['section_id'],
                'name' => $section['section'],
            ],
            'subject' => $subject,
            'activeSemester' => $selectedSemester,
            'focus' => $focus,
        ]);
    }

    public function studentGradesCourseYears(Request $request, $courseId)
    {
        $selectedSemester = $this->resolveSemester($request);
        if (!$selectedSemester) {
            return $this->handleMissingSemesterResponse();
        }

        $majorId = $request->query('major_id');
        $course = $this->findCourseEntry($this->buildSubmittedGradeHierarchy($selectedSemester->id), $courseId, $majorId);

        if (!$course) {
            abort(404);
        }

        $years = array_map(function ($year) {
            $studentCount = collect($year['sections'])
                ->flatMap(fn($section) => $section['subjects'])
                ->flatMap(fn($subject) => $subject['students'])
                ->count();

            return [
                'year_id' => $year['year_id'],
                'label' => $year['label'],
                'section_count' => count($year['sections']),
                'student_count' => $studentCount,
            ];
        }, $course['years']);

        return Inertia::render('Registrar/Students/StudentGradesCourse', [
            'course' => [
                'id' => $course['course_id'],
                'code' => $course['course_code'],
                'name' => $course['course_name'],
                'major_id' => $course['major_id'],
                'major_name' => $course['major_name'],
            ],
            'activeSemester' => $selectedSemester,
            'years' => $years,
        ]);
    }

    public function studentGradesYearSections(Request $request, $courseId, $yearId)
    {
        $selectedSemester = $this->resolveSemester($request);
        if (!$selectedSemester) {
            return $this->handleMissingSemesterResponse();
        }

        $majorId = $request->query('major_id');
        $course = $this->findCourseEntry($this->buildSubmittedGradeHierarchy($selectedSemester->id), $courseId, $majorId);

        if (!$course) {
            abort(404);
        }

        $year = collect($course['years'])->first(fn($entry) => (string) ($entry['year_id'] ?? '0') === (string) $yearId);

        if (!$year) {
            abort(404);
        }

        $sections = array_map(function ($section) {
            $studentCount = array_reduce($section['subjects'], function ($carry, $subject) {
                return $carry + count($subject['students'] ?? []);
            }, 0);

            return [
                'section_id' => $section['section_id'],
                'section' => $section['section'],
                'subject_count' => count($section['subjects']),
                'student_count' => $studentCount,
            ];
        }, $year['sections']);

        return Inertia::render('Registrar/Students/StudentGradesSections', [
            'course' => [
                'id' => $course['course_id'],
                'code' => $course['course_code'],
                'name' => $course['course_name'],
                'major_id' => $course['major_id'],
                'major_name' => $course['major_name'],
            ],
            'year' => [
                'id' => $year['year_id'],
                'label' => $year['label'],
            ],
            'sections' => $sections,
            'activeSemester' => $selectedSemester,
        ]);
    }

    protected function resolveSemester(Request $request)
    {
        $semesterId = $request->query('semester_id');

        if ($semesterId) {
            return DB::table('semesters')->where('id', $semesterId)->first();
        }

        return DB::table('semesters')->where('is_active', 1)->first();
    }

    protected function handleMissingSemesterResponse()
    {
        return Inertia::render('Registrar/Students/StudentGrades', [
            'courses' => [],
            'activeSemester' => null,
            'majorFilters' => [],
            'missingSemesterMessage' => 'No semester data is available. Please enable a semester or reopen this link after activation.',
        ]);
    }

    // Confirm or reject a submitted grade
    public function confirmGrade(Request $request)
    {
        $request->validate([
            'enrollment_id' => 'required|exists:enrollments,id',
            'class_schedule_id' => 'required|exists:class_schedules,id',
            'final_status' => 'required|in:confirmed,rejected',
            'term' => 'required|in:midterm,final,both',
        ]);

        $grade = Grades::where('enrollment_id', $request->enrollment_id)
            ->where('class_schedule_id', $request->class_schedule_id)
            ->first();

        if (!$grade) {
            throw ValidationException::withMessages([
                'term' => 'Grade record was not found for the selected student.',
            ]);
        }

        $grade->loadMissing([
            'enrollment.student:id,fName,mName,lName',
            'classSchedule.curriculumSubject.subject:id,descriptive_title',
            'faculty:id,fName,lName',
        ]);

        $term = $request->input('term');
        $decision = $request->input('final_status');

        $normalizeStatus = static function ($value, $default = 'draft') {
            $raw = $value ?? $default;
            return strtolower(trim($raw));
        };

        $midtermState = $normalizeStatus($grade->midterm_status);
        $finalState = $normalizeStatus($grade->final_status);

        $midtermSubmitted = in_array($midtermState, ['submitted', 'confirmed'], true);
        $finalSubmitted = in_array($finalState, ['submitted', 'confirmed'], true);

        $updated = false;

        $changeAffected = [];

        if (in_array($term, ['midterm', 'both'])) {
            if (!$midtermSubmitted) {
                throw ValidationException::withMessages([
                    'term' => "Midterm grade isn't submitted yet.",
                ]);
            }
            $grade->midterm_status = $decision;
            if ($normalizeStatus($grade->midterm_change_status, 'none') === 'requested') {
                $grade->midterm_change_status = $decision === 'confirmed' ? 'approved' : 'denied';
                $changeAffected[] = 'midterm';
            }
            $updated = true;
        }

        if (in_array($term, ['final', 'both'])) {
            if (!$finalSubmitted) {
                throw ValidationException::withMessages([
                    'term' => "Final grade isn't submitted yet.",
                ]);
            }
            $grade->final_status = $decision;
            if ($normalizeStatus($grade->final_change_status, 'none') === 'requested') {
                $grade->final_change_status = $decision === 'confirmed' ? 'approved' : 'denied';
                $changeAffected[] = 'final';
            }
            $updated = true;
        }

        if (!$updated) {
            throw ValidationException::withMessages([
                'term' => 'No term is available to update.',
            ]);
        }

        if ($decision === 'rejected') {
            $grade->confirmed_by = null;
            $grade->confirmed_at = null;
        } else {
            $grade->confirmed_by = auth()->user()->id;
            $grade->confirmed_at = now();
        }
        $grade->save();

        if (!empty($changeAffected)) {
            $this->notifyFacultyOfGradeChangeDecision($grade, $changeAffected, $decision);
        }

        return back()->with('success', 'Grade decision recorded');
    }

    protected function notifyFacultyOfGradeChangeDecision(Grades $grade, array $parts, string $decision): void
    {
        $facultyId = $grade->faculty_id;

        if (!$facultyId) {
            return;
        }

        $partsLabel = collect($parts)
            ->map(fn ($part) => ucfirst($part))
            ->implode(' & ');

        $student = optional($grade->enrollment)->student;
        $studentName = $student
            ? trim(sprintf('%s %s', $student->fName, $student->lName))
            : 'a student';

        $subjectTitle = optional($grade->classSchedule?->curriculumSubject?->subject)->descriptive_title ?? 'their subject';

        $decisionLabel = $decision === 'confirmed' ? 'approved' : 'denied';

        $message = sprintf(
            'Registrar %s your %s grade change for %s (%s).',
            $decisionLabel,
            strtolower($partsLabel),
            $studentName,
            $subjectTitle
        );

        $sectionId = optional($grade->classSchedule)->section_id;

        Notification::create([
            'user_id' => $facultyId,
            'type' => 'grade_change_decision',
            'title' => sprintf('%s grade change %s', $partsLabel, $decisionLabel),
            'message' => $message,
            'url' => route('faculty.classes.subject.grades', [
                'schedule' => $grade->class_schedule_id,
                'section' => $sectionId,
            ]),
            'is_read' => false,
        ]);
    }

    protected function buildSubmittedGradeHierarchy(int $semesterId): array
    {
        $schedules = Class_Schedules::with([
            'section.yearLevel',
            'curriculumSubject.subject',
            'curriculumSubject.curriculum.course',
            'curriculumSubject.curriculum.major',
            'faculty',
        ])
            ->where('semester_id', $semesterId)
            ->orderBy('schedule_day')
            ->orderBy('start_time')
            ->get();

        $courses = [];

        foreach ($schedules as $schedule) {
            $courseModel = $schedule->curriculumSubject?->curriculum?->course;
            if (!$courseModel) {
                continue;
            }

            $majorModel = $schedule->curriculumSubject?->curriculum?->major;
            $courseKey = ($courseModel->id ?? 0) . ':' . ($majorModel?->id ?? '0');

            if (!isset($courses[$courseKey])) {
                $courses[$courseKey] = [
                    'course_key' => $courseKey,
                    'course_id' => $courseModel->id,
                    'course_code' => $courseModel->code ?? 'N/A',
                    'course_name' => $courseModel->name ?? $courseModel->code ?? 'Course',
                    'major_id' => $majorModel?->id,
                    'major_name' => $majorModel?->name,
                    'years' => [],
                    'counts' => ['sections' => 0, 'students' => 0],
                ];
            }

            $yearLevel = $schedule->section?->yearLevel;
            $yearKey = $yearLevel?->id ?? 0;
            if (!isset($courses[$courseKey]['years'][$yearKey])) {
                $courses[$courseKey]['years'][$yearKey] = [
                    'year_id' => $yearLevel?->id,
                    'label' => $yearLevel?->year_level ?? 'Year Level',
                    'sections' => [],
                ];
            }

            $sectionId = $schedule->section?->id ?? 0;
            if (!isset($courses[$courseKey]['years'][$yearKey]['sections'][$sectionId])) {
                $courses[$courseKey]['years'][$yearKey]['sections'][$sectionId] = [
                    'section_id' => $schedule->section?->id,
                    'section' => $schedule->section?->section ?? 'Section',
                    'subjects' => [],
                ];
                $courses[$courseKey]['counts']['sections']++;
            }

            $subjectTitle = $schedule->curriculumSubject?->subject?->descriptive_title ?? 'Subject';

            if (!isset($courses[$courseKey]['years'][$yearKey]['sections'][$sectionId]['subjects'][$schedule->id])) {
                $courses[$courseKey]['years'][$yearKey]['sections'][$sectionId]['subjects'][$schedule->id] = [
                    'class_schedule_id' => $schedule->id,
                    'subject' => $subjectTitle,
                    'faculty' => $schedule->faculty
                        ? trim(($schedule->faculty->fName ?? '') . ' ' . ($schedule->faculty->lName ?? ''))
                        : 'N/A',
                    'students' => [],
                ];
            }

            $students = EnrollmentSubject::with(['enrollment.student'])
                ->where('class_schedule_id', $schedule->id)
                ->get()
                ->map(function ($enrolled) use ($schedule) {
                    $enrollment = $enrolled->enrollment;
                    $student = $enrollment->student;

                    if (!$student || $enrollment->status !== 'enrolled') {
                        return null;
                    }

                    $grade = $enrolled->grades;

                    // If no grade found via relationship, try direct query
                    if (!$grade) {
                        $grade = \App\Models\Grades::where('enrollment_subject_id', $enrolled->id)
                            ->orderByDesc('updated_at')
                            ->first();
                    }

                    if (!$grade) {
                        return null;
                    }

                    return [
                        'enrollment_id' => $enrollment->id,
                        'id' => $student->id,
                        'name' => trim(($student->fName ?? '') . ' ' . ($student->lName ?? '')),
                        'id_number' => $student->id_number,
                        'midterm' => $grade->midterm,
                        'final' => $grade->final,
                        'remarks' => $grade->remarks,
                        'midterm_status' => $grade->midterm_status ?? 'draft',
                        'final_status' => $grade->final_status ?? 'draft',
                        'midterm_change_status' => $grade->midterm_change_status ?? 'none',
                        'final_change_status' => $grade->final_change_status ?? 'none',
                    ];
                })
                ->filter()
                ->values();

            $courses[$courseKey]['years'][$yearKey]['sections'][$sectionId]['subjects'][$schedule->id]['students'] = $students;
            $courses[$courseKey]['counts']['students'] += $students->count();
        }

        foreach ($courses as $courseKey => $course) {
            $courses[$courseKey]['years'] = array_values(array_map(function ($year) {
                $year['sections'] = array_values(array_map(function ($section) {
                    $section['subjects'] = array_values($section['subjects']);
                    return $section;
                }, $year['sections']));
                return $year;
            }, $course['years']));
        }

        return $courses;
    }

    protected function findCourseEntry(array $courses, $courseId, $majorId = null)
    {
        return collect($courses)->first(function ($course) use ($courseId, $majorId) {
            $matchesCourse = (string) ($course['course_id'] ?? '0') === (string) $courseId;
            $matchesMajor = (string) ($course['major_id'] ?? '0') === (string) ($majorId ?? '0');
            return $matchesCourse && $matchesMajor;
        });
    }

    // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    public function showStudentAcc(Request $request)
    {
        // Fetch all students (you can filter by active status if needed)
        $students = Users::where('role', 'student')
            ->orderBy('lName')
            ->get(['id','id_number', 'fName', 'mName', 'lName', 'email', 'username','generated_password',]); // only select needed fields

        return Inertia::render('Registrar/Students/StudentsAccount', [
            'students' => $students,
        ]);
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // CREATE STUDENT ACCOUNT
    public function createAccount(Request $request, $id)
    {
        // 🔎 Find student
        $student = Users::findOrFail($id);

        if (empty($student->email)) {
            return back()->with('error', 'No email found for this student. Please update student details first.');
        }

        // ❌ Prevent duplicate accounts
        if (!empty($student->generated_password)) {
            return back()->with('error', 'Account already exists for this student.');
        }

        // 🔑 Generate secure random password
        $rawPassword = Str::random(12);

        // 🆕 Generate random unique username
        do {
            $username = strtolower(Str::random(8)); // random 8-char string
        } while (Users::where('username', $username)->exists());

        // ✅ Save hashed password and username
        $student->update([
            'username'           => $username,
            'password'           => Hash::make($rawPassword), // hashed for login
            'generated_password' => $rawPassword,             // plain for one-time display/email
            'role'               => 'student',
        ]);

        try {
            // 📧 Queue credentials email (username + password)
            Mail::to($student->email)->queue(
                new StudentCreated($student, $rawPassword)
            );

            Log::info('Student credentials email sent', [
                'student_id' => $student->id,
                'email' => $student->email,
                'username' => $username,
            ]);

            session()->flash('credentials', [
                'student' => $student->only(['fName', 'mName', 'lName', 'email', 'id_number']),
                'username' => $username,
                'password' => $rawPassword,
            ]);

            return back()->with('success', 'Student account created with username "' . $username . '" and credentials queued for delivery to ' . $student->email);
        } catch (\Exception $e) {
            Log::error('Student credentials email failed', [
                'student_id' => $student->id,
                'email' => $student->email,
                'error' => $e->getMessage(),
            ]);

            return back()->with('error', 'Student account created but email queueing failed: ' . $e->getMessage());
        }
    }

///////////////////////////////////////////////////////////////////////////////////////////////////////////

public function studentProfiles(Request $request)
{
    $search = $request->input('search');
    $course = $request->input('course');
    $perPage = (int) $request->input('per_page', 12);
    $letter = strtoupper($request->input('letter', 'All'));
    if (!preg_match('/^[A-Z]$/', $letter)) {
        $letter = 'All';
    }

    $studentsQuery = Users::where('role', 'student')
        ->with([
            'enrollments.course:id,code',
            'enrollments.yearLevel:id,year_level',
            'enrollments.semester:id,semester',
        ])
        ->select([
            'id',
            'fName',
            'mName',
            'lName',
            'suffix',
            'id_number',
            'contact_no',
            'address',
            'profession',
            'gender',
            'date_of_birth',
            'profile_picture',
            'email',
            'username',
        ])
        ->orderBy('lName')
        ->orderBy('fName');

    if (!empty($search)) {
        $studentsQuery->where(function ($query) use ($search) {
            $query->where('fName', 'like', "%{$search}%")
                ->orWhere('mName', 'like', "%{$search}%")
                ->orWhere('lName', 'like', "%{$search}%")
                ->orWhere('id_number', 'like', "%{$search}%");
        });
    }

    if (!empty($course) && $course !== 'All') {
        $studentsQuery->whereHas('enrollments.course', function ($query) use ($course) {
            $query->where('code', $course);
        });
    }

    if ($letter !== 'All') {
        $studentsQuery->where(function ($query) use ($letter) {
            $query->where('lName', 'like', $letter . '%');
        });
    }

    $students = $studentsQuery->paginate($perPage > 0 ? $perPage : 12)->withQueryString();

    $courseOptions = DB::table('courses')
        ->join('enrollments', 'enrollments.courses_id', '=', 'courses.id')
        ->join('users', 'enrollments.student_id', '=', 'users.id')
        ->where('users.role', 'student')
        ->select('courses.code')
        ->distinct()
        ->orderBy('courses.code')
        ->pluck('courses.code')
        ->filter()
        ->values();

    return Inertia::render('Registrar/Students/StudentProfile', [
        'students' => $students,
        'courses' => $courseOptions,
        'filters' => [
            'search' => $search,
            'course' => $course,
            'letter' => $letter,
            'per_page' => $perPage,
        ],
    ]);
}

public function createStudentProfile()
{
    $requirements = Requirement::orderBy('name')
        ->get(['id', 'name', 'required_for']);

    return Inertia::render('Registrar/Students/StudentProfileCreate', [
        'requirementOptions' => $requirements,
    ]);
}

public function storeStudentProfile(Request $request)
{
    $validatedUser = $request->validate([
        'fName' => ['required', 'string', 'max:255'],
        'mName' => ['nullable', 'string', 'max:255'],
        'lName' => ['required', 'string', 'max:255'],
        'suffix' => ['nullable', 'string', 'max:10'],
        'id_number' => ['nullable', 'string', 'max:50', 'unique:users,id_number'],
        'contact_no' => ['nullable', 'string', 'max:50'],
        'address' => ['nullable', 'string', 'max:255'],
        'profession' => ['nullable', 'string', 'max:255'],
        'gender' => ['required', Rule::in(['Male', 'Female', 'Other'])],
        'date_of_birth' => ['nullable', 'date'],
        'email' => ['required', 'email', 'max:255', 'unique:users,email'],
        'username' => ['nullable', 'string', 'max:255', 'unique:users,username'],
    ]);

    $generatedPassword = Str::random(12);

    $user = Users::create(array_merge($validatedUser, [
        'role' => 'student',
        'generated_password' => $generatedPassword,
        'password' => Hash::make($generatedPassword),
    ]));

    $validatedDetails = $request->validate([
        'campus' => ['nullable', 'string', 'max:255'],
        'birth_date' => ['nullable', 'date'],
        'place_of_birth' => ['nullable', 'string', 'max:255'],
        'height_ft' => ['nullable', 'numeric'],
        'weight_kg' => ['nullable', 'numeric'],
        'contact_number' => ['nullable', 'string', 'max:50'],
        'email_address' => ['nullable', 'email', 'max:255'],
        'exam_result' => ['nullable', 'string', 'max:255'],
        'current_address_street' => ['nullable', 'string', 'max:255'],
        'current_address_barangay' => ['nullable', 'string', 'max:255'],
        'current_address_municipality' => ['nullable', 'string', 'max:255'],
        'current_address_province' => ['nullable', 'string', 'max:255'],
        'home_address_street' => ['nullable', 'string', 'max:255'],
        'home_address_barangay' => ['nullable', 'string', 'max:255'],
        'home_address_municipality' => ['nullable', 'string', 'max:255'],
        'home_address_province' => ['nullable', 'string', 'max:255'],
        'father_name' => ['nullable', 'string', 'max:255'],
        'father_contact' => ['nullable', 'string', 'max:255'],
        'father_occupation' => ['nullable', 'string', 'max:255'],
        'mother_maiden_name' => ['nullable', 'string', 'max:255'],
        'mother_contact' => ['nullable', 'string', 'max:255'],
        'mother_occupation' => ['nullable', 'string', 'max:255'],
        'guardian_name' => ['nullable', 'string', 'max:255'],
        'guardian_contact' => ['nullable', 'string', 'max:255'],
        'guardian_occupation' => ['nullable', 'string', 'max:255'],
        'last_school_attended' => ['nullable', 'string', 'max:255'],
        'college_name' => ['nullable', 'string', 'max:255'],
        'college_year_graduated' => ['nullable', 'integer', 'min:1900', 'max:'.date('Y')],
        'senior_high_school_name' => ['nullable', 'string', 'max:255'],
        'senior_high_school_year_graduated' => ['nullable', 'integer', 'min:1900', 'max:'.date('Y')],
        'junior_high_school_name' => ['nullable', 'string', 'max:255'],
        'junior_high_school_year_graduated' => ['nullable', 'integer', 'min:1900', 'max:'.date('Y')],
        'elementary_school_name' => ['nullable', 'string', 'max:255'],
        'elementary_school_year_graduated' => ['nullable', 'integer', 'min:1900', 'max:'.date('Y')],
        'admission_type' => ['required', Rule::in(['Freshman', 'Continuing', 'Transferee', 'Returnee', 'Shiftee'])],
        'transfer_status' => ['required', Rule::in(['None', 'Pending', 'Transferred', 'Unenrolled'])],
        'student_status' => ['required', Rule::in(['Regular', 'Irregular'])],
    ]);

    StudentDetail::create(array_merge($validatedDetails, [
        'user_id' => $user->id,
        'contact_number' => $validatedDetails['contact_number'] ?? $validatedUser['contact_no'] ?? null,
        'email_address' => $validatedDetails['email_address'] ?? $validatedUser['email'] ?? null,
    ]));

    $requirementsData = Validator::make($request->all(), [
        'requirements' => ['nullable', 'array'],
        'requirements.*.requirement_id' => ['required', 'exists:requirements,id'],
        'requirements.*.is_submitted' => ['nullable', 'boolean'],
        'requirements.*.image' => ['nullable', 'file', 'image', 'max:2048'],
    ])->validate()['requirements'] ?? [];

    foreach ($requirementsData as $index => $requirementData) {
        $requirementId = $requirementData['requirement_id'] ?? null;

        if (!$requirementId) {
            continue;
        }

        $isSubmitted = filter_var($requirementData['is_submitted'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $payload = [
            'student_id' => $user->id,
            'requirement_id' => $requirementId,
            'is_submitted' => $isSubmitted,
            'submitted_at' => $isSubmitted ? now() : null,
        ];

        if ($request->hasFile("requirements.$index.image")) {
            $payload['image'] = $request->file("requirements.$index.image")->store('requirements', 'public');
        }

        StudentRequirement::updateOrCreate(
            [
                'student_id' => $user->id,
                'requirement_id' => $requirementId,
            ],
            $payload
        );
    }

    return redirect()->route('registrar.students.profile')->with('success', 'Student profile created successfully.');
}

public function showStudentProfile($id)
{
    $student = Users::where('role', 'student')
        ->with([
            'studentDetails',
            'studentRequirements' => function ($query) {
                $query
                    ->select([
                        'id',
                        'student_id',
                        'requirement_id',
                        'image',
                        'is_submitted',
                        'submitted_at',
                        'created_at',
                        'updated_at',
                    ])
                    ->with([
                        'requirement:id,name,required_for',
                    ]);
            },
            'enrollments' => function ($query) {
                $query
                    ->select([
                        'id',
                        'student_id',
                        'courses_id',
                        'majors_id',
                        'year_level_id',
                        'semester_id',
                        'section_id',
                        'school_year_id',
                        'enrolled_at',
                        'status',
                    ])
                    ->with([
                        'course:id,code,name,department_id',
                        'yearLevel:id,year_level',
                        'semester:id,semester',
                        'section:id,section',
                        'schoolYear:id,school_year',
                        'enrollmentSubjects' => function ($subjectQuery) {
                            $subjectQuery
                                ->select([
                                    'id',
                                    'enrollment_id',
                                    'class_schedule_id',
                                    'curriculum_subject_id',
                                    'status',
                                    'drop_reason',
                                    'dropped_at',
                                    'dropped_by',
                                ])
                                ->with([
                                    'classSchedule' => function ($scheduleQuery) {
                                        $scheduleQuery
                                            ->select([
                                                'id',
                                                'curriculum_subject_id',
                                                'schedule_day',
                                                'start_time',
                                                'end_time',
                                                'classroom_id',
                                                'faculty_id',
                                            ])
                                            ->with([
                                                'curriculumSubject.subject:id,code,descriptive_title',
                                                'classroom:id,room_number',
                                                'faculty:id,fName,lName',
                                            ]);
                                    },
                                    'curriculumSubject.subject:id,code,descriptive_title',
                                    'curriculumSubject.yearLevel:id,year_level',
                                    'curriculumSubject.semester:id,semester',
                                    'grades:id,enrollment_id,class_schedule_id,midterm,final,remarks,midterm_status,final_status',
                                    'droppedBy:id,fName,lName',
                                ]);
                        },
                    ])
                    ->orderByDesc('enrolled_at');
            },
        ])
        ->select([
            'id',
            'fName',
            'mName',
            'lName',
            'suffix',
            'id_number',
            'contact_no',
            'address',
            'gender',
            'date_of_birth',
            'profile_picture',
            'email',
            'username',
        ])
        ->findOrFail($id);

    $latestEnrollment = $student->enrollments->first();

    if ($latestEnrollment && $latestEnrollment->relationLoaded('enrollmentSubjects')) {
        $latestGrades = Grades::query()
            ->where('enrollment_id', $latestEnrollment->id)
            ->get([
                'id',
                'enrollment_id',
                'class_schedule_id',
                'midterm',
                'final',
                'remarks',
                'midterm_status',
                'final_status',
                'midterm_change_status',
                'final_change_status',
            ])
            ->keyBy('class_schedule_id');

        $latestEnrollment->enrollmentSubjects->each(function (EnrollmentSubject $subject) use ($latestGrades) {
            $classScheduleId = $subject->class_schedule_id;
            $subjectGrade = $classScheduleId ? $latestGrades->get($classScheduleId) : null;
            $subject->setRelation('grades', $subjectGrade);
        });
    }

    $requirements = Requirement::orderBy('name')
        ->get(['id', 'name', 'required_for']);

    $courseId = $latestEnrollment?->courses_id;
    $majorId = $latestEnrollment?->majors_id;
    $departmentId = $latestEnrollment?->course?->department_id;

    $availableSubjects = $latestEnrollment
        ? Curriculum_Subject::with([
            'subject:id,code,descriptive_title',
            'yearLevel:id,year_level',
            'semester:id,semester',
            'classSchedules' => function ($query) {
                $query
                    ->select([
                        'id',
                        'curriculum_subject_id',
                        'schedule_day',
                        'start_time',
                        'end_time',
                        'classroom_id',
                        'faculty_id',
                    ])
                    ->with([
                        'classroom:id,room_number',
                        'faculty:id,fName,lName',
                    ]);
            },
            'curriculum:id,courses_id,majors_id,department_id',
        ])
        ->whereHas('curriculum', function ($query) use ($courseId, $majorId, $departmentId) {
            if ($courseId) {
                $query->where('courses_id', $courseId);
            }

            if ($majorId) {
                $query->where(function ($inner) use ($majorId) {
                    $inner->whereNull('majors_id')->orWhere('majors_id', $majorId);
                });
            }

            if (!$courseId && $departmentId) {
                $query->where('department_id', $departmentId);
            }
        })
        ->get([
            'id',
            'curricula_id',
            'subject_id',
            'year_level_id',
            'semesters_id',
            'lec_unit',
            'lab_unit',
        ])
        : collect();

    $creditedSubjects = CreditedSubject::query()
        ->where('student_id', $student->id)
        ->with([
            'curriculumSubject' => function ($query) {
                $query->select('id', 'subject_id', 'lec_unit', 'lab_unit', 'year_level_id', 'semesters_id');
            },
            'curriculumSubject.subject:id,code,descriptive_title',
            'curriculumSubject.yearLevel:id,year_level',
            'curriculumSubject.semester:id,semester',
        ])
        ->orderByDesc('updated_at')
        ->get()
        ->map(function (CreditedSubject $record) {
            $curriculumSubject = $record->curriculumSubject;
            $subject = $curriculumSubject?->subject;

            $lec = (float) ($curriculumSubject->lec_unit ?? 0);
            $lab = (float) ($curriculumSubject->lab_unit ?? 0);

            return [
                'id' => $record->id,
                'curriculum_subject_id' => $record->curriculum_subject_id,
                'code' => $subject->code ?? '—',
                'title' => $subject->descriptive_title ?? 'Untitled subject',
                'units' => $lec + $lab ?: null,
                'credited_units' => $record->credited_units,
                'remarks' => $record->remarks,
                'year_level' => $curriculumSubject?->yearLevel?->year_level,
                'semester' => $curriculumSubject?->semester?->semester,
                'updated_at' => optional($record->updated_at)->toDateTimeString(),
            ];
        })
        ->values();

    $unenrolledHistory = $student->enrollments
        ->filter(function ($enrollment) {
            return strtolower($enrollment->status ?? '') === 'unenrolled';
        })
        ->map(function ($enrollment) {
            $subjects = $enrollment->enrollmentSubjects
                ->filter(function ($subject) {
                    $status = strtolower($subject->status ?? '');
                    return $status === 'dropped' || $subject->dropped_at;
                })
                ->map(function (EnrollmentSubject $subject) {
                    return $this->buildDroppedSubjectHistoryPayload($subject);
                })
                ->filter()
                ->values();

            if ($subjects->isEmpty()) {
                return null;
            }

            $semester = optional($enrollment->semester)->semester ?? 'Semester';
            $schoolYear = optional($enrollment->schoolYear)->school_year ?? 'School Year';

            return [
                'id' => $enrollment->id,
                'status' => $enrollment->status,
                'term_label' => trim($semester . ' (' . $schoolYear . ')'),
                'course' => optional($enrollment->course)?->only(['id', 'code', 'name']),
                'year_level' => optional($enrollment->yearLevel)->year_level,
                'section' => optional($enrollment->section)->section,
                'enrolled_at' => optional($enrollment->enrolled_at)?->toDateTimeString(),
                'subjects' => $subjects->toArray(),
            ];
        })
        ->filter()
        ->values();

    return Inertia::render('Registrar/Students/StudentRecord', [
        'student' => $student,
        'latestEnrollment' => $latestEnrollment,
        'requirementOptions' => $requirements,
        'dropWindowDays' => (int) config('enrollment.drop_window_days', 3),
        'availableSubjects' => $availableSubjects,
        'creditedSubjects' => $creditedSubjects,
        'unenrolledHistory' => $unenrolledHistory,
    ]);
}

protected function buildDroppedSubjectHistoryPayload(EnrollmentSubject $subject): array
{
    $curriculumSubject = $subject->curriculumSubject;
    $subjectMeta = $curriculumSubject?->subject
        ?? optional($subject->classSchedule?->curriculumSubject)->subject;

    $schedule = $subject->classSchedule;
    $faculty = $schedule?->faculty;

    return [
        'id' => $subject->id,
        'code' => $subjectMeta->code ?? '—',
        'title' => $subjectMeta->descriptive_title ?? 'Untitled subject',
        'status' => $subject->status,
        'drop_reason' => $subject->drop_reason,
        'dropped_at' => optional($subject->dropped_at)?->toDateTimeString(),
        'schedule' => $schedule ? [
            'schedule_day' => $schedule->schedule_day,
            'start_time' => $schedule->start_time,
            'end_time' => $schedule->end_time,
            'classroom' => $schedule->classroom ? [
                'room_number' => $schedule->classroom->room_number,
            ] : null,
        ] : null,
        'faculty' => $faculty ? [
            'id' => $faculty->id,
            'fName' => $faculty->fName,
            'lName' => $faculty->lName,
        ] : null,
    ];
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

public function showSubmittedReq()
{
    $students = Users::where('role', 'student')
        ->with([
            'studentRequirements.requirement:id,name,required_for',
        ])
        ->orderBy('lName')
        ->get([
            'id',
            'id_number',
            'fName',
            'mName',
            'lName',
            'profile_picture',
        ])
        ->map(function ($student) {
            $requirements = $student->studentRequirements ?? collect();
            $student->submitted_count = $requirements->where('is_submitted', true)->count();
            $student->total_requirements = $requirements->count();
            return $student;
        });

    $requirements = Requirement::orderBy('name')
        ->get(['id', 'name', 'required_for']);

    return Inertia::render('Registrar/Students/SubmittedRequirements', [
        'students' => $students,
        'requirements' => $requirements,
    ]);
}

public function storeStudentRequirement(Request $request)
{
    $validated = $request->validate([
        'student_id' => 'required|exists:users,id',
        'requirement_id' => 'required|exists:requirements,id',
        'image' => 'nullable|file|image|max:2048',
        'is_submitted' => 'nullable|boolean',
    ]);

    $payload = [
        'student_id' => $validated['student_id'],
        'requirement_id' => $validated['requirement_id'],
        'is_submitted' => $validated['is_submitted'] ?? false,
        'submitted_at' => ($validated['is_submitted'] ?? false) ? now() : null,
    ];

    if ($request->hasFile('image')) {
        $payload['image'] = $request->file('image')->store('requirements', 'public');
    }

    StudentRequirement::updateOrCreate(
        [
            'student_id' => $payload['student_id'],
            'requirement_id' => $payload['requirement_id'],
        ],
        $payload
    );

    return back()->with('success', 'Requirement record saved successfully.');
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


public function showApprovedGrades(Request $request)
{
    // Fetch all grades that are confirmed, regardless of semester
    $grades = Grades::with([
        'enrollment.student',          // student details
        'enrollment.course',           // course details
        'enrollment.yearLevel',        // year level
        'enrollmentSubject.subject',   // subject details
        'faculty'                      // faculty details
    ])
    ->where('final_status', 'confirmed')
    ->get();

    // Map grades for frontend
    $approvedGrades = $grades->map(function ($grade) {
        $student = $grade->enrollment->student ?? null;
        $faculty = $grade->faculty ?? null;
        $confirmedBy = $grade->confirmed_by ? Users::find($grade->confirmed_by) : null;

        return [
            'id'            => $grade->id,
            'student_name'  => $student ? $student->fName . ' ' . $student->lName : 'N/A',
            'student_id'    => $student ? $student->id_number : null, // <-- changed here
            'course'        => $grade->enrollment->course ? $grade->enrollment->course->code : 'N/A',
            'year_level'    => $grade->enrollment->yearLevel ? $grade->enrollment->yearLevel->year_level : 'N/A',
            'subject'       => $grade->enrollmentSubject && $grade->enrollmentSubject->subject
                                ? $grade->enrollmentSubject->subject->name
                                : 'N/A',
            'midterm'       => $grade->midterm,
            'final'         => $grade->final,
            'remarks'       => $grade->remarks,
            'midterm_status'=> $grade->midterm_status,
            'final_status'  => $grade->final_status,
            'faculty_name'  => $faculty ? $faculty->fName . ' ' . $faculty->lName : 'N/A',
            'confirmed_by'  => $confirmedBy ? $confirmedBy->fName . ' ' . $confirmedBy->lName : 'N/A',
            'confirmed_at'  => $grade->confirmed_at,
        ];
    });

    return Inertia::render('Registrar/Students/ApprovedGrades', [
        'approvedGrades' => $approvedGrades,
        'activeSemester' => null, // no longer needed
    ]);
}
// 📌 Show list of students with enrolled subjects + grades

public function studentList()
{
    $students = Users::where('role', 'student')
        ->with([
            'enrollments.course:id,code',
            'enrollments.yearLevel:id,year_level',
            'enrollments.semester:id,semester',
        ])
        ->orderBy('lName')
        ->get(['id','id_number','fName','mName','lName']);

    return Inertia::render('Registrar/Students/StudentGradesList', [
        'students' => $students,
    ]);
}

// 📌 Registrar: Show list of enrolled students
public function registrarStudentList()
{
    $students = Enrollments::with([
            'student:id,fName,mName,lName,id_number',
            'course:id,code',
            'yearLevel:id,year_level',
            'semester:id,semester',
            'schoolYear:id,school_year',
        ])
        ->where('status', 'enrolled')
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
        ->map(function ($enrollment) {
            $enrollment->school_year_label = optional($enrollment->schoolYear)->school_year;
            $enrollment->setRelation('schoolYear', null);
            return $enrollment;
        });

    return Inertia::render('Registrar/Students/StudentGradesList', [
        'students' => $students,
    ]);
}

// 📌 Registrar: Show single student with enrolled subjects + grades
public function registrarStudentGrades($id)
{
    $enrollment = Enrollments::with([
        'student:id,fName,mName,lName,id_number,email', // student details
        'course:id,code,name',
        'yearLevel:id,year_level',
        'section:id,section',
        'semester:id,semester',
        'schoolYear:id,school_year',
        'enrollmentSubjects.classSchedule.curriculumSubject.subject:id,code,descriptive_title',
        'enrollmentSubjects.classSchedule.yearLevel:id,year_level',   // ✅ add year level for grouping
        'enrollmentSubjects.classSchedule.semester:id,semester',     // ✅ add semester for grouping
    ])
        ->where('student_id', $id) // filter by student_id
        ->where('status', 'enrolled')
        ->firstOrFail();

    $subjects = $enrollment->enrollmentSubjects;

    $scheduleIds = $subjects->pluck('class_schedule_id')->filter()->unique();

    $grades = Grades::where('enrollment_id', $enrollment->id)
        ->whereIn('class_schedule_id', $scheduleIds)
        ->get()
        ->keyBy('class_schedule_id');

    $subjects->transform(function ($subject) use ($grades) {
        $grade = $grades->get($subject->class_schedule_id);
        $subject->setRelation('grades', $grade);
        return $subject;
    });

    $enrollment->setRelation('enrollmentSubjects', $subjects);

    return Inertia::render('Registrar/Students/GradesPage', [
        'student'          => $enrollment->student,             // ✅ Student details
        'course'           => $enrollment->course,              // ✅ Course
        'yearLevel'        => $enrollment->yearLevel,           // ✅ Parent Year level
        'section'          => $enrollment->section,             // ✅ Section
        'semester'         => $enrollment->semester,            // ✅ Parent Semester
        'schoolYear'       => $enrollment->schoolYear,          // ✅ School Year
        'enrolledSubjects' => $enrollment->enrollmentSubjects,  // ✅ Subjects (with year+semester inside classSchedule)
    ]);
}


public function dropEnrollmentSubject(Request $request, EnrollmentSubject $enrollmentSubject)
{
    $data = $request->validate([
        'reason' => ['required', 'string', 'max:500'],
    ]);

    $enrollmentSubject->loadMissing('enrollment');
    $enrollment = $enrollmentSubject->enrollment;

    if (!$enrollment) {
        return back()->with('error', 'Enrollment record not found for this subject.');
    }

    if ($enrollmentSubject->status === 'dropped') {
        return back()->with('success', 'Subject already dropped.');
    }

    $dropWindowDays = (int) config('enrollment.drop_window_days', 3);
    if ($dropWindowDays <= 0) {
        $dropWindowDays = 3;
    }

    $withinWindow = true;
    if ($enrollment->enrolled_at) {
        $deadline = Carbon::parse($enrollment->enrolled_at)->addDays($dropWindowDays);
        $withinWindow = now()->lessThanOrEqualTo($deadline);
    }

    $authUser = $request->user();
    $droppedById = null;

    if ($authUser) {
        $rawId = $authUser->id ?? $authUser->getAuthIdentifier();
        if (is_numeric($rawId)) {
            $droppedById = (int) $rawId;
        }
    }

    DB::transaction(function () use ($enrollmentSubject, $data, $droppedById) {
        $enrollmentSubject->update([
            'status' => 'dropped',
            'drop_reason' => $data['reason'],
            'dropped_at' => now(),
            'dropped_by' => $droppedById,
        ]);
    });

    \Log::info('Registrar dropped enrollment subject', [
        'enrollment_subject_id' => $enrollmentSubject->id,
        'enrollment_id' => $enrollment->id,
        'student_id' => $enrollment->student_id,
        'processed_by' => auth()->id(),
        'within_window' => $withinWindow,
    ]);

    return back()->with('success', 'Subject dropped successfully.');
}


public function undoDropEnrollmentSubject(Request $request, EnrollmentSubject $enrollmentSubject)
{
    $enrollmentSubject->loadMissing('enrollment');
    $enrollment = $enrollmentSubject->enrollment;

    if (!$enrollment) {
        return back()->with('error', 'Enrollment record not found for this subject.');
    }

    if ($enrollmentSubject->status !== 'dropped') {
        return back()->with('success', 'Subject is already active.');
    }

    DB::transaction(function () use ($enrollmentSubject) {
        $enrollmentSubject->update([
            'status' => 'enrolled',
            'drop_reason' => null,
            'dropped_at' => null,
            'dropped_by' => null,
        ]);
    });

    \Log::info('Registrar restored dropped enrollment subject', [
        'enrollment_subject_id' => $enrollmentSubject->id,
        'enrollment_id' => $enrollment->id,
        'student_id' => $enrollment->student_id,
        'processed_by' => auth()->id(),
    ]);

    return back()->with('success', 'Subject restored successfully.');
}


    private function formatScheduleLabel(?Class_Schedules $schedule): string
    {
        if (!$schedule) {
            return 'Schedule not set';
        }

        $day = $schedule->schedule_day ?? 'Day N/A';
        $start = $schedule->start_time ? Carbon::parse($schedule->start_time)->format('g:i A') : 'Start N/A';
        $end = $schedule->end_time ? Carbon::parse($schedule->end_time)->format('g:i A') : 'End N/A';
        $room = $schedule->classroom?->room_number ?? 'Room N/A';
        $faculty = $schedule->faculty
            ? trim(($schedule->faculty->lName ?? '') . ', ' . ($schedule->faculty->fName ?? ''))
            : null;

        return collect([
            sprintf('%s • %s - %s', $day, $start, $end),
            'Room ' . $room,
            $faculty ? 'Prof. ' . $faculty : null,
        ])->filter()->implode(' • ');
    }

    protected function buildStudentAcademicSnapshot(int $studentId): array
    {
        $snapshot = [
            'subjects' => [],
            'passed_subject_ids' => [],
            'error' => null,
        ];

        try {
            $student = Users::find($studentId);
            if (!$student) {
                $snapshot['error'] = 'Student not found';
                return $snapshot;
            }

            $grades = DB::table('grades')
                ->join('enrollments', 'grades.enrollment_id', '=', 'enrollments.id')
                ->join('curriculum_subject', 'grades.curriculum_subject_id', '=', 'curriculum_subject.id')
                ->leftJoin('subjects', 'curriculum_subject.subject_id', '=', 'subjects.id')
                ->where('enrollments.student_id', $studentId)
                ->select([
                    'grades.id',
                    'grades.final',
                    'grades.remarks',
                    'grades.updated_at as recorded_at',
                    'subjects.id as subject_id',
                    'curriculum_subject.lec_unit',
                    'curriculum_subject.lab_unit',
                ])
                ->get();

            foreach ($grades as $grade) {
                try {
                    $units = (float) ($grade->lec_unit ?? 0) + (float) ($grade->lab_unit ?? 0);
                    $isPassed = $this->isGradePassingForSnapshot($grade->final, $grade->remarks);

                    $snapshot['subjects'][] = [
                        'subject_id' => (int) $grade->subject_id,
                        'grade' => $grade->final,
                        'remarks' => $grade->remarks,
                        'is_passed' => $isPassed,
                        'units' => $units,
                        'recorded_at' => $grade->recorded_at,
                    ];

                    if ($isPassed && $grade->subject_id) {
                        $snapshot['passed_subject_ids'][] = (int) $grade->subject_id;
                    }
                } catch (\Throwable $e) {
                    \Log::warning('Failed processing grade for snapshot', [
                        'grade_id' => $grade->id ?? null,
                        'student_id' => $studentId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $snapshot['passed_subject_ids'] = array_values(array_unique($snapshot['passed_subject_ids']));
        } catch (\Throwable $e) {
            $snapshot['error'] = 'Unable to fetch academic snapshot.';
            \Log::error('Error building student academic snapshot', [
                'student_id' => $studentId,
                'error' => $e->getMessage(),
            ]);
        }

        return $snapshot;
    }

    protected function isGradePassingForSnapshot($grade, $remarks): bool
    {
        $remarksValue = strtolower($remarks ?? '');
        if (in_array($remarksValue, ['failed', 'dropped', 'incomplete'], true)) {
            return false;
        }

        if ($grade === null) {
            return false;
        }

        $gradeValue = (float) $grade;
        return $gradeValue > 0 && $gradeValue <= 3.0;
    }
}
