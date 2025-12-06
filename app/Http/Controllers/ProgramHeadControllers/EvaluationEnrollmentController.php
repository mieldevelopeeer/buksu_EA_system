<?php

namespace App\Http\Controllers\ProgramHeadControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Enrollments;
use App\Models\EnrollmentPeriod;
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
use App\Models\Grades;
use App\Models\PreRequisites;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class EvaluationEnrollmentController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        $semesters = Semester::where('is_active', 1)
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->limit(1)
            ->get();
        $schoolYear = AcademicYear::where('is_active', 1)->first();
        $today = Carbon::today();

        $activeEnrollmentPeriod = EnrollmentPeriod::with(['schoolYear', 'semester'])
            ->where('status', 'Open')
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->orderByDesc('start_date')
            ->first();

        $yearLevels = YearLevel::all();

        $activeEnrollmentStatuses = ['pending', 'enrolled', 'approved', 'confirmed'];

        // Get the current semester and school year for filtering
        $currentSemester = $semesters->first();
        $currentSchoolYear = $schoolYear;

        $sections = Section::where('department_id', $user->department_id)
            ->where('status', 1)
            ->with(['yearLevel', 'enrollments' => function($query) use ($currentSemester, $currentSchoolYear, $activeEnrollmentStatuses) {
                $query->whereIn('status', $activeEnrollmentStatuses)
                    ->whereNull('unenrolled_at')
                    ->when($currentSemester, function($q) use ($currentSemester) {
                        $q->where('semester_id', $currentSemester->id);
                    })
                    ->when($currentSchoolYear, function($q) use ($currentSchoolYear) {
                        $q->where('school_year_id', $currentSchoolYear->id);
                    });
            }])
            ->withCount(['enrollments as active_enrollment_count' => function ($query) use ($currentSemester, $currentSchoolYear, $activeEnrollmentStatuses) {
                $query->whereIn('status', $activeEnrollmentStatuses)
                    ->whereNull('unenrolled_at')
                    ->when($currentSemester, function($q) use ($currentSemester) {
                        $q->where('semester_id', $currentSemester->id);
                    })
                    ->when($currentSchoolYear, function($q) use ($currentSchoolYear) {
                        $q->where('school_year_id', $currentSchoolYear->id);
                    });
            }])
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
                'activeEnrollmentPeriod' => $activeEnrollmentPeriod,
            ]);
        }

    public function fetchCurriculumSubjects(Request $request)
    {
        $request->validate([
            'search' => 'nullable|string|max:120',
            'course_id' => 'nullable|integer',
        ]);

        $query = Curricula::query()
            ->where('status', 'approved')
            ->with(['course:id,name,code', 'curriculumSubjects.subject:id,code,descriptive_title'])
            ->select('id', 'name', 'courses_id');

        if ($request->filled('course_id')) {
            $query->where('courses_id', $request->course_id);
        }

        if ($request->filled('search')) {
            $term = '%' . $request->input('search') . '%';
            $query->where(function ($builder) use ($term) {
                $builder->where('name', 'like', $term)
                    ->orWhereHas('course', function ($courseQuery) use ($term) {
                        $courseQuery->where('name', 'like', $term)
                            ->orWhere('code', 'like', $term);
                    });
            });
        }

        $curricula = $query->limit(20)->get()->map(function ($curriculum) {
            $subjects = $curriculum->curriculumSubjects
                ->filter(function ($subject) {
                    return $subject->prerequisites->isEmpty();
                })
                ->map(function ($subject) use ($curriculum) {
                    return [
                        'curriculum_subject_id' => $subject->id,
                        'subject_id' => $subject->subject_id,
                        'code' => $subject->subject?->code,
                        'title' => $subject->subject?->descriptive_title,
                        'lec_unit' => $subject->lec_unit,
                        'lab_unit' => $subject->lab_unit,
                        'year_level' => optional($subject->yearLevel)->year_level,
                        'semester' => optional($subject->semester)->semester,
                        'course_name' => $curriculum->course?->name,
                        'course_code' => $curriculum->course?->code,
                    ];
                })
                ->values();

            return [
                'id' => $curriculum->id,
                'name' => $curriculum->name,
                'course_name' => $curriculum->course?->name,
                'course_code' => $curriculum->course?->code,
                'subjects' => $subjects,
            ];
        })->filter(fn ($entry) => $entry['subjects']->isNotEmpty())->values();

        return response()->json([
            'curricula' => $curricula,
        ], SymfonyResponse::HTTP_OK);
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
     * Return the student's grades grouped by year level and semester for the grades modal.
     */
    public function getGrades($enrollmentId)
    {
        $enrollment = Enrollments::with(['student', 'yearLevel', 'semester', 'schoolYear'])
            ->find($enrollmentId);

        if (!$enrollment) {
            return response()->json([
                'success' => false,
                'message' => 'Enrollment not found.',
            ], SymfonyResponse::HTTP_NOT_FOUND);
        }

        $studentId = $enrollment->student_id;

        $gradeRecords = Grades::with([
                'classSchedule.curriculumSubject.subject',
                'classSchedule.curriculumSubject.yearLevel',
                'classSchedule.curriculumSubject.semester',
                'classSchedule.subject',
                'classSchedule.semester',
                'enrollment.yearLevel',
                'enrollment.semester',
                'enrollment.schoolYear',
            ])
            ->whereHas('enrollment', function ($query) use ($studentId) {
                $query->where('student_id', $studentId);
            })
            ->orderByDesc('updated_at')
            ->get();

        if ($gradeRecords->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No grades found for this student yet.',
                'grades' => [],
            ], SymfonyResponse::HTTP_OK);
        }

        $groupedGrades = [];

        foreach ($gradeRecords as $record) {
            $classSchedule = $record->classSchedule;
            $curriculumSubject = optional($classSchedule)->curriculumSubject;
            $subject = $curriculumSubject?->subject ?? $classSchedule?->subject;

            $rawYear = $curriculumSubject?->yearLevel?->year_level
                ?? optional($record->enrollment->yearLevel)->year_level
                ?? 'Unspecified Year';
            $yearLabel = is_numeric($rawYear)
                ? 'Year ' . $rawYear
                : ($rawYear ?: 'Unspecified Year');

            $semesterLabel = $curriculumSubject?->semester?->semester
                ?? optional($classSchedule?->semester)->semester
                ?? optional($record->enrollment->semester)->semester
                ?? 'Unspecified Semester';

            $lecUnits = (float) ($curriculumSubject->lec_unit ?? 0);
            $labUnits = (float) ($curriculumSubject->lab_unit ?? 0);

            $groupedGrades[$yearLabel][$semesterLabel][] = [
                'enrollment_id'     => $record->enrollment_id,
                'class_schedule_id' => $record->class_schedule_id,
                'subject_id'        => $subject?->id,
                'subject_code'      => $subject->code ?? null,
                'subject_title'     => $subject->descriptive_title ?? null,
                'midterm'           => $this->toNumericOrNull($record->midterm),
                'final'             => $this->toNumericOrNull($record->final),
                'grade'             => $this->toNumericOrNull($record->grade),
                'remarks'           => $record->remarks,
                'semester_label'    => $semesterLabel,
                'year_level_label'  => $yearLabel,
                'total_units'       => $lecUnits + $labUnits,
                'midterm_status'    => $record->midterm_status,
                'final_status'      => $record->final_status,
                'updated_at'        => optional($record->updated_at)?->toDateTimeString(),
            ];
        }

        return response()->json([
            'success' => true,
            'grades' => $groupedGrades,
        ], SymfonyResponse::HTTP_OK);
    }

        /**
         * 🔍 AJAX: Check if student already exists by ID number
         */
        public function checkStudent(Request $request)
{
    $idNumber = $request->input('id_number') ?? $request->query('id_number');

    if ($idNumber) {
        $request->merge(['id_number' => $idNumber]);
    }

    $request->validate([
        'id_number' => 'required|string',
    ]);

    // Fetch student with latest enrollment
    $student = Users::withCount('enrollments')
        ->with([
            'enrollments' => function ($query) {
                $query->latest('created_at')
                    ->limit(1)
                    ->select('id', 'student_id', 'student_type', 'status', 'courses_id', 'school_year_id', 'semester_id', 'created_at')
                    ->with(['course:id,name,code']);
            },
            'studentDetails:user_id,admission_type',
        ])
        ->where('id_number', $request->id_number)
        ->first();

    if (!$student) {
        return response()->json(['exists' => false]);
    }

    $currentDate = Carbon::now()->toDateString();
    $activeStatuses = ['pending', 'enrolled', 'approved', 'confirmed'];

    // Current term data
    $currentSemester = Semester::where('is_active', 1)->first();

    $currentSchoolYear = AcademicYear::query()
        ->where(function ($q) use ($currentDate) {
            $q->whereNotNull('start_date')
                ->whereNotNull('end_date')
                ->whereDate('start_date', '<=', $currentDate)
                ->whereDate('end_date', '>=', $currentDate);
        })
        ->orWhere('is_active', 1)
        ->first();

    // Current term active enrollment
    $activeEnrollment = Enrollments::with('course')
        ->where('student_id', $student->id)
        ->whereIn('status', $activeStatuses)
        ->when($currentSchoolYear, fn($q) => $q->where('school_year_id', $currentSchoolYear->id))
        ->when($currentSemester, fn($q) => $q->where('semester_id', $currentSemester->id))
        ->latest('enrolled_at')
        ->first();

    // Latest enrollment (any status)
    $latestEnrollment = $student->enrollments->first();

    // All enrollments to analyze old/new status
    $allEnrollments = Enrollments::where('student_id', $student->id)
        ->select('enrollments.*')
        ->join('school_year', 'enrollments.school_year_id', '=', 'school_year.id')
        ->leftJoin('semesters', 'enrollments.semester_id', '=', 'semesters.id')
        ->with(['schoolYear', 'semester'])
        ->orderBy('school_year.start_date')
        ->orderBy('semesters.semester')
        ->get();

    // ---- STUDENT TYPE LOGIC ---- //
    
    // Check if student has any previous enrollment in the enrollments table
    $hasPreviousEnrollment = \DB::table('enrollments')
        ->where('student_id', $student->id)
        ->where(function($query) use ($currentSchoolYear, $currentSemester) {
            // Check for any enrollment in a different school year
            if ($currentSchoolYear) {
                $query->where('school_year_id', '!=', $currentSchoolYear->id);
            }
            // OR in the same school year but different semester
            if ($currentSemester) {
                $query->orWhere(function($q) use ($currentSchoolYear, $currentSemester) {
                    if ($currentSchoolYear) {
                        $q->where('school_year_id', $currentSchoolYear->id);
                    }
                    $q->where('semester_id', '!=', $currentSemester->id);
                });
            }
        })
        ->exists();

    // FINAL STUDENT TYPE
    // Set to 'Old/Continuing' if student has any previous enrollment
    // Otherwise set to 'Freshman'
    $studentType = $hasPreviousEnrollment || $student->enrollments_count > 0
        ? 'Old/Continuing'
        : 'Freshman';

    // ---- ENROLLMENT STATUS MESSAGE ---- //
    $hasCurrentEnrollment = $activeEnrollment !== null;
    $isFromPreviousTerm = false;

    if (!$hasCurrentEnrollment && $latestEnrollment) {
        $isFromPreviousTerm =
            ($currentSchoolYear && $latestEnrollment->school_year_id != $currentSchoolYear->id) ||
            ($currentSemester && $latestEnrollment->semester_id != $currentSemester->id);
    }

    $activeEnrollmentMessage = null;
    $needsEnrollment = false;

    if ($activeEnrollment) {
        $activeEnrollmentMessage = 'This student is currently enrolled in this semester.';
    } elseif ($isFromPreviousTerm) {
        $needsEnrollment = true;
        $activeEnrollmentMessage = 'Student needs to enroll for the current semester/school year.';
    }

    // Check shiftee history
    $hasShifteeHistory = Enrollments::where('student_id', $student->id)
        ->where('status', 'unenrolled')
        ->whereHas('enrollmentSubjects')
        ->exists();

    // ---- RESPONSE ---- //
    return response()->json([
        'exists' => true,
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
            'enrollments_count' => $student->enrollments_count,
            'latest_student_type' => $studentType,
            'admission_type' => optional($student->studentDetails)->admission_type,
        ],
        'has_shiftee_history' => $hasShifteeHistory,
        'latest_enrollment' => $latestEnrollment ? [
            'id' => $latestEnrollment->id,
            'status' => $latestEnrollment->status,
            'course_id' => $latestEnrollment->courses_id,
            'course_name' => optional($latestEnrollment->course)->name,
            'course_code' => optional($latestEnrollment->course)->code,
        ] : null,
        'active_enrollment' => $activeEnrollment ? [
            'id' => $activeEnrollment->id,
            'status' => $activeEnrollment->status,
            'course_id' => $activeEnrollment->courses_id,
            'course_name' => optional($activeEnrollment->course)->name,
            'course_code' => optional($activeEnrollment->course)->code,
        ] : null,
        'active_enrollment_blocked' => (bool) $activeEnrollment,
        'student_type' => $studentType,
        'needs_enrollment' => $needsEnrollment,
        'active_enrollment_message' => $activeEnrollmentMessage,
    ]);
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

    public function submitEnrollment(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'id_number'  => ['required', 'string', 'max:50'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name'  => ['required', 'string', 'max:255'],
            'middle_name'=> ['nullable', 'string', 'max:255'],
            'suffix'     => ['nullable', 'string', 'max:10'],
            'dob'        => ['required', 'date'],
            'gender'     => ['required', 'string', 'max:20'],
            'email'      => ['required', 'email'],
            'contact'    => ['nullable', 'string', 'max:50'],
            'address'    => ['nullable', 'string', 'max:255'],
            'type'       => ['required', 'string'],
            'program'    => ['required', 'integer', 'exists:courses,id'],
            'year_level' => ['required', 'integer', 'exists:year_levels,id'],
            'semester'   => ['required', 'integer', 'exists:semesters,id'],
            'section'    => ['required', 'integer', 'exists:sections,id'],
            'major'      => ['nullable', 'integer'],
        ]);

        $student = Users::where('id_number', $validated['id_number'])->first();

        if ($student) {
            $currentDate = Carbon::now()->toDateString();
            $activeStatuses = ['pending', 'enrolled', 'approved', 'confirmed'];

            $currentSchoolYearIds = AcademicYear::query()
                ->where(function ($query) use ($currentDate) {
                    $query->whereNotNull('start_date')
                        ->whereNotNull('end_date')
                        ->whereDate('start_date', '<=', $currentDate)
                        ->whereDate('end_date', '>=', $currentDate);
                })
                ->orWhere('is_active', 1)
                ->pluck('id');

            // Get current semester ID from the enrollment being processed
            $currentSemesterId = $validated['semester'];
            
            // Check for existing enrollment in the same semester and school year
            $existingEnrollment = Enrollments::with('course')
                ->where('student_id', $student->id)
                ->where('semester_id', $currentSemesterId)
                ->whereIn('school_year_id', $currentSchoolYearIds)
                ->whereIn('status', $activeStatuses)
                ->first();

            if ($existingEnrollment) {
                $courseLabel = optional($existingEnrollment->course)->name
                    ?? optional($existingEnrollment->course)->code
                    ?? 'another course';

                $message = (string) $existingEnrollment->courses_id === (string) $validated['program']
                    ? "Student already has an active enrollment for {$courseLabel} in the selected semester and school year."
                    : "Student is already enrolled under {$courseLabel} for the selected semester and school year.";

                return back()->withErrors([
                    'id_number' => $message,
                ])->withInput();
            }
        }

        if (!$student) {
            $student = Users::create([
                'id_number'    => $validated['id_number'],
                'fName'        => $validated['first_name'],
                'mName'        => $validated['middle_name'] ?? null,
                'lName'        => $validated['last_name'],
                'suffix'       => $validated['suffix'] ?? null,
                'date_of_birth'=> $validated['dob'],
                'gender'       => $validated['gender'],
                'email'        => $validated['email'],
                'contact_no'   => $validated['contact'],
                'address'      => $validated['address'],
                'role'         => 'student',
                'department_id'=> $user->department_id,
            ]);
        }

        // Map the student type to a valid value
        $validStudentTypes = [
            'Freshman' => 'Freshman',
            'Old/Continuing' => 'Old',
            'Transferee' => 'Transferee',
            'Returnee' => 'Returnee',
            'Shiftee' => 'Shiftee',
            'Old' => 'Old',
        ];

        $studentType = $validStudentTypes[$validated['type']] ?? 'Freshman';

        $enrollment = Enrollments::create([
            'student_id'     => $student->id,
            'courses_id'     => $validated['program'],
            'majors_id'      => $validated['major'] ?: null,
            'year_level_id'  => $validated['year_level'],
            'semester_id'    => $validated['semester'],
            'section_id'     => $validated['section'],
            'status'         => 'pending',
            'student_type'   => $studentType,
            'school_year_id' => AcademicYear::where('is_active', 1)->value('id'),
            'enrolled_at'    => Carbon::now()->toDateString(),
        ]);

        if ($request->boolean('is_faculty_portal')) {
            return redirect()
                ->route('faculty.evaluation.subjectload', $enrollment->id)
                ->with('success', 'Enrollment submitted successfully.');
        }

        $redirectTo = route('program-head.evaluation.subjectload', $enrollment->id);

        return redirect()->back()
            ->with('success', 'Enrollment submitted successfully.')
            ->with('redirect_to_subject_load', $redirectTo)
            ->with('enrollment_id', $enrollment->id);
    }

    /**
     * Display the subject load for a specific enrollment
     *
     * @param int $enrollmentId
     * @return \Inertia\Response
     */
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
        
        // Enable query logging for debugging
        \DB::enableQueryLog();
        
        // First, try to load the enrollment with minimal relationships
        $enrollment = Enrollments::with([
            'student',
            'course',
            'yearLevel',
            'semester',
            'section', // Load the section relationship
        ])->find($enrollmentId);
    
        try {
            // Load the enrollment with all required relationships
            $enrollment = Enrollments::with([
                'student',
                'course.curricula', // Changed from curriculum to curricula
                'course.curricula.curriculumSubjects.subject',
                'course.curricula.curriculumSubjects.prerequisites.subject',
                'course.curricula.curriculumSubjects.classSchedules.faculty',
                'course.curricula.curriculumSubjects.classSchedules.classroom',
                'course.curricula.curriculumSubjects.classSchedules.section.yearLevel',
                'yearLevel',
                'semester',
                'section' => function($query) {
                    $query->select('id', 'section as name'); // Explicitly select the section name
                },
                'enrollmentSubjects.curriculumSubject.curriculum',
                'enrollmentSubjects.curriculumSubject.subject',
                'enrollmentSubjects.classSchedule.faculty',
                'enrollmentSubjects.classSchedule.classroom',
                'enrollmentSubjects.classSchedule.section.yearLevel',
                'enrollmentSubjects.classSchedule.curriculumSubject.subject',
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
    
            $approvedCurricula = $enrollment->course->curricula
                ->filter(function ($curriculum) {
                    return $curriculum && $curriculum->status === 'approved';
                })
                ->sortByDesc(function ($curriculum) {
                    return $curriculum->created_at ?? $curriculum->updated_at ?? now();
                });

            $latestApprovedCurriculum = $approvedCurricula->first();

            $studentCurriculum = collect($enrollment->enrollmentSubjects ?? [])
                ->map(function ($enrolledSubject) {
                    return optional($enrolledSubject->curriculumSubject)->curriculum;
                })
                ->filter(function ($curriculum) {
                    return $curriculum && $curriculum->status === 'approved';
                })
                ->sortByDesc(function ($curriculum) {
                    return $curriculum->created_at ?? $curriculum->updated_at ?? now();
                })
                ->first();

            // Prefer the curriculum the student already uses; otherwise fall back to the latest approved one
            $curriculum = $studentCurriculum ?? $latestApprovedCurriculum;

            if (!$curriculum) {
                // Fall back to any curriculum (even if pending) so the UI can still render, but log a warning
                $curriculum = $enrollment->course->curricula->first();

                \Log::error('No approved curriculum found for course', [
                    'course_id' => $enrollment->course->id,
                    'course_name' => $enrollment->course->name ?? 'N/A'
                ]);
                if (!$curriculum) {
                    throw new \Exception('No curriculum found for this course');
                }
            }
            $activeSemester = \App\Models\Semester::where('is_active', true)->first();
    
            if (!$curriculum) {
                $loadWarning = 'No curriculum assigned to this program yet. Subject list may be empty.';
                \Log::warning('No curriculum found for course ID: ' . $enrollment->course_id);
            } else {
                \Log::info('Found curriculum', [
                    'curriculum_id' => $curriculum->id,
                    'program' => $enrollment->course->name ?? 'N/A',
                    'student_id' => $enrollment->student_id
                ]);
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
                        'grades.midterm',
                        'grades.final',
                        'grades.remarks',
                        'cs.curriculum_subject_id',
                    ])
                    ->get();
    
                $failedCurriculumSubjectIds = $failedGradeRows
                    ->filter(function ($row) {
                        $remarks = strtolower($row->remarks ?? '');
                        $finalGrade = $row->final ?? 0;
                        
                        // Check if the student failed based on remarks or final grade
                        if (in_array($remarks, ['failed', 'incomplete', 'dropped'])) {
                            return true;
                        }
                        
                        // Also check if final grade is below passing (assuming 3.0 is failing)
                        if ($finalGrade > 0 && $finalGrade <= 3.0) {
                            return true;
                        }
                        
                        return false;
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
    
                // Get student's academic history with error handling
                $studentAcademicHistory = $this->getStudentAcademicHistory($enrollment->student_id);
                
                // Log any errors in academic history
                if (!empty($studentAcademicHistory['error'])) {
                    \Log::warning('Error in student academic history: ' . $studentAcademicHistory['error'], [
                        'student_id' => $enrollment->student_id,
                        'enrollment_id' => $enrollment->id
                    ]);
                    // Initialize empty arrays to prevent errors
                    $studentAcademicHistory['passed_subject_ids'] = $studentAcademicHistory['passed_subject_ids'] ?? [];
                }
                
                // Log curriculum and section details for debugging
                \Log::info('Curriculum and Section Details', [
                    'curriculum_id' => $curriculum->id,
                    'curriculum_name' => $curriculum->name ?? 'N/A',
                    'section_id' => $enrollment->section_id,
                    'section_name' => $enrollment->section->section ?? 'N/A',
                    'year_level_id' => $enrollment->year_level_id,
                    'semester_id' => $enrollment->semester_id,
                    'school_year_id' => $enrollment->school_year_id,
                    'student_id' => $enrollment->student_id
                ]);

                // Build curriculum-scoped subject query
                $curriculumSubjectsQuery = \App\Models\Curriculum_Subject::with([
                        'subject',
                        'semester',
                        'yearLevel',
                        'prerequisites.subject',
                        'classSchedules' => function($query) use ($enrollment, $activeSemester) {
                            $query->where('school_year_id', $enrollment->school_year_id)
                                  ->when($activeSemester, function ($scheduleQuery) use ($activeSemester) {
                                      $scheduleQuery->where('semester_id', $activeSemester->id);
                                  })
                                  ->when($enrollment->section_id, function ($scheduleQuery) use ($enrollment) {
                                      $scheduleQuery->where('section_id', $enrollment->section_id);
                                  });
                        },
                        'classSchedules.faculty',
                        'classSchedules.classroom',
                        'classSchedules.section.yearLevel'
                    ])
                    ->where('curricula_id', $curriculum->id);

                // Log curriculum query for debugging context
                \Log::info('Curriculum Subjects Base Query', [
                    'curriculum_id' => $curriculum->id,
                    'course_id' => $enrollment->course_id,
                    'section_id' => $enrollment->section_id,
                    'school_year_id' => $enrollment->school_year_id,
                    'semester_id' => $enrollment->semester_id
                ]);

                // Log the actual curriculum subjects found
                $allCurriculumSubjects = $curriculum->curriculumSubjects()->with('subject')->get();
                \Log::info('All Curriculum Subjects', [
                    'count' => $allCurriculumSubjects->count(),
                    'subjects' => $allCurriculumSubjects->map(function($cs) {
                        return [
                            'id' => $cs->id,
                            'subject_id' => $cs->subject_id,
                            'year_level_id' => $cs->year_level_id,
                            'semester_id' => $cs->semesters_id,
                            'subject_name' => $cs->subject->name ?? 'N/A',
                            'subject_code' => $cs->subject->code ?? 'N/A'
                        ];
                    })
                ]);
                
                // Log the section's class schedules
                $sectionSchedules = \DB::table('class_schedules')
                    ->where('section_id', $enrollment->section_id)
                    ->where('school_year_id', $enrollment->school_year_id)
                    ->get();
                    
                \Log::info('Section Class Schedules', [
                    'count' => $sectionSchedules->count(),
                    'schedules' => $sectionSchedules->map(function($sched) {
                        return [
                            'id' => $sched->id,
                            'curriculum_subject_id' => $sched->curriculum_subject_id,
                            'start_time' => $sched->start_time,
                            'end_time' => $sched->end_time,
                            'schedule_day' => $sched->schedule_day
                        ];
                    })
                ]);
                
                // Directly query all curriculum subjects for debugging
                $directSubjects = \DB::table('curriculum_subject')
                    ->where('curricula_id', $curriculum->id)
                    ->get();
                    
                \Log::info('Direct Curriculum Subjects Query', [
                    'curriculum_id' => $curriculum->id,
                    'count' => $directSubjects->count(),
                    'subjects' => $directSubjects->map(function($subj) {
                        return [
                            'id' => $subj->id,
                            'subject_id' => $subj->subject_id,
                            'year_level_id' => $subj->year_level_id,
                            'semester_id' => $subj->semesters_id,
                            'lec_unit' => $subj->lec_unit,
                            'lab_unit' => $subj->lab_unit
                        ];
                    })
                ]);
                
                // Check if there are any subjects in the curriculum at all
                if ($directSubjects->isEmpty()) {
                    \Log::warning('NO SUBJECTS FOUND IN CURRICULUM', [
                        'curriculum_id' => $curriculum->id,
                        'program' => $enrollment->course->name ?? 'N/A',
                        'student_id' => $enrollment->student_id
                    ]);
                }
                    
                // Limit subjects based on the student's year level
                if ($enrollment->year_level_id > 1) {
                    $curriculumSubjectsQuery->where('year_level_id', '<=', $enrollment->year_level_id);
                } else {
                    $curriculumSubjectsQuery->where('year_level_id', $enrollment->year_level_id);
                }

                // Restrict subjects to the student's current semester when available
                if ($enrollment->semester_id) {
                    $curriculumSubjectsQuery->where('semesters_id', $enrollment->semester_id);
                }
                
                // Log the query being executed
                \Log::info('Final Curriculum Subjects Query', [
                    'sql' => $curriculumSubjectsQuery->toSql(),
                    'bindings' => $curriculumSubjectsQuery->getBindings(),
                    'year_level_id' => $enrollment->year_level_id,
                    'semester_id' => $enrollment->semester_id
                ]);
                
                $curriculumSubjectsCollection = $curriculumSubjectsQuery->get()
                    ->map(function ($subj) use ($enrollment, $failedCurriculumSubjectIds, $activeSemester, $studentAcademicHistory) {
                        // Check if student has already passed this subject
                        $hasPassed = $this->hasStudentPassedSubject($studentAcademicHistory, $subj->subject_id);
                        // Check if all prerequisites are met
                        $prerequisitesMet = $this->checkPrerequisites($studentAcademicHistory, $subj);
                        if (config('app.debug')) {
                            \Log::debug('Processing subject:', [
                                'subject_id' => $subj->id,
                                'subject_code' => $subj->subject->code ?? 'N/A',
                                'year_level_id' => $subj->year_level_id,
                                'semester_id' => $subj->semesters_id
                            ]);
                        }
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
    
                        // Get all schedules for the subject
                        $sectionSchedules = $scheduleCollection
                            ->filter(function ($sched) use ($enrollment) {
                                $matches = (int) $sched['section_id'] === (int) $enrollment->section_id;
                                if (!$matches) {
                                    \Log::debug('Schedule filtered out - section mismatch', [
                                        'schedule_section' => $sched['section_id'],
                                        'enrollment_section' => $enrollment->section_id
                                    ]);
                                }
                                return $matches;
                            })
                            ->values();
                            
                        \Log::debug('Section schedules count: ' . $sectionSchedules->count(), [
                            'subject_id' => $subj->id,
                            'section_id' => $enrollment->section_id
                        ]);
    
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
    
                        if (!$hasSectionSchedules && $scheduleCollection->isNotEmpty()) {
                            $sectionSchedules = $scheduleCollection->values();
                            $usesCrossSection = true;

                            \Log::info('Using cross-section class schedules for curriculum subject without section-specific schedules', [
                                'curriculum_subject_id' => $subj->id,
                                'subject_code' => $subj->subject->code ?? null,
                                'enrollment_section_id' => $enrollment->section_id,
                                'schedule_count' => $scheduleCollection->count(),
                                'reason' => $isFailed ? 'retake subject' : 'no schedules for section'
                            ]);
                        }
    
                        if (config('app.debug')) {
                            \Log::debug('Curriculum subject units', [
                                'curriculum_subject_id' => $subj->id,
                                'subject_code' => $subj->subject->code ?? null,
                                'lec_unit' => $subj->lec_unit,
                                'lab_unit' => $subj->lab_unit,
                                'source' => 'primary query',
                            ]);
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

                // Fallback: if no subjects match filters, show entire curriculum catalog
                if ($curriculumSubjectsCollection->isEmpty()) {
                    \Log::info('Curriculum subject query returned no rows. Falling back to full curriculum list', [
                        'curriculum_id' => $curriculum->id,
                        'enrollment_id' => $enrollment->id
                    ]);

                    $curriculumSubjectsCollection = $curriculum->curriculumSubjects()
                        ->with(['subject', 'semester', 'yearLevel', 'prerequisites.subject'])
                        ->get()
                        ->map(function ($subj) use ($failedCurriculumSubjectIds, $studentAcademicHistory) {
                            $hasPassed = $this->hasStudentPassedSubject($studentAcademicHistory, $subj->subject_id);
                            $prerequisitesMet = $this->checkPrerequisites($studentAcademicHistory, $subj);

                            if (config('app.debug')) {
                                \Log::debug('Curriculum subject units (fallback list)', [
                                    'curriculum_subject_id' => $subj->id,
                                    'subject_code' => $subj->subject->code ?? null,
                                    'lec_unit' => $subj->lec_unit,
                                    'lab_unit' => $subj->lab_unit,
                                    'source' => 'fallback query',
                                ]);
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
                                'schedules'            => [],
                                'has_any_schedules'    => false,
                                'has_section_schedules'=> false,
                                'is_failed'            => $failedCurriculumSubjectIds->contains($subj->id),
                                'uses_cross_section'   => false,
                                'source_year_level'    => optional($subj->yearLevel)->year_level,
                                'source_semester'      => optional($subj->semester)->semester,
                                'has_failed_prerequisites' => !$prerequisitesMet,
                                'failed_prerequisite_ids'  => [],
                                'prerequisite_subject_ids' => $subj->prerequisites->pluck('subject_id')->toArray(),
                            ];
                        })
                        ->values();
                }

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
    
                // Build a safe credit catalog without referencing undefined variables
                $creditCatalog = $curriculum->curriculumSubjects
                    ->map(function ($subj) use ($studentAcademicHistory, $creditedCurriculumSubjectIds) {
                        $hasPassed = $this->hasStudentPassedSubject($studentAcademicHistory, $subj->subject_id);
                        $prerequisitesMet = $this->checkPrerequisites($studentAcademicHistory, $subj);
                        $isCredited = in_array((int) $subj->id, $creditedCurriculumSubjectIds->toArray());
    
                        return [
                            'id' => $subj->id,
                            'subject_id' => $subj->subject_id,
                            'subject' => $subj->subject,
                            'year_level_id' => $subj->year_level_id,
                            'year_level' => $subj->yearLevel,
                            'semester' => $subj->semester,
                            'semesters_id' => $subj->semesters_id,
                            'lec_unit' => $subj->lec_unit,
                            'lab_unit' => $subj->lab_unit,
                            'units' => $subj->subject->units ?? 0,
                            'prerequisites' => $subj->prerequisites ?? [],
                            'schedules' => [], // populate if needed later
                            'is_failed' => false,
                            'has_schedule' => false,
                            'is_credited' => $isCredited,
                            'has_passed' => $hasPassed,
                            'prerequisites_met' => $prerequisitesMet,
                            'is_eligible' => !$hasPassed && $prerequisitesMet,
                            'reason' => $hasPassed ? 'already_passed' : (!$prerequisitesMet ? 'prerequisites_not_met' : 'eligible')
                        ];
                    })
                    ->values()
                    ->toArray();
            }
    
            // Render the subject load view with prepared data
            $subjectLoadView = request()->routeIs('faculty.*')
                ? 'Faculty/Evaluation/SubjectLoad'
                : 'ProgramHead/Evaluation/SubjectLoad';

            return Inertia::render($subjectLoadView, [
                'enrollment' => $enrollment,
                'curriculumSubjects' => $curriculumSubjects,
                'creditCatalog' => $creditCatalog,
                'creditedSubjects' => $creditedSubjects,
                'creditedSubjectDetails' => $creditedSubjectDetails,
                'loadWarning' => $loadWarning,
                'loadError' => $loadError,
                'academicSummary' => [
                    'total_units_taken' => $studentAcademicHistory['total_units_taken'] ?? 0,
                    'total_units_earned' => $studentAcademicHistory['total_units_earned'] ?? 0,
                    'gpa' => $studentAcademicHistory['gpa'] ?? 0,
                    'status' => $studentAcademicHistory['status'] ?? 'N/A'
                ],
            ]);
    
        } catch (\Exception $e) {
            \Log::error('Error in showSubjectLoad: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            $subjectLoadView = request()->routeIs('faculty.*')
                ? 'Faculty/Evaluation/SubjectLoad'
                : 'ProgramHead/Evaluation/SubjectLoad';

            return Inertia::render($subjectLoadView, [
                'enrollment' => null,
                'curriculumSubjects' => [],
                'creditCatalog' => [],
                'creditedSubjects' => [],
                'creditedSubjectDetails' => [],
                'loadError' => 'Failed to load subject data: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Show crediting subjects for an enrollment
     *
     * @param int $enrollmentId
     * @return \Inertia\Response
     */
    public function showCreditingSubjects($enrollmentId)
    {
        $creditedSubjects = [];
        $creditedSubjectDetails = [];

        try {
            // Enable query logging for debugging
            \DB::enableQueryLog();
            
            $enrollment = Enrollments::with([
                'student',
                'course',
                'yearLevel',
                'section',
                'semester',
                'enrolledSubjects.subject',
                'enrolledSubjects.classSchedule',
                'enrolledSubjects.grades',
                'student.enrollments' => function($query) use ($enrollmentId) {
                    $query->where('id', '!=', $enrollmentId)
                          ->with(['enrolledSubjects.subject', 'enrolledSubjects.grades']);
                }
            ])->findOrFail($enrollmentId);

            // Get academic history and other necessary data
            $studentAcademicHistory = $this->getStudentAcademicHistory($enrollment->student_id);
            $curriculum = $enrollment->course->curriculum ?? null;
            $creditCatalog = [];
            $recommendedSubjects = [];
            $attentionNeeded = [];
            $loadWarning = null;

            $creditedRecords = CreditedSubject::where('student_id', $enrollment->student_id)->get();
            if ($creditedRecords->isNotEmpty()) {
                $creditedSubjects = $creditedRecords
                    ->pluck('curriculum_subject_id')
                    ->map(fn ($id) => (int) $id)
                    ->toArray();

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
            }

            if ($curriculum) {
                // Get all curriculum subjects
                $curriculumSubjects = $curriculum->curriculumSubjects()
                    ->with(['subject', 'prerequisites', 'yearLevel', 'semester'])
                    ->get();

                // Process subjects to determine eligibility
                $processedSubjects = $curriculumSubjects->map(function($subject) use ($studentAcademicHistory) {
                    $hasPassed = $this->hasStudentPassedSubject($studentAcademicHistory, $subject->subject_id);
                    $prerequisitesMet = $this->checkPrerequisites($studentAcademicHistory, $subject);
                    
                    return [
                        'id' => $subject->id,
                        'subject_id' => $subject->subject_id,
                        'subject' => $subject->subject,
                        'year_level_id' => $subject->year_level_id,
                        'year_level' => $subject->yearLevel,
                        'semester' => $subject->semester,
                        'semesters_id' => $subject->semesters_id,
                        'units' => $subject->subject->units ?? 0,
                        'prerequisites' => $subject->prerequisites ?? [],
                        'has_passed' => $hasPassed,
                        'prerequisites_met' => $prerequisitesMet,
                        'is_eligible' => !$hasPassed && $prerequisitesMet,
                        'reason' => $hasPassed ? 'already_passed' : 
                                   (!$prerequisitesMet ? 'prerequisites_not_met' : 'eligible')
                    ];
                });

                $recommendedSubjects = $processedSubjects->filter(function($subject) {
                    return $subject['is_eligible'];
                })->values();
                
                $attentionNeeded = $processedSubjects->filter(function($subject) {
                    return !$subject['is_eligible'];
                })->values();
                
                $creditCatalog = $processedSubjects->toArray();
            } else {
                $loadWarning = 'No curriculum found for this course';
            }

            $groupedSubjects = collect($creditCatalog)
                ->map(function ($subject) use ($creditedSubjectDetails) {
                    $yearLabel = $subject['year_level']['year_level'] ?? 'Year N/A';
                    $semesterLabel = $subject['semester']['semester'] ?? ($subject['semester'] ?? 'N/A');
                    $subjectModel = $subject['subject'] ?? [];
                    $creditedMeta = $creditedSubjectDetails[$subject['id']] ?? null;

                    return [
                        'group_key'      => $yearLabel ?: 'Year N/A',
                        'id'             => $subject['id'],
                        'subject_code'   => $subjectModel['code'] ?? null,
                        'subject_title'  => $subjectModel['descriptive_title'] ?? ($subjectModel['name'] ?? null),
                        'semester'       => $semesterLabel,
                        'total_units'    => $subject['units'] ?? (($subject['lec_unit'] ?? 0) + ($subject['lab_unit'] ?? 0)),
                        'lec_unit'       => $subject['lec_unit'] ?? 0,
                        'lab_unit'       => $subject['lab_unit'] ?? 0,
                        'is_credited'    => $creditedMeta !== null,
                        'credited_units' => $creditedMeta['credited_units'] ?? null,
                        'remarks'        => $creditedMeta['remarks'] ?? null,
                    ];
                })
                ->groupBy('group_key')
                ->map(function ($items, $yearLabel) {
                    return [
                        'year_level' => $yearLabel,
                        'subjects'   => $items->map(function ($subject) {
                            unset($subject['group_key']);
                            return $subject;
                        })->values(),
                    ];
                })
                ->values();

            return Inertia::render('ProgramHead/Evaluation/CreditingSubjects', [
                'enrollment'             => $enrollment,
                'student'                => $student ?? $enrollment->student,
                'groupedSubjects'        => $groupedSubjects,
                'creditCatalog'          => $creditCatalog,
                'creditedSubjects'       => $creditedSubjects,
                'creditedSubjectDetails' => $creditedSubjectDetails,
                'loadWarning'            => $loadWarning,
                'loadError'              => null,
            ]);

        } catch (\Exception $e) {
            \Log::error('Error in showCreditingSubjects: ' . $e->getMessage());
            return Inertia::render('ProgramHead/Evaluation/SubjectLoad', [
                'enrollment' => null,
                'availableSubjects' => [],
                'creditCatalog' => [],
                'recommendedSubjects' => [],
                'attentionNeeded' => [],
                'loadError' => 'Failed to load subject data: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Save or update credited subjects for a student's enrollment.
     */
    public function storeCreditedSubjects(Request $request)
    {
        $validated = $request->validate([
            'enrollment_id' => 'required|exists:enrollments,id',
            'subjects' => 'required|array|min:1',
            'subjects.*.curriculum_subject_id' => 'required|integer|exists:curriculum_subject,id',
            'subjects.*.credited_units' => 'nullable|numeric|min:0',
            'subjects.*.remarks' => 'nullable|string|max:255',
        ]);

        $enrollment = Enrollments::with('student')->findOrFail($validated['enrollment_id']);

        if (!$enrollment->student_id) {
            return redirect()->back()->with('error', 'Cannot credit subjects without a linked student record.');
        }

        $studentId = $enrollment->student_id;
        $subjects = collect($validated['subjects'])
            ->filter(fn ($subject) => !empty($subject['curriculum_subject_id']))
            ->map(function ($subject) {
                return [
                    'curriculum_subject_id' => (int) $subject['curriculum_subject_id'],
                    'credited_units' => isset($subject['credited_units'])
                        ? (float) $subject['credited_units']
                        : null,
                    'remarks' => $subject['remarks'] ?? null,
                ];
            })
            ->unique('curriculum_subject_id')
            ->values();

        if ($subjects->isEmpty()) {
            return redirect()->back()->with('error', 'No valid subjects were provided for crediting.');
        }

        DB::transaction(function () use ($subjects, $studentId) {
            $subjectIds = $subjects->pluck('curriculum_subject_id')->toArray();

            CreditedSubject::where('student_id', $studentId)
                ->whereNotIn('curriculum_subject_id', $subjectIds)
                ->delete();

            foreach ($subjects as $subject) {
                CreditedSubject::updateOrCreate(
                    [
                        'student_id' => $studentId,
                        'curriculum_subject_id' => $subject['curriculum_subject_id'],
                    ],
                    [
                        'credited_units' => $subject['credited_units'],
                        'remarks' => $subject['remarks'],
                    ]
                );
            }
        });

        return redirect()->back()->with('success', 'Credited subjects saved successfully.');
    }

    /**
     * Persist selected class schedules into the enrollment_subjects table.
     */
    public function storeSubjectLoad(Request $request)
    {
        $validated = $request->validate([
            'enrollment_id' => 'required|exists:enrollments,id',
            'class_schedule_ids' => 'required|array',
            'class_schedule_ids.*' => 'nullable|numeric',
            'curriculum_subject_ids' => 'nullable|array',
            'curriculum_subject_ids.*' => 'nullable|numeric|exists:curriculum_subject,id',
        ]);

        $enrollment = Enrollments::with('enrollmentSubjects')->findOrFail($validated['enrollment_id']);

        $scheduleIds = collect($validated['class_schedule_ids'])
            ->map(fn ($id) => $id === null || $id === '' ? null : (int) $id)
            ->values();

        $curriculumIds = collect($validated['curriculum_subject_ids'] ?? [])
            ->map(fn ($id) => $id === null || $id === '' ? null : (int) $id)
            ->values();

        $resolvedScheduleIds = [];
        $scheduleIds->each(function ($scheduleId, $index) use (&$resolvedScheduleIds, $curriculumIds, $enrollment) {
            if ($scheduleId !== null) {
                $resolvedScheduleIds[$index] = $scheduleId;
                return;
            }

            $curriculumId = $curriculumIds->get($index) ?? null;
            if ($curriculumId === null) {
                $resolvedScheduleIds[$index] = null;
                return;
            }

            $fallbackScheduleId = Class_Schedules::query()
                ->where('curriculum_subject_id', $curriculumId)
                ->where('school_year_id', $enrollment->school_year_id)
                ->when($enrollment->section_id, function ($query) use ($enrollment) {
                    $query->where('section_id', $enrollment->section_id);
                })
                ->orderByDesc('section_id')
                ->orderBy('id')
                ->value('id');

            if (!$fallbackScheduleId) {
                $fallbackScheduleId = Class_Schedules::query()
                    ->where('curriculum_subject_id', $curriculumId)
                    ->orderBy('id')
                    ->value('id');
            }

            if ($fallbackScheduleId) {
                \Log::info('Resolved missing class schedule for subject load', [
                    'curriculum_subject_id' => $curriculumId,
                    'enrollment_id' => $enrollment->id,
                    'resolved_schedule_id' => $fallbackScheduleId,
                ]);
            } else {
                \Log::warning('Unable to resolve class schedule for subject load', [
                    'curriculum_subject_id' => $curriculumId,
                    'enrollment_id' => $enrollment->id,
                ]);
            }

            $resolvedScheduleIds[$index] = $fallbackScheduleId;
        });

        if ($scheduleIds->isEmpty()) {
            return redirect()->back()->with('error', 'No class schedules provided.');
        }

        $resolvedCurriculumIds = [];
        $scheduleIds->each(function ($scheduleId, $index) use (&$resolvedCurriculumIds, $curriculumIds) {
            $curriculumId = $curriculumIds->get($index) ?? null;

            if ($curriculumId === null && $scheduleId !== null) {
                $curriculumId = Class_Schedules::where('id', $scheduleId)->value('curriculum_subject_id');
            }

            $resolvedCurriculumIds[$index] = $curriculumId !== null ? (int) $curriculumId : null;
        });

        $targetCurriculumIds = collect($resolvedCurriculumIds)
            ->filter()
            ->unique()
            ->values();

        if ($targetCurriculumIds->isNotEmpty()) {
            $duplicateEntries = EnrollmentSubject::query()
                ->whereIn('curriculum_subject_id', $targetCurriculumIds)
                ->whereHas('enrollment', function ($query) use ($enrollment) {
                    $query->where('student_id', $enrollment->student_id)
                        ->where('semester_id', $enrollment->semester_id)
                        ->where('school_year_id', $enrollment->school_year_id);
                })
                ->with('curriculumSubject.subject')
                ->get();

            if ($duplicateEntries->isNotEmpty()) {
                $conflictSubjects = $duplicateEntries
                    ->map(function ($entry) {
                        $code = optional($entry->curriculumSubject?->subject)->code;
                        $title = optional($entry->curriculumSubject?->subject)->descriptive_title;
                        return $code ? ($title ? "$code – $title" : $code) : ($title ?? 'A subject');
                    })
                    ->unique()
                    ->values()
                    ->implode(', ');

                return redirect()->back()->with('error', 'Student is already enrolled in: ' . $conflictSubjects . ' for this semester and school year.');
            }
        }

        $scheduleIdsArray = $resolvedScheduleIds;
        $resolvedCurriculumIdsArray = $resolvedCurriculumIds;

        $insertedCount = 0;

        DB::transaction(function () use ($enrollment, $scheduleIdsArray, $resolvedCurriculumIdsArray, &$insertedCount) {
            $existingPairs = $enrollment->enrollmentSubjects()
                ->get(['class_schedule_id', 'curriculum_subject_id'])
                ->map(fn ($row) => sprintf('%s|%s', $row->class_schedule_id ?? 'null', $row->curriculum_subject_id ?? 'null'))
                ->toArray();

            foreach ($scheduleIdsArray as $index => $scheduleId) {
                $curriculumSubjectId = $resolvedCurriculumIdsArray[$index] ?? null;

                if ($curriculumSubjectId === null) {
                    logger()->warning('Skipping enrollment_subject insert without curriculum_subject_id', [
                        'enrollment_id' => $enrollment->id,
                        'class_schedule_id' => $scheduleId,
                        'index' => $index,
                    ]);
                    continue;
                }

                $pairKey = sprintf('%s|%s', $scheduleId ?? 'null', $curriculumSubjectId);
                if (in_array($pairKey, $existingPairs, true)) {
                    continue;
                }

                EnrollmentSubject::create([
                    'enrollment_id' => $enrollment->id,
                    'class_schedule_id' => $scheduleId,
                    'curriculum_subject_id' => $curriculumSubjectId,
                ]);

                $existingPairs[] = $pairKey;
                $insertedCount++;
            }
        });

        if ($insertedCount > 0 || $enrollment->enrollmentSubjects()->exists()) {
            $enrollment->fill([
                'status' => 'enrolled',
                'enrolled_at' => now(),
            ])->save();
        }

        return redirect()->back()->with('success', 'Subjects loaded successfully.');
    }

    /**
     * Process the add/drop request
     *
     * @param Request $request
     * @param int $enrollmentId
     * @return \Illuminate\Http\RedirectResponse
     */
    /**
     * Get student's academic history including grades, GPA, and completion status
     *
     * @param int $studentId
     * @return array
     */
    protected function getStudentAcademicHistory($studentId)
    {
        $history = [
            'total_units_taken' => 0,
            'total_units_earned' => 0,
            'gpa' => 0,
            'status' => 'N/A',
            'subjects' => [],
            'passed_subject_ids' => [],
            'error' => null
        ];

        try {
            // First, verify the student exists
            $student = \App\Models\Users::find($studentId);
            if (!$student) {
                $history['error'] = 'Student not found';
                return $history;
            }

            // Get all grades for the student with proper error handling
            $grades = \DB::table('grades')
                ->join('enrollments', 'grades.enrollment_id', '=', 'enrollments.id')
                ->join('curriculum_subject', 'grades.curriculum_subject_id', '=', 'curriculum_subject.id')
                ->leftJoin('subjects', 'curriculum_subject.subject_id', '=', 'subjects.id')
                ->where('enrollments.student_id', $studentId)
                ->select([
                    'grades.id',
                    'grades.final',
                    'grades.remarks',
                    'subjects.id as subject_id',
                    'curriculum_subject.lec_unit',
                    'curriculum_subject.lab_unit',
                ])
                ->get();

            $passedSubjects = [];
            $totalUnits = 0;
            $totalGradePoints = 0;
            $passedUnits = 0;

            foreach ($grades as $grade) {
                try {
                    $isPassed = $this->isGradePassing($grade->final, $grade->remarks);
                    $units = (float)($grade->lec_unit ?? 0) + (float)($grade->lab_unit ?? 0);
                    
                    $history['subjects'][] = [
                        'subject_id' => $grade->subject_id,
                        'grade' => $grade->final,
                        'remarks' => $grade->remarks,
                        'is_passed' => $isPassed,
                        'units' => $units,
                    ];

                    if ($isPassed) {
                        $history['passed_subject_ids'][] = $grade->subject_id;
                        $passedUnits += $units;
                        $totalGradePoints += $this->calculateGradePoints($grade->final, $units);
                    }

                    $totalUnits += $units;
                } catch (\Exception $e) {
                    \Log::error('Error processing grade: ' . $e->getMessage(), [
                        'grade' => $grade,
                        'trace' => $e->getTraceAsString()
                    ]);
                    continue;
                }
            }

            // Calculate GPA if there are passed units
            $history['total_units_taken'] = $totalUnits;
            $history['total_units_earned'] = $passedUnits;
            $history['gpa'] = $passedUnits > 0 ? round($totalGradePoints / $passedUnits, 2) : 0;
            $history['status'] = $this->determineAcademicStatus($history['gpa']);

        } catch (\Exception $e) {
            $errorMsg = 'Error fetching student academic history: ' . $e->getMessage();
            \Log::error($errorMsg, [
                'student_id' => $studentId,
                'trace' => $e->getTraceAsString()
            ]);
            $history['error'] = $errorMsg;
        }

        return $history;
    }

    /**
     * Check if a grade is considered passing
     *
     * @param float|null $grade
     * @param string|null $remarks
     * @return bool
     */
    protected function isGradePassing($grade, $remarks)
    {
        // Check remarks first
        if (in_array(strtolower($remarks ?? ''), ['failed', 'dropped', 'incomplete'])) {
            return false;
        }

        // Then check grade value (assuming passing grade is 3.0 or below)
        return $grade !== null && $grade > 0 && $grade <= 3.0;
    }

    /**
     * Calculate grade points based on grade and units
     *
     * @param float $grade
     * @param int $units
     * @return float
     */
    protected function calculateGradePoints($grade, $units)
    {
        // Handle null or invalid grades
        if ($grade === null || $grade <= 0 || $grade > 5.0) {
            return 0;
        }
        
        if ($grade >= 1.0 && $grade <= 1.5) {
            return 4.0 * $units;
        } elseif ($grade > 1.5 && $grade <= 2.0) {
            return 3.5 * $units;
        } elseif ($grade > 2.0 && $grade <= 2.5) {
            return 3.0 * $units;
        } elseif ($grade > 2.5 && $grade <= 3.0) {
            return 2.5 * $units;
        } else {
            return 0; // Failed
        }
    }

    /**
     * Determine academic status based on GPA
     *
     * @param float $gpa
     * @return string
     */
    protected function determineAcademicStatus($gpa)
    {
        if ($gpa >= 3.5) {
            return 'With High Honors';
        } elseif ($gpa >= 3.0) {
            return 'With Honors';
        } elseif ($gpa >= 1.75) {
            return 'Passed';
        } else {
            return 'On Probation';
        }
    }

    /**
     * Check if student has passed a specific subject
     *
     * @param array $academicHistory
     * @param int $subjectId
     * @return bool
     */
    protected function hasStudentPassedSubject($academicHistory, $subjectId)
    {
        return in_array($subjectId, $academicHistory['passed_subject_ids'] ?? []);
    }

    /**
     * Check if student meets all prerequisites for a subject
     *
     * @param array $academicHistory
     * @param mixed $subject
     * @return bool
     */
    protected function checkPrerequisites($academicHistory, $subject)
    {
        if (!isset($subject->prerequisites) || $subject->prerequisites->isEmpty()) {
            return true; // No prerequisites
        }

        foreach ($subject->prerequisites as $prereq) {
            if (!in_array($prereq->subject_id, $academicHistory['passed_subject_ids'] ?? [])) {
                return false; // Missing prerequisite
            }
        }

        return true; // All prerequisites met
    }

    /**
     * Process the add/drop request
     *
     * @param Request $request
     * @param int $enrollmentId
     * @return \Illuminate\Http\RedirectResponse
     */
    public function processAddDrop(Request $request, $enrollmentId)
    {
        // Validate incoming request
        $validated = $request->validate([
            'subjects' => 'required|array',
            'subjects.*.type' => 'required|in:add,drop',
            'subjects.*.curriculum_subject_id' => 'required|exists:curriculum_subject,id',
            'subjects.*.reason' => 'required_if:subjects.*.type,drop|string|max:500|nullable',
            'subjects.*.class_schedule_id' => 'required_if:subjects.*.type,add|exists:class_schedules,id|nullable',
        ]);

        $enrollment = Enrollments::with('enrollmentSubjects')->findOrFail($enrollmentId);
        $results = [
            'added' => 0,
            'dropped' => 0,
            'errors' => []
        ];

        DB::beginTransaction();
        try {
            foreach ($request->subjects as $subject) {
                if ($subject['type'] === 'add') {
                    // Check if already enrolled
                    $alreadyEnrolled = $enrollment->enrollmentSubjects()
                        ->where('curriculum_subject_id', $subject['curriculum_subject_id'])
                        ->where('status', 'enrolled')
                        ->exists();

                    if ($alreadyEnrolled) {
                        $results['errors'][] = 'Subject already enrolled';
                        continue;
                    }

                    // Add subject to enrollment
                    $enrollment->enrollmentSubjects()->create([
                        'curriculum_subject_id' => $subject['curriculum_subject_id'],
                        'class_schedule_id' => $subject['class_schedule_id'] ?? null,
                        'status' => 'enrolled',
                        'added_manually' => true,
                        'enrolled_at' => now(),
                    ]);
                    
                    $results['added']++;
                } else {
                    // Drop subject
                    $updated = $enrollment->enrollmentSubjects()
                        ->where('curriculum_subject_id', $subject['curriculum_subject_id'])
                        ->where('status', 'enrolled')
                        ->update([
                            'status' => 'dropped',
                            'dropped_at' => now(),
                            'drop_reason' => $subject['reason'] ?? 'No reason provided',
                        ]);
                    
                    if ($updated > 0) {
                        $results['dropped']++;
                    } else {
                        $results['errors'][] = 'Subject not found or already dropped';
                    }
                }

                // Log the add/drop action
                \Log::info('Subject ' . $subject['type'] . ' processed', [
                    'enrollment_id' => $enrollment->id,
                    'student_id' => $enrollment->student_id,
                    'curriculum_subject_id' => $subject['curriculum_subject_id'],
                    'action' => $subject['type'],
                    'reason' => $subject['reason'] ?? null,
                    'processed_by' => auth()->id(),
                ]);
            }

            DB::commit();

            // Prepare success message
            $message = [];
            if ($results['added'] > 0) {
                $message[] = $results['added'] . ' subject(s) added successfully';
            }
            if ($results['dropped'] > 0) {
                $message[] = $results['dropped'] . ' subject(s) dropped successfully';
            }
            if (count($results['errors']) > 0) {
                $message = array_merge($message, $results['errors']);
            }

            return redirect()->back()->with([
                'success' => implode('. ', $message),
                'results' => $results
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to process subject changes', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
            ]);

            return redirect()->back()->with('error', 'Failed to process subject changes. Please try again.');
        }
    }

    /**
     * Normalize grade inputs to numeric floats when possible.
     */
    protected function toNumericOrNull($value): ?float
    {
        if ($value === null) {
            return null;
        }

        if (is_numeric($value)) {
            return (float) $value;
        }

        // Handle strings like "3.0 "
        $trimmed = trim((string) $value);
        return is_numeric($trimmed) ? (float) $trimmed : null;
    }
}
