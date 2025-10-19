<?php

namespace App\Http\Controllers\ProgramHeadControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Enrollments;
use App\Models\Semester;
use App\Models\Section;
use App\Models\YearLevel;
use App\Models\Courses;
use App\Models\AcademicYear;
use App\Models\Requirement;
use App\Models\Users;
use App\Models\Student_Requirements;
use App\Models\EnrollmentSubject;
use App\Models\Class_Schedules;
use App\Models\Curriculum_Subject;
use App\Models\Curricula;
use App\Models\CreditedSubject;
use App\Models\PreRequisites;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class EvaluationEnrollmentController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        $semesters = Semester::where('is_active', 1)->get();
        $schoolYear = AcademicYear::where('is_active', 1)->first();
        $yearLevels = YearLevel::all();

        $sections = Section::where('department_id', $user->department_id)
            ->where('status', 1)
            ->with('yearLevel')
            ->get();

        $courses = Courses::where('department_id', $user->department_id)
            ->with('majors')
            ->get();

        $enrollments = Enrollments::with([
                'student',
                'section',
                'yearLevel',
                'course.majors'
            ])
            ->whereHas('course', function ($query) use ($user) {
                $query->where('department_id', $user->department_id);
            })
            ->get();

            $requirements = Requirement::where('status', 1)->get();

            return Inertia::render('ProgramHead/Evaluation/Enrollment', [
                'requirements' => $requirements,
                'enrollments'  => $enrollments,
                'semesters'    => $semesters,
                'sections'     => $sections,
                'yearLevels'   => $yearLevels,
                'courses'      => $courses,
                'schoolYear'   => $schoolYear,
            ]);
        }

    public function pending()
    {
        $user = Auth::user();

        $pendingEnrollments = Enrollments::with([
                'student',
                'section',
                'course',
                'yearLevel',
                'semester'
            ])
            ->where('status', 'pending')
            ->when($user && isset($user->department_id), function ($query) use ($user) {
                $query->whereHas('course', function ($courseQuery) use ($user) {
                    $courseQuery->where('department_id', $user->department_id);
                });
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Enrollments $enrollment) {
                $student = $enrollment->student;
                $course = $enrollment->course;
                $section = $enrollment->section;
                $yearLevel = $enrollment->yearLevel;
                $semester = $enrollment->semester;

                $studentName = trim(implode(' ', array_filter([
                    optional($student)->lName,
                    optional($student)->fName,
                    optional($student)->mName,
                ])));

                return [
                    'id' => $enrollment->id,
                    'student_name' => $studentName !== '' ? $studentName : 'Unnamed Student',
                    'student_number' => optional($student)->id_number,
                    'section' => optional($section)->section,
                    'course' => optional($course)->code ?? optional($course)->name,
                    'year_level' => optional($yearLevel)->year_level,
                    'semester' => optional($semester)->semester,
                    'submitted_at' => optional($enrollment->created_at)?->toDateTimeString(),
                ];
            });

        return Inertia::render('ProgramHead/Evaluation/PendingEnrollments', [
            'pendingEnrollments' => $pendingEnrollments,
        ]);
    }

        /**
         * 🔍 AJAX: Check if student already exists by ID number
         */
        public function checkStudent(Request $request)
        {
            $request->validate([
                'id_number' => 'required|string',
            ]);

            $student = Users::where('id_number', $request->id_number)->first();

    if ($student) {
        return response()->json([
            'exists'  => true,
            'student' => [
                'fName' => $student->fName,
                'mName' => $student->mName,
                'lName' => $student->lName,
                'suffix' => $student->suffix,
                'date_of_birth' => $student->date_of_birth,
                'gender' => $student->gender,
                'email' => $student->email,
                'contact_no' => $student->contact_no,
                'address' => $student->address,
            ],
        ]);
    }
        return response()->json(['exists' => false]);
    }

    public function checkEmail(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'id_number' => 'nullable|string',
        ]);

        $query = Users::where('email', $validated['email']);

        if (!empty($validated['id_number'])) {
            $query->where('id_number', '!=', $validated['id_number']);
        }

        $exists = $query->exists();

        return response()->json(['exists' => $exists]);
    }

    public function checkCurriculum(Request $request)
    {
        $validated = $request->validate([
            'course_id' => 'required|integer',
            'major_id' => 'nullable|integer',
        ]);

        $curriculumQuery = Curricula::where('courses_id', $validated['course_id']);

        if (array_key_exists('major_id', $validated)) {
            if ($validated['major_id']) {
                $curriculumQuery->where(function ($query) use ($validated) {
                    $query->where('majors_id', $validated['major_id'])
                        ->orWhereNull('majors_id');
                });
            } else {
                $curriculumQuery->whereNull('majors_id');
            }
        }

        $hasCurriculum = $curriculumQuery->exists();

        return response()->json(['has_curriculum' => $hasCurriculum]);
    }

   public function showSubjectLoad($enrollmentId)
{
    \Log::info("showSubjectLoad called for enrollment ID: {$enrollmentId}");

    $loadError = null;
    $loadWarning = null;
    $enrollmentData = null;
    $student = null;
    $curriculumSubjects = [];
    $creditedSubjects = [];
    $creditedSubjectDetails = [];
    $creditCatalog = [];
    $preselectedSubjects = [];

    try {
        $enrollment = Enrollments::with([
            'student',
            'course.curriculum',
            'course.curriculum.curriculumSubjects.subject',
            'course.curriculum.curriculumSubjects.prerequisites.subject',
            'course.curriculum.curriculumSubjects.classSchedules.faculty',
            'course.curriculum.curriculumSubjects.classSchedules.classroom',
            'course.curriculum.curriculumSubjects.classSchedules.section.yearLevel',
            'yearLevel',
            'semester',
            'section',
        ])->findOrFail($enrollmentId);

        $student = $enrollment->student;

        $creditedRecords = CreditedSubject::where('student_id', $enrollment->student_id)->get();
        $creditedCurriculumSubjectIds = $creditedRecords
            ->pluck('curriculum_subject_id')
            ->map(function ($id) {
                return (int) $id;
            });
        $creditedSubjects = $creditedCurriculumSubjectIds->toArray();
        $creditedSubjectDetails = $creditedRecords
            ->mapWithKeys(function ($record) {
                return [
                    $record->curriculum_subject_id => [
                        'credited_units' => $record->credited_units,
                        'remarks'        => $record->remarks,
                    ],
                ];
            })
            ->toArray();

        $curriculum = optional($enrollment->course)->curriculum;
        $activeSemester = \App\Models\Semester::where('is_active', true)->first();

        if (!$curriculum) {
            $loadWarning = 'No curriculum assigned to this program yet. Subject list may be empty.';
        }

        if (!$activeSemester) {
            $additional = 'No active semester configured. Subject list may be empty.';
            $loadWarning = $loadWarning ? ($loadWarning . ' ' . $additional) : $additional;
        }

        $failedCurriculumSubjectIds = collect();
        $failedCurriculumSubjects = collect();
        $hasFailing = false;

        if ($curriculum && $activeSemester) {
            $failedGradeRows = DB::table('grades')
                ->join('enrollments as e', 'grades.enrollment_id', '=', 'e.id')
                ->leftJoin('class_schedules as cs', 'grades.class_schedule_id', '=', 'cs.id')
                ->where('e.student_id', $enrollment->student_id)
                ->select([
                    'grades.grade',
                    'grades.midterm',
                    'grades.final',
                    'grades.remarks',
                    'cs.curriculum_subject_id',
                ])
                ->get();

            $failedCurriculumSubjectIds = $failedGradeRows
                ->filter(function ($row) {
                    $remarks = strtolower($row->remarks ?? '');
                    if (in_array($remarks, ['failed', 'incomplete', 'dropped'])) {
                        return true;
                    }

                    $grade = is_numeric($row->grade) ? (float) $row->grade : null;
                    $midterm = is_numeric($row->midterm) ? (float) $row->midterm : null;
                    $final = is_numeric($row->final) ? (float) $row->final : null;

                    $computed = null;

                    if ($midterm !== null && $final !== null) {
                        $computed = ($midterm + $final) / 2;
                    } elseif ($grade !== null) {
                        $computed = $grade;
                    }

                    if ($computed === null) {
                        return false;
                    }

                    return $computed > 3.0;
                })
                ->pluck('curriculum_subject_id')
                ->filter()
                ->map(function ($id) {
                    return (int) $id;
                })
                ->unique()
                ->values();

            $hasFailing = $failedCurriculumSubjectIds->isNotEmpty();

            if ($hasFailing) {
                $failedCurriculumSubjects = Curriculum_Subject::with([
                        'subject',
                        'semester',
                        'yearLevel',
                        'classSchedules.faculty',
                        'classSchedules.classroom',
                        'classSchedules.section.yearLevel',
                    ])
                    ->whereIn('id', $failedCurriculumSubjectIds)
                    ->get()
                    ->keyBy('id');
            }

            $curriculumSubjectsCollection = $curriculum->curriculumSubjects
                ->where('year_level_id', $enrollment->year_level_id)
                ->where('semesters_id', $activeSemester->id)
                ->map(function ($subj) use ($enrollment, $failedCurriculumSubjectIds, $activeSemester) {
                    $filteredSchedules = $subj->classSchedules
                        ->filter(function ($sched) use ($enrollment, $activeSemester) {
                            if ($activeSemester && (int) $sched->semester_id !== (int) $activeSemester->id) {
                                return false;
                            }

                            if ($enrollment && (int) $sched->school_year_id !== (int) $enrollment->school_year_id) {
                                return false;
                            }

                            return true;
                        });

                    $scheduleCollection = $filteredSchedules->map(function ($sched) {
                        return [
                            'id'             => $sched->id,
                            'start_time'     => $sched->start_time,
                            'end_time'       => $sched->end_time,
                            'schedule_day'   => $sched->schedule_day,
                            'curriculum_subject_id' => $sched->curriculum_subject_id,
                            'faculty_id'     => $sched->faculty_id,
                            'classroom_id'   => $sched->classroom_id,
                            'school_year_id' => $sched->school_year_id,
                            'semester_id'    => $sched->semester_id,
                            'section_id'     => $sched->section_id,
                            'schedule_group' => $sched->schedule_group,
                            'courses_id'     => $sched->courses_id,
                            'year_level_id'  => $sched->year_level_id,
                            'faculty_name'   => $sched->faculty?->fName . ' ' . $sched->faculty?->lName,
                            'classroom'      => $sched->classroom?->room_number,
                            'section'        => $sched->section?->section,
                            'year'           => $sched->section?->yearLevel?->year_level,
                        ];
                    });

                    $sectionSchedules = $scheduleCollection
                        ->filter(function ($sched) use ($enrollment) {
                            return (int) $sched['section_id'] === (int) $enrollment->section_id;
                        })
                        ->values();

                    $isFailed = $failedCurriculumSubjectIds->contains($subj->id);
                    $hasSectionSchedules = $sectionSchedules->isNotEmpty();
                    $usesCrossSection = false;

                    $prerequisiteIds = $subj->prerequisites
                        ->pluck('id')
                        ->map(function ($id) {
                            return (int) $id;
                        });

                    $failedPrerequisiteIds = $failedCurriculumSubjectIds
                        ->intersect($prerequisiteIds)
                        ->values();

                    $hasFailedPrerequisites = $failedPrerequisiteIds->isNotEmpty();

                    if ($isFailed && !$hasSectionSchedules && $scheduleCollection->isNotEmpty()) {
                        $sectionSchedules = $scheduleCollection->values();
                        $usesCrossSection = true;
                    }

                    return [
                        'id'                   => $subj->id,
                        'subject_id'           => $subj->subject_id,
                        'subject'              => $subj->subject,
                        'semesters_id'         => $subj->semesters_id,
                        'semester'             => $subj->semester,
                        'year_level_id'        => $subj->year_level_id,
                        'year_level'           => $subj->yearLevel,
                        'lec_unit'             => $subj->lec_unit,
                        'lab_unit'             => $subj->lab_unit,
                        'type'                 => $subj->type,
                        'schedules'            => $sectionSchedules->toArray(),
                        'has_any_schedules'    => $scheduleCollection->isNotEmpty(),
                        'has_section_schedules'=> $hasSectionSchedules,
                        'is_failed'            => $isFailed,
                        'uses_cross_section'   => $usesCrossSection,
                        'source_year_level'    => optional($subj->yearLevel)->year_level,
                        'source_semester'      => optional($subj->semester)->semester,
                        'has_failed_prerequisites' => $hasFailedPrerequisites,
                        'failed_prerequisite_ids'  => $failedPrerequisiteIds->toArray(),
                        'prerequisite_subject_ids' => $prerequisiteIds->toArray(),
                    ];
                })
                ->values();

            $curriculumSubjects = $curriculumSubjectsCollection;

            if ($hasFailing) {
                $missingRetakes = $failedCurriculumSubjects
                    ->reject(function ($subj) use ($curriculumSubjectsCollection) {
                        return $curriculumSubjectsCollection->contains('id', $subj->id);
                    })
                    ->values();

                if ($missingRetakes->isNotEmpty()) {
                    $retakeSubjects = $missingRetakes->map(function ($subj) use ($enrollment, $failedCurriculumSubjectIds, $activeSemester) {
                        $filteredSchedules = $subj->classSchedules
                            ->filter(function ($sched) use ($enrollment, $activeSemester) {
                                if ($activeSemester && (int) $sched->semester_id !== (int) $activeSemester->id) {
                                    return false;
                                }

                                if ($enrollment && (int) $sched->school_year_id !== (int) $enrollment->school_year_id) {
                                    return false;
                                }

                                return true;
                            });

                        $scheduleCollection = $filteredSchedules->map(function ($sched) {
                            return [
                                'id'             => $sched->id,
                                'start_time'     => $sched->start_time,
                                'end_time'       => $sched->end_time,
                                'schedule_day'   => $sched->schedule_day,
                                'curriculum_subject_id' => $sched->curriculum_subject_id,
                                'faculty_id'     => $sched->faculty_id,
                                'classroom_id'   => $sched->classroom_id,
                                'school_year_id' => $sched->school_year_id,
                                'semester_id'    => $sched->semester_id,
                                'section_id'     => $sched->section_id,
                                'schedule_group' => $sched->schedule_group,
                                'courses_id'     => $sched->courses_id,
                                'year_level_id'  => $sched->year_level_id,
                                'faculty_name'   => $sched->faculty?->fName . ' ' . $sched->faculty?->lName,
                                'classroom'      => $sched->classroom?->room_number,
                                'section'        => $sched->section?->section,
                                'year'           => $sched->section?->yearLevel?->year_level,
                            ];
                        });

                        $prerequisiteIds = $subj->prerequisites
                            ->pluck('id')
                            ->map(function ($id) {
                                return (int) $id;
                            });

                        $failedPrerequisiteIds = $failedCurriculumSubjectIds
                            ->intersect($prerequisiteIds)
                            ->values();

                        return [
                            'id'                   => $subj->id,
                            'subject_id'           => $subj->subject_id,
                            'subject'              => $subj->subject,
                            'semesters_id'         => $subj->semesters_id,
                            'semester'             => $subj->semester,
                            'year_level_id'        => $subj->year_level_id,
                            'year_level'           => $subj->yearLevel,
                            'lec_unit'             => $subj->lec_unit,
                            'lab_unit'             => $subj->lab_unit,
                            'type'                 => $subj->type,
                            'schedules'            => $scheduleCollection->values()->toArray(),
                            'has_any_schedules'    => $scheduleCollection->isNotEmpty(),
                            'has_section_schedules'=> false,
                            'is_failed'            => true,
                            'uses_cross_section'   => true,
                            'source_year_level'    => optional($subj->yearLevel)->year_level,
                            'source_semester'      => optional($subj->semester)->semester,
                            'is_backtrack'         => true,
                            'has_failed_prerequisites' => $failedPrerequisiteIds->isNotEmpty(),
                            'failed_prerequisite_ids'  => $failedPrerequisiteIds->toArray(),
                            'prerequisite_subject_ids' => $prerequisiteIds->toArray(),
                        ];
                    });

                    $curriculumSubjects = $curriculumSubjects->concat($retakeSubjects);
                }
            }

            $curriculumSubjects = $curriculumSubjects->values()->toArray();

            $creditCatalog = $curriculum->curriculumSubjects
                ->map(function ($subj) {
                    return [
                        'id'             => $subj->id,
                        'subject_id'     => $subj->subject_id,
                        'subject'        => $subj->subject,
                        'semesters_id'   => $subj->semesters_id,
                        'semester'       => $subj->semester,
                        'year_level_id'  => $subj->year_level_id,
                        'year_level'     => $subj->yearLevel,
                        'lec_unit'       => $subj->lec_unit,
                        'lab_unit'       => $subj->lab_unit,
                        'policy'         => $subj->policy ?? null,
                    ];
                })
                ->groupBy('year_level_id')
                ->map(function ($items, $yearLevelId) {
                    $first = $items->first();
                    return [
                        'year_level_id'   => $yearLevelId,
                        'year_level_name' => optional($first['year_level'])->year_level ?? 'N/A',
                        'subjects'        => $items->map(function ($item) {
                            return [
                                'id'           => $item['id'],
                                'semesters_id' => $item['semesters_id'],
                                'semester'     => optional($item['semester'])->semester ?? null,
                                'subject'      => $item['subject'],
                                'lec_unit'     => $item['lec_unit'],
                                'lab_unit'     => $item['lab_unit'],
                                'policy'       => $item['policy'],
                            ];
                        })->values(),
                    ];
                })
                ->values()
                ->toArray();

            foreach ($curriculumSubjects as $subj) {
                $hasFailedPrereq = $subj['has_failed_prerequisites'] ?? false;
                $isFailedSubject = $subj['is_failed'] ?? false;
                $isBacktrackSubject = $subj['is_backtrack'] ?? false;

                if ($hasFailedPrereq || $isFailedSubject || $isBacktrackSubject) {
                    continue;
                }

                if (!empty($subj['schedules'])) {
                    foreach ($subj['schedules'] as $sched) {
                        $preselectedSubjects[] = $sched['id'];
                    }
                } else {
                    $preselectedSubjects[] = $subj['id'];
                }
            }
        }

        $enrollmentData = [
            'id'             => $enrollment->id,
            'first_name'     => $student?->fName,
            'middle_name'    => $student?->mName,
            'last_name'      => $student?->lName,
            'program_name'   => $enrollment->course->name ?? 'N/A',
            'year_level_name'=> optional($enrollment->yearLevel)->year_level,
            'semester_name'  => $activeSemester->semester ?? 'N/A',
            'section_id'     => $enrollment->section_id,
            'section_name'   => optional($enrollment->section)->section,
        ];
    } catch (\Exception $e) {
        \Log::error("Error in showSubjectLoad: " . $e->getMessage());
        $loadError = 'Failed to load subjects. Please try again or contact support.';
    }

    return Inertia::render('ProgramHead/Evaluation/SubjectLoad', [
        'enrollment'          => $enrollmentData,
        'student'             => $student,
        'availableSubjects'   => $curriculumSubjects,
        'creditedSubjects'    => $creditedSubjects,
        'creditedSubjectInfo' => $creditedSubjectDetails,
        'creditCatalog'       => $creditCatalog,
        'preselectedSubjects' => $preselectedSubjects,
        'loadWarning'         => $loadWarning,
        'loadError'           => $loadError,
    ]);
}


    public function fetchCurriculumSubjectsByYearAndSemester(Request $request)
    {
        $validated = $request->validate([
            'curriculum_id' => 'required|exists:curricula,id',
        ]);

        $curriculum = Curricula::with([
            'curriculumSubjects.subject',
            'curriculumSubjects.yearLevel',
            'curriculumSubjects.semester',
        ])->findOrFail($validated['curriculum_id']);

        $grouped = $curriculum->curriculumSubjects
            ->sortBy(function ($item) {
                $year = $item->year_level_id ?? 0;
                $semester = $item->semesters_id ?? 0;
                $code = optional($item->subject)->code ?? '';
                return sprintf('%03d-%03d-%s', $year, $semester, $code);
            })
            ->groupBy(function ($item) {
                return optional($item->yearLevel)->year_level ?? 'Unassigned Year Level';
            })
            ->map(function ($items, $label) {
                $yearLevelItem = $items->first();
                $semesters = $items
                    ->groupBy(function ($item) {
                        return optional($item->semester)->semester ?? 'Unassigned Semester';
                    })
                    ->map(function ($semesterItems, $semesterLabel) {
                        $semesterItem = $semesterItems->first();
                        $subjects = $semesterItems->map(function ($subject) {
                            $subjectModel = optional($subject->subject);
                            return [
                                'id' => $subject->id,
                                'subject_id' => $subject->subject_id,
                                'code' => $subjectModel->code,
                                'descriptive_title' => $subjectModel->descriptive_title,
                                'lec_unit' => $subject->lec_unit,
                                'lab_unit' => $subject->lab_unit,
                                'type' => $subject->type,
                            ];
                        })->values();

                        return [
                            'semester_id' => optional($semesterItem->semester)->id,
                            'semester_name' => $semesterLabel,
                            'subjects' => $subjects,
                        ];
                    })
                    ->sortBy(function ($semester) {
                        return $semester['semester_id'] ?? 0;
                    })
                    ->values();

                return [
                    'year_level_id' => optional($yearLevelItem)->year_level_id,
                    'year_level_name' => $label,
                    'semesters' => $semesters,
                ];
            })
            ->sortBy(function ($yearGroup) {
                return $yearGroup['year_level_id'] ?? 0;
            })
            ->values()
            ->toArray();

        return response()->json([
            'success' => true,
            'data' => $grouped,
        ]);
    }




    /**
     * 📌 Step 1: Submit Enrollment Form
     */
    public function submitEnrollment(Request $request)
    {
        // ✅ Validation (remove unique rules because we allow existing student update)
        $validated = $request->validate([
            'id_number'  => 'required|string',
            'first_name' => 'required|string|max:255',
            'middle_name'=> 'nullable|string|max:255',
            'last_name'  => 'required|string|max:255',
            'suffix'     => 'nullable|string|max:50',
            'dob'        => 'required|date',
            'gender'     => 'required|in:male,female,other',
            'email'      => 'required|email',
            'contact'    => 'nullable|string|max:20',
            'address'    => 'nullable|string|max:255',

            'type'       => 'required|in:Freshman,Transferee,Shiftee,Returnee,Old',
            'program'    => 'required|exists:courses,id',
            'year_level' => 'required|exists:year_levels,id',
            'semester'   => 'required|exists:semesters,id',
            'section'    => 'required|exists:sections,id',
            'major'      => 'nullable|exists:majors,id',
        ]);

        // ✅ Step 2: Create or Update User (student)
        $student = Users::updateOrCreate(
            ['id_number' => $validated['id_number']],
            [
                'fName'       => $validated['first_name'],
                'mName'       => $validated['middle_name'],
                'lName'       => $validated['last_name'],
                'suffix'      => $validated['suffix'] ?? null,
                'date_of_birth' => $validated['dob'],
                'gender'      => $validated['gender'],
                'email'       => $validated['email'],
                'contact'     => $validated['contact'],
                'address'     => $validated['address'],
                'role'        => 'student',
            ]
        );

        // ✅ Step 3: Fetch Active School Year
        $schoolYear = AcademicYear::where('is_active', 1)->first();
        if (!$schoolYear) {
            return back()->withErrors(['school_year' => 'No active school year found.']);
        }

        // ✅ Step 4: Create Enrollment
        $enrollment = Enrollments::create([
            'student_id'     => $student->id,
            'courses_id'     => $validated['program'],
            'majors_id'      => $validated['major'] ?? null,
            'year_level_id'  => $validated['year_level'],
            'semester_id'    => $validated['semester'],
            'section_id'     => $validated['section'],
            'school_year_id' => $schoolYear->id,
            'status'         => 'pending',
            'student_type'   => $validated['type'],
            'enrolled_at'    => now(),
        ]);

        // ✅ Step 5: Store uploaded requirements
        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $requirementId => $file) {
                $path = $file->store('requirements', 'public');

                Student_Requirements::updateOrCreate(
                    [
                        'student_id'     => $student->id,
                        'requirement_id' => $requirementId,
                    ],
                    [
                        'is_submitted' => true,
                        'submitted_at' => now(),
                        'image'        => $path,
                    ]
                );
            }
        }

        // ✅ Step 6: Flash redirect URL so frontend can navigate after request
        return back()->with([
            'redirect_enrollment_id' => $enrollment->id,
            'success' => 'Enrollment submitted successfully!',
        ]);
    }

    /**
 * 📌 Step 2: Store Subject Load with prerequisite check
 */
public function storeSubjectLoad(Request $request)
{
    $request->validate([
        'enrollment_id' => 'required|exists:enrollments,id',
        'class_schedule_ids' => 'required|array',
        'class_schedule_ids.*' => 'exists:class_schedules,id',
    ]);

    $enrolled = [];
    $failed = [];

    DB::beginTransaction();
    try {
        foreach ($request->class_schedule_ids as $scheduleId) {
            $classSchedule = Class_Schedules::findOrFail($scheduleId);
            $curriculumSubjectId = $classSchedule->curriculum_subject_id;

            // 🔎 Check prerequisites
            $check = $this->checkPrerequisites($request->enrollment_id, $curriculumSubjectId);

            if ($check !== true) {
                // add to failed list, don’t stop
                $failed[] = "{$classSchedule->subject->descriptive_title}: {$check}";
                continue;
            }

            // 🔎 Avoid duplicate entry
            $exists = EnrollmentSubject::where('enrollment_id', $request->enrollment_id)
                ->where('class_schedule_id', $scheduleId)
                ->exists();

            if (!$exists) {
                EnrollmentSubject::create([
                    'enrollment_id'     => $request->enrollment_id,
                    'class_schedule_id' => $scheduleId,
                ]);
                $enrolled[] = $classSchedule->subject->descriptive_title;
            }
        }

        DB::commit();

        // 🎉 Success + warnings
        $message = "Subjects loaded successfully.";
        if (count($failed) > 0) {
            $message .= " However, some subjects could not be enrolled: " . implode(', ', $failed);
            return redirect()->route('program-head.enrollment.index')->with('warning', $message);
        }

        return redirect()->route('program-head.enrollment.index')->with('success', $message);

    } catch (\Exception $e) {
        DB::rollBack();
        return redirect()
            ->route('program-head.enrollment.index')
            ->with('error', 'Failed to load subjects: ' . $e->getMessage());
    }
}


public function getGrades($enrollmentId)
{
    try {
        $enrollmentRecord = Enrollments::with('student')->find($enrollmentId);

        if (!$enrollmentRecord) {
            return response()->json([
                'success' => false,
                'message' => 'Enrollment record not found.',
            ], 404);
        }

        $studentId = $enrollmentRecord->student_id;

        $enrollments = Enrollments::with([
            'enrollmentSubjects.classSchedule.faculty',
            'enrollmentSubjects.classSchedule.subject',
            'yearLevel',
            'semester'
        ])->where('student_id', $studentId)->get();

        $grades = [];

        foreach ($enrollments as $enrollment) {
            $yearLevel = $enrollment->yearLevel->year_level ?? 'Unknown Year';
            $semester  = $enrollment->semester->semester ?? 'Unknown Semester';

            $grades[$yearLevel] ??= [];
            $grades[$yearLevel][$semester] ??= [];

            foreach ($enrollment->enrollmentSubjects as $es) {
                $faculty = $es->classSchedule?->faculty;

                $facultyName = $faculty
                    ? trim(implode(' ', array_filter([$faculty->fName, $faculty->mName, $faculty->lName])))
                    : 'No Faculty Assigned';

                // Fetch the grade dynamically from grades table
                $gradeRecord = \App\Models\Grades::where('enrollment_id', $enrollment->id)
                                ->where('class_schedule_id', $es->classSchedule->id)
                                ->first();

                $midterm = is_numeric($gradeRecord?->midterm) ? (float) $gradeRecord->midterm : null;
                $final   = is_numeric($gradeRecord?->final)   ? (float) $gradeRecord->final   : null;

                $cumulative = is_numeric($gradeRecord?->grade)
                    ? (float) $gradeRecord->grade
                    : (!is_null($midterm) && !is_null($final) ? ($midterm + $final) / 2 : null);

                $grades[$yearLevel][$semester][] = [
                    'enrollment_id' => $enrollment->id,
                    'faculty_id'    => $faculty?->id,
                    'faculty_name'  => $facultyName,
                    'faculty_fName' => $faculty?->fName,
                    'faculty_mName' => $faculty?->mName,
                    'faculty_lName' => $faculty?->lName,
                    'subject_id'    => $es->classSchedule->subject->id ?? null,
                    'subject_code'  => $es->classSchedule->subject->code ?? null,
                    'subject_title' => $es->classSchedule->subject->descriptive_title ?? null,
                    'midterm'       => $midterm,
                    'final'         => $final,
                    'grade'         => $cumulative !== null ? round($cumulative, 2) : null,
                    'remarks'       => $gradeRecord?->remarks,
                ];
            }
        }

        \Log::info("Grades fetched for enrollment {$enrollmentId} / student {$studentId}:", $grades);

        return response()->json([
            'success' => true,
            'grades'  => $grades,
        ]);
    } catch (\Exception $e) {
        \Log::error("Failed to fetch grades for student {$studentId}: {$e->getMessage()}");

        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch grades.',
        ], 500);
    }
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * 🔒 Check if student can enroll in a subject based on prerequisites
 *
 * @param int $studentId
 * @param int $curriculumSubjectId
 * @return bool|string Returns true if allowed, otherwise returns the prerequisite subject title that failed
 */
public function checkPrerequisites(int $studentId, int $curriculumSubjectId)
{
    // Fetch all prerequisites for this curriculum subject
    $prerequisites = PreRequisites::where('curriculum_subject_id', $curriculumSubjectId)
        ->with('prerequisite.subject')
        ->get();

    if ($prerequisites->isEmpty()) {
        return true; // No prerequisites, student can enroll
    }

    foreach ($prerequisites as $prereq) {
        // Get the prerequisite subject's class schedules
        $classScheduleIds = \App\Models\Class_Schedules::where('curriculum_subject_id', $prereq->prerequisite_subject_id)->pluck('id');

        // Check student's enrollment in this prerequisite
        $enrollmentSubject = EnrollmentSubject::whereIn('class_schedule_id', $classScheduleIds)
            ->whereHas('enrollment', function ($query) use ($studentId) {
                $query->where('student_id', $studentId);
            })
            ->orderByDesc('enrollment_id')
            ->first();

        if (!$enrollmentSubject) {
            return $prereq->prerequisite->descriptive_title . " not taken yet";
        }

        // Fetch grade for prerequisite
        $gradeRecord = \App\Models\Grades::where('enrollment_id', $enrollmentSubject->enrollment_id)
                                         ->where('class_schedule_id', $enrollmentSubject->class_schedule_id)
                                         ->first();

        $midterm = is_numeric($gradeRecord?->midterm) ? (float) $gradeRecord->midterm : null;
        $final   = is_numeric($gradeRecord?->final) ? (float) $gradeRecord->final : null;
        $grade   = is_numeric($gradeRecord?->grade) ? (float) $gradeRecord->grade : null;

        $computed = null;
        if ($midterm !== null && $final !== null) {
            $computed = ($midterm + $final) / 2;
        } elseif ($grade !== null) {
            $computed = $grade;
        }

        if ($computed !== null && $computed > 3.0) {
            return ($prereq->prerequisite->descriptive_title ?? 'Prerequisite') . ' failed';
        }
    }

    return true; // All prerequisites passed
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
public function showCreditingSubjects($enrollmentId)
{
    try {
        // 🔹 Get enrollment with all related data
        $enrollment = Enrollments::with([
            'student',
            'course',
            'course.department',
            'yearLevel',
            'semester',
            'course.curriculum.curriculumSubjects.subject',
            'course.curriculum.curriculumSubjects.yearLevel',
            'course.curriculum.curriculumSubjects.semester',
        ])->findOrFail($enrollmentId);

        $student = $enrollment->student;
        $curriculum = optional($enrollment->course)->curriculum;

        if (!$curriculum) {
            return redirect()->back()->with('error', 'This course has no curriculum assigned.');
        }

        // 🔹 Fetch credited subjects of the student
        $credited = CreditedSubject::where('student_id', $student->id)->get()
            ->mapWithKeys(function ($c) {
                return [
                    $c->curriculum_subject_id => [
                        'credited_units' => $c->credited_units,
                        'remarks'        => $c->remarks,
                    ],
                ];
            });

        // 🔹 Group curriculum subjects by year level
        $groupedSubjects = $curriculum->curriculumSubjects
            ->map(function ($subj) use ($credited) {
                $isCredited = $credited->has($subj->id);
                return [
                    'id'              => $subj->id,
                    'subject_code'    => $subj->subject->code ?? '',
                    'subject_title'   => $subj->subject->descriptive_title ?? '',
                    'lec_unit'        => $subj->lec_unit ?? 0,
                    'lab_unit'        => $subj->lab_unit ?? 0,
                    'total_units'     => ($subj->lec_unit ?? 0) + ($subj->lab_unit ?? 0),
                    'semester'        => optional($subj->semester)->semester ?? 'N/A',
                    'year_level'      => optional($subj->yearLevel)->year_level ?? 'N/A',
                    'is_credited'     => $isCredited,
                    'credited_units'  => $isCredited ? $credited[$subj->id]['credited_units'] : null,
                    'remarks'         => $isCredited ? $credited[$subj->id]['remarks'] : null,
                ];
            })
            ->groupBy('year_level')
            ->map(function ($subjects, $yearLevel) {
                return [
                    'year_level' => $yearLevel,
                    'subjects'   => $subjects->values(),
                ];
            })
            ->values()
            ->toArray();

        $enrollmentSummary = [
            'id' => $enrollment->id,
            'program_name' => optional($enrollment->course)->name ?? '—',
            'program_code' => optional($enrollment->course)->code ?? null,
            'department_name' => optional(optional($enrollment->course)->department)->department ?? null,
            'year_level_name' => optional($enrollment->yearLevel)->year_level ?? '—',
            'semester_name' => optional($enrollment->semester)->semester ?? '—',
        ];

        $studentData = $student ? [
            'id' => $student->id,
            'fName' => $student->fName,
            'mName' => $student->mName,
            'lName' => $student->lName,
            'suffix' => $student->suffix,
        ] : [];

        // 🔹 Pass data to Inertia
        return Inertia::render('ProgramHead/Evaluation/CreditingSubjects', [
            'student'        => $studentData,
            'enrollment'     => $enrollmentSummary,
            'groupedSubjects'=> $groupedSubjects,
        ]);
    } catch (\Exception $e) {
        \Log::error("Error in showCreditingSubjects: " . $e->getMessage());
        return redirect()->back()->with('error', 'Failed to load subjects for crediting.');
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

public function storeCreditedSubjects(Request $request)
{
    $request->validate([
        'enrollment_id' => 'required|exists:enrollments,id',
        'subjects'      => 'required|array',
        'subjects.*.curriculum_subject_id' => 'required|exists:curriculum_subject,id',
        'subjects.*.credited_units'       => 'required|numeric|min:0',
        'subjects.*.remarks'              => 'nullable|string|max:255',
    ]);

    $enrollment = Enrollments::findOrFail($request->enrollment_id);

    DB::beginTransaction();
    try {
        foreach ($request->subjects as $subj) {
            // Avoid duplicate credited entries
            $existing = CreditedSubject::where('student_id', $enrollment->student_id)
                ->where('curriculum_subject_id', $subj['curriculum_subject_id'])
                ->first();

            if ($existing) {
                $existing->update([
                    'credited_units' => $subj['credited_units'],
                    'remarks'        => $subj['remarks'] ?? null,
                ]);
            } else {
                CreditedSubject::create([
                    'student_id'           => $enrollment->student_id,
                    'curriculum_subject_id'=> $subj['curriculum_subject_id'],
                    'credited_units'       => $subj['credited_units'],
                    'remarks'              => $subj['remarks'] ?? null,
                ]);
            }
        }

        DB::commit();

        return redirect()->back()->with('success', 'Credited subjects saved successfully.');

    } catch (\Exception $e) {
        DB::rollBack();
        \Log::error("Failed to save credited subjects for enrollment {$enrollment->id}: " . $e->getMessage());

        return redirect()->back()->with('error', 'Failed to save credited subjects.');
    }
}

}
