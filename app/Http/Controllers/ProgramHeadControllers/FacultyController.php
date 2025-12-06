<?php

namespace App\Http\Controllers\ProgramHeadControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Models\Users; // Assuming faculty are stored in users table
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

use App\Models\Section;
use App\Models\department;
use App\Models\Semester;
use App\Models\Class_Schedules;
use App\Models\Subjects;
use App\Models\Curriculum_Subject;
use App\Models\Year_Level;
use App\Models\Classrooms;
use App\Models\AcademicYear;
use App\Models\FacultyLoad;
use App\Models\Enrollments;
use App\Models\EnrollmentSubject;
use Illuminate\Support\Arr;
use Inertia\Inertia;

class FacultyController extends Controller
{
  public function index()
{
    $programHead = auth()->user();

    $faculties = Users::where('role', 'faculty')
        ->where('department_id', $programHead->department_id) // ✅ same department
        ->latest()
        ->get();

    $departments = Department::query()
        ->when($programHead->department_id, function ($query, $deptId) {
            return $query->where('id', $deptId);
        })
        ->orderBy('name')
        ->get(['id', 'name']);

    return Inertia::render('ProgramHead/Faculty/Faculties', [
        'faculties' => $faculties,
        'departments' => $departments,
    ]);
}

public function show(Users $faculty)
{
    $programHead = auth()->user();

    if ($faculty->role !== 'faculty' || $faculty->department_id !== $programHead->department_id) {
        abort(404);
    }

    $activeSemester = Semester::where('is_active', 1)->first();

    $facultyRecord = Users::query()
        ->where('id', $faculty->id)
        ->where('role', 'faculty')
        ->with([
            'department:id,name',
            'facultyLoads' => function ($query) use ($activeSemester) {
                if ($activeSemester) {
                    $query->where('semester_id', $activeSemester->id);
                }

                $query->with([
                    'curriculumSubject:id,subject_id,lec_unit,lab_unit',
                    'curriculumSubject.subject:id,code,descriptive_title',
                    'course:id,name,code',
                    'semester:id,semester',
                    'schoolYear:id,school_year',
                ])->orderByDesc('updated_at');
            },
            'class_schedules' => function ($query) use ($activeSemester) {
                if ($activeSemester) {
                    $query->where('semester_id', $activeSemester->id);
                }

                $query->with([
                    'curriculumSubject:id,subject_id,lec_unit,lab_unit',
                    'curriculumSubject.subject:id,code,descriptive_title',
                    'section:id,section,year_level_id',
                    'section.yearLevel:id,year_level',
                    'classroom:id,room_number',
                ])
                ->withCount([
                    'enrollmentSubjects as enrolled_students_count' => function ($q) {
                        $q->where(function ($subQuery) {
                            $subQuery->whereNull('status')
                                     ->orWhere('status', '!=', 'dropped');
                        });
                    },
                ]);
            },
        ])
        ->firstOrFail();

    $loadDetails = $facultyRecord->facultyLoads->map(function ($load) {
        return [
            'id' => $load->id,
            'type' => $load->type,
            'official_load' => $load->official_load,
            'total_units' => $load->total_units,
            'student_count' => $load->student_count,
            'courses_id' => $load->courses_id,
            'course' => $load->course ? Arr::only($load->course->toArray(), ['id', 'name', 'code']) : null,
            'curriculum_subject_id' => $load->curriculum_subject_id,
            'curriculum_subject' => $load->curriculumSubject ? [
                'id' => $load->curriculumSubject->id,
                'lec_unit' => $load->curriculumSubject->lec_unit,
                'lab_unit' => $load->curriculumSubject->lab_unit,
                'subject' => $load->curriculumSubject->subject ? Arr::only($load->curriculumSubject->subject->toArray(), ['id', 'code', 'descriptive_title']) : null,
            ] : null,
            'semester' => $load->semester ? Arr::only($load->semester->toArray(), ['id', 'semester']) : null,
            'school_year' => $load->schoolYear ? Arr::only($load->schoolYear->toArray(), ['id', 'school_year']) : null,
            'created_at' => $load->created_at,
            'updated_at' => $load->updated_at,
        ];
    })->values();

    $loadSummary = [
        'subjects' => $loadDetails->count(),
        'total_units' => $loadDetails->sum('total_units'),
        'official_load' => $loadDetails->sum('official_load'),
        'student_count' => $loadDetails->sum('student_count'),
    ];

    $dayOrdering = [
        'monday' => 1,
        'tuesday' => 2,
        'wednesday' => 3,
        'thursday' => 4,
        'friday' => 5,
        'saturday' => 6,
        'sunday' => 7,
    ];

    $schedules = $facultyRecord->class_schedules
        ->sortBy(function ($schedule) use ($dayOrdering) {
            $dayKey = strtolower($schedule->schedule_day ?? '');
            $dayRank = $dayOrdering[$dayKey] ?? 99;
            return sprintf('%02d-%s', $dayRank, $schedule->start_time ?? '99:99');
        })
        ->map(function ($schedule) {
            $subject = $schedule->curriculumSubject?->subject ?? $schedule->subject;

            return [
                'id' => $schedule->id,
                'curriculum_subject_id' => $schedule->curriculum_subject_id,
                'day' => $schedule->schedule_day,
                'start_time' => $schedule->start_time,
                'end_time' => $schedule->end_time,
                'color' => $schedule->color,
                'enrolled_students' => $schedule->enrolled_students_count ?? 0,
                'subject' => $subject ? Arr::only($subject->toArray(), ['id', 'code', 'descriptive_title']) : null,
                'section' => $schedule->section ? [
                    'id' => $schedule->section->id,
                    'name' => $schedule->section->section,
                    'year_level' => $schedule->section->yearLevel?->year_level,
                ] : null,
                'room' => $schedule->classroom ? Arr::only($schedule->classroom->toArray(), ['id', 'room_number']) : null,
            ];
        })
        ->values();

    $facultyPayload = [
        'id' => $facultyRecord->id,
        'fName' => $facultyRecord->fName,
        'mName' => $facultyRecord->mName,
        'lName' => $facultyRecord->lName,
        'suffix' => $facultyRecord->suffix,
        'id_number' => $facultyRecord->id_number,
        'email' => $facultyRecord->email,
        'contact' => $facultyRecord->contact,
        'address' => $facultyRecord->address,
        'gender' => $facultyRecord->gender,
        'profession' => $facultyRecord->profession,
        'status' => $facultyRecord->status,
        'profile_picture' => $facultyRecord->profile_picture,
        'department' => $facultyRecord->department ? Arr::only($facultyRecord->department->toArray(), ['id', 'name']) : null,
        'facultyLoads' => $loadDetails,
    ];

    return Inertia::render('ProgramHead/Faculty/FacultyProfile', [
        'faculty' => $facultyPayload,
        'teachingSchedules' => $schedules,
        'loadSummary' => $loadSummary,
        'activeSemester' => $activeSemester ? Arr::only($activeSemester->toArray(), ['id', 'semester']) : null,
        'backUrl' => route('program-head.faculties.index'),
    ]);
}

    /**
     * Ensure enrollment subjects without schedules (TBA) are linked to the new schedule.
     */
    protected function syncEnrollmentSubjectsWithSchedule(Class_Schedules $schedule): void
    {
        if (!$schedule->section_id || !$schedule->curriculum_subject_id) {
            return;
        }

        $enrollmentIds = Enrollments::query()
            ->where('section_id', $schedule->section_id)
            ->when($schedule->semester_id, fn ($query, $semesterId) => $query->where('semester_id', $semesterId))
            ->when($schedule->school_year_id, fn ($query, $schoolYearId) => $query->where('school_year_id', $schoolYearId))
            ->pluck('id');

        if ($enrollmentIds->isEmpty()) {
            return;
        }

        EnrollmentSubject::whereIn('enrollment_id', $enrollmentIds)
            ->where('curriculum_subject_id', $schedule->curriculum_subject_id)
            ->whereNull('class_schedule_id')
            ->update([
                'class_schedule_id' => $schedule->id,
            ]);
    }

    
public function facultyLoad()
{
    $programHead = auth()->user();

    // Active semester context (optional but recommended for clarity)
    $activeSemester = Semester::where('is_active', 1)->first();

    $faculties = Users::where('role', 'faculty')
        ->where('department_id', $programHead->department_id) // ✅ same department
        ->with([
            'department:id,name',
            // Limit loads to the active semester if available and include key fields
            'facultyLoads' => function ($q) use ($activeSemester) {
                if ($activeSemester) {
                    $q->where('semester_id', $activeSemester->id);
                }
                // Align with faculty_load table schema
                $q->select(
                    'id',
                    'faculty_id',
                    'courses_id',
                    'curriculum_subject_id',
                    'semester_id',
                    'school_year_id',
                    'type',
                    'official_load',
                    'total_units',
                    'student_count',
                    'created_at',
                    'updated_at'
                );
                // If relationships exist, you can eager-load them here
                // ->with(['curriculumSubject.subject:id,descriptive_title,code', 'course:id,name'])
            },
        ])
        // Aggregate metrics for quick display in UI
        ->withCount([
            'facultyLoads as subjects_count' => function ($q) use ($activeSemester) {
                if ($activeSemester) {
                    $q->where('semester_id', $activeSemester->id);
                }
            },
        ])
        // Provide sums aligned with schema
        ->withSum([
            'facultyLoads as total_units_sum' => function ($q) use ($activeSemester) {
                if ($activeSemester) {
                    $q->where('semester_id', $activeSemester->id);
                }
            }
        ], 'total_units')
        ->withSum([
            'facultyLoads as official_load_sum' => function ($q) use ($activeSemester) {
                if ($activeSemester) {
                    $q->where('semester_id', $activeSemester->id);
                }
            }
        ], 'official_load')
        ->withSum([
            'facultyLoads as student_count_sum' => function ($q) use ($activeSemester) {
                if ($activeSemester) {
                    $q->where('semester_id', $activeSemester->id);
                }
            }
        ], 'student_count')
        ->latest()
        ->get();

    return Inertia::render('ProgramHead/Faculty/FacultyLoad', [
        'faculties' => $faculties,
        'activeSemester' => $activeSemester,
    ]);
}
public function assignFaculty()
{
    $user = auth()->user(); 

    if (!$user || $user->role !== 'program_head') {
        abort(403, 'Unauthorized');
    }

    // ✅ Active Semester
    $activeSemester = Semester::where('is_active', 1)->first();

    // ✅ Faculties with schedules filtered by active semester
    $faculties = Users::where('role', 'faculty')
        ->where('department_id', $user->department_id)
        ->with([
            'department',
            'facultyLoads',
            'class_schedules' => function ($q) use ($activeSemester) {
                if ($activeSemester) {
                    $q->where('semester_id', $activeSemester->id);
                }
            },
            'class_schedules.curriculumSubject.subject:id,descriptive_title,code,department_id',
            'class_schedules.curriculumSubject.yearLevel:id,year_level',
            'class_schedules.curriculumSubject.semester:id,is_active',
            'class_schedules.section:id,section,year_level_id',
            'class_schedules.classroom:id,room_number',
        ])
        ->latest()
        ->get();

    // ✅ Sections with year level — only those in same department
    $sections = Section::select('id', 'section', 'year_level_id')
        ->where('department_id', $user->department_id)
        ->with('yearLevel:id,year_level')
        ->get();

    // ✅ CurriculumSubjects (active semester, same dept, approved curricula only)
    $curriculumSubjects = [];
    if ($activeSemester) {
        $curriculumSubjects = Curriculum_Subject::where('semesters_id', $activeSemester->id)
            ->whereHas('curriculum', function ($q) use ($user) {
                // ✅ only approved curricula in the same department
                $q->where('status', 'approved')
                  ->where('department_id', $user->department_id);
            })
            ->with([
                'subject:id,descriptive_title,code,department_id',
                'yearLevel:id,year_level',
                'semester:id,is_active',
                // include curriculum department for client-side guards if needed
                'curriculum:id,status,department_id',
            ])
            ->get(['id', 'subject_id', 'year_level_id', 'semesters_id', 'curricula_id']);
    }

    // ✅ Year Levels
    $yearLevels = Year_Level::select('id', 'year_level')->get();

    // ✅ Classrooms
    $classrooms = Classrooms::select('id', 'room_number')->get();

    // ✅ Semesters (list) — include for client-side filters
    $semesters = Semester::select('id', 'semester', 'is_active')->get();

    $departmentCourses = \App\Models\courses::where('department_id', $user->department_id)
        ->orderBy('name')
        ->get(['id', 'name', 'code']);

    return Inertia::render('ProgramHead/Faculty/AssignFaculty', [
        'faculties'          => $faculties,
        'sections'           => $sections,
        'curriculumSubjects' => $curriculumSubjects,
        'yearLevels'         => $yearLevels,
        'classrooms'         => $classrooms,
        'activeSemester'     => $activeSemester,
        'semesters'          => $semesters,
        'user'               => $user,
        'defaultCourses'     => $departmentCourses,
    ]);
}






    public function store(Request $request)
    {
        $validated = $request->validate([
            'fName'      => 'required|string|max:255',
            'mName'      => 'nullable|string|max:255',
            'lName'      => 'required|string|max:255',
            'suffix'     => 'nullable|string|max:10|in:Jr.,Sr.,III,IV',
            'id_number'  => 'required|string|max:50|unique:users,id_number',
            'contact'    => 'nullable|string|max:50',
            'address'    => 'nullable|string|max:255',
            'profession' => 'nullable|string|max:255',
            'gender'     => 'nullable|string|in:Male,Female,Other',
            'email'      => 'required|email|unique:users,email',
        ]);

        $programHead = Auth::user(); // currently logged-in Program Head

        Users::create([
            'fName'        => $validated['fName'],
            'mName'        => $validated['mName'] ?? null,
            'lName'        => $validated['lName'],
            'suffix'       => $validated['suffix'] ?? null,
            'id_number'    => $validated['id_number'],
            'contact'      => $validated['contact'] ?? null,
            'address'      => $validated['address'] ?? null,
            'profession'   => $validated['profession'] ?? null,
            'gender'       => $validated['gender'] ?? null,
            'email'        => $validated['email'],
            'role'         => 'faculty',
            'department_id'=> $programHead->department_id,
        ]);

        return redirect()->back()->with('success', 'Faculty created successfully.');
    }

    public function update(Request $request, $id)
    {
        $faculty = Users::where('role', 'faculty')->findOrFail($id);

        $validated = $request->validate([
            'fName'      => 'required|string|max:255',
            'mName'      => 'nullable|string|max:255',
            'lName'      => 'required|string|max:255',
            'suffix'     => 'nullable|string|max:10|in:Jr.,Sr.,III,IV',
            'id_number'  => ['required','string','max:50', Rule::unique('users','id_number')->ignore($faculty->id)],
            'contact'    => 'nullable|string|max:50',
            'address'    => 'nullable|string|max:255',
            'profession' => 'nullable|string|max:255',
            'gender'     => 'nullable|string|in:Male,Female,Other',
            'email'      => ['required', 'email', Rule::unique('users', 'email')->ignore($faculty->id)],
        ]);

        $faculty->update([
            'fName'      => $validated['fName'],
            'mName'      => $validated['mName'] ?? null,
            'lName'      => $validated['lName'],
            'suffix'     => $validated['suffix'] ?? null,
            'id_number'  => $validated['id_number'],
            'contact'    => $validated['contact'] ?? null,
            'address'    => $validated['address'] ?? null,
            'profession' => $validated['profession'] ?? null,
            'gender'     => $validated['gender'] ?? null,
            'email'      => $validated['email'],
        ]);

        return redirect()->back()->with('success', 'Faculty updated successfully.');
    }


//////////////////////////////////////////////////////////////////////////////////////////////////
public function addSched(Request $request)
{
    $validated = $request->validate([
        'schedules' => 'required|array',
        'schedules.*.start_time' => 'required|date_format:H:i',
        'schedules.*.end_time' => 'required|date_format:H:i|after:schedules.*.start_time',
        'schedules.*.schedule_day' => 'required|string',
        'schedules.*.curriculum_subject_id' => 'required|exists:curriculum_subject,id',
        'schedules.*.faculty_id' => 'nullable|exists:users,id',
        'schedules.*.classroom_id' => 'nullable|exists:classrooms,id',
        'schedules.*.section_id' => 'required|exists:sections,id',
        'schedules.*.color' => 'nullable|string|max:20',
    ]);

    // ✅ Active school year & semester
    $activeSchoolYear = AcademicYear::where('is_active', 1)->first();
    $activeSemester   = Semester::where('is_active', 1)->first();

    if (!$activeSchoolYear || !$activeSemester) {
        return redirect()->back()->withErrors([
            'school_year' => !$activeSchoolYear ? 'No active school year found!' : null,
            'semester'    => !$activeSemester ? 'No active semester found!' : null,
        ]);
    }
    
    // Get the logged-in program head's department ID
    $programHead = auth()->user();
    $departmentId = $programHead->department_id;
    
    if (!$departmentId) {
        return redirect()->back()->withErrors([
            'department' => 'No department assigned to the program head!',
        ]);
    }

    DB::beginTransaction();
    try {
        foreach ($validated['schedules'] as $sched) {
            $sched['school_year_id'] = $activeSchoolYear->id;
            $sched['semester_id']    = $activeSemester->id;

            // Auto-fill year_level_id
            $yearLevelId = Section::where('id', $sched['section_id'])->value('year_level_id')
                        ?? Curriculum_Subject::where('id', $sched['curriculum_subject_id'])->value('year_level_id');
            $sched['year_level_id'] = $yearLevelId;

            // Auto-calculate load_hours
            $start = \Carbon\Carbon::createFromFormat('H:i', $sched['start_time']);
            $end   = \Carbon\Carbon::createFromFormat('H:i', $sched['end_time']);
            $sched['load_hours'] = $end->diffInMinutes($start) / 60;

            // Get the curriculum subject with curriculum and course info
            $curriculumSubject = Curriculum_Subject::with(['curriculum' => function($query) use ($departmentId) {
                $query->where('department_id', $departmentId);
            }, 'curriculum.course'])->find($sched['curriculum_subject_id']);
            
            if (!$curriculumSubject || !$curriculumSubject->curriculum) {
                return response()->json([
                    'message' => 'No curriculum found for the selected subject in your department',
                    'errors' => ['curriculum' => 'No curriculum found for the selected subject in your department']
                ], 422);
            }
            
            $coursesId = $curriculumSubject->curriculum->courses_id ?? null;
            
            if (!$coursesId) {
                return response()->json([
                    'message' => 'No course assigned to the curriculum',
                    'errors' => ['course' => 'No course assigned to the curriculum']
                ], 422);
            }
            
            // Prepare the data for update or create
            $scheduleData = [
                'start_time' => $sched['start_time'],
                'end_time' => $sched['end_time'],
                'schedule_day' => $sched['schedule_day'],
                'semester_id' => $sched['semester_id'],
                'school_year_id' => $sched['school_year_id'],
                'section_id' => $sched['section_id'],
                'classroom_id' => $sched['classroom_id'] ?? null,
                'curriculum_subject_id' => $sched['curriculum_subject_id'],
                'faculty_id' => $sched['faculty_id'] ?? null,
                'year_level_id' => $yearLevelId,
                'courses_id' => $coursesId,
                'load_hours' => $end->diffInMinutes($start) / 60,
                'color' => $sched['color'] ?? '#dbeafe',
            ];

            // Update or create schedule
            $schedule = Class_Schedules::updateOrCreate(
                [
                    'schedule_day' => $sched['schedule_day'],
                    'semester_id' => $sched['semester_id'],
                    'school_year_id' => $sched['school_year_id'],
                    'section_id' => $sched['section_id'],
                    'curriculum_subject_id' => $sched['curriculum_subject_id'],
                ],
                $scheduleData
            );

            $this->syncEnrollmentSubjectsWithSchedule($schedule);

            // Also reflect to faculty_load table (upsert)
            $cs = Curriculum_Subject::with(['curriculum'])->find($sched['curriculum_subject_id']);
            $lec = (float) ($cs->lec_unit ?? 0);
            $lab = (float) ($cs->lab_unit ?? 0);
            $units = $lec + $lab;
            $coursesId = optional($cs->curriculum)->courses_id ?? null;

            // ✅ Ensure type is valid for ENUM ('Regular', 'Part-Time')
            $validTypes = ['Regular', 'Part-Time'];
            $facultyType = $cs->type ?? 'Regular';
            if (!in_array($facultyType, $validTypes)) {
                $facultyType = 'Regular';
            }

            FacultyLoad::updateOrCreate(
                [
                    'faculty_id'            => $sched['faculty_id'],
                    'curriculum_subject_id' => $sched['curriculum_subject_id'],
                    'semester_id'           => $sched['semester_id'],
                    'school_year_id'        => $sched['school_year_id'],
                ],
                [
                    'courses_id'     => $coursesId,
                    'type'           => $facultyType,
                    'official_load'  => $units,
                    'total_units'    => $units,
                    'units'          => $units,
                    'student_count'  => 0,
                ]
            );
        }

        DB::commit();

        return redirect()->back()->with('success', 'All schedules saved successfully!');
    } catch (\Exception $e) {
        DB::rollBack();
        return redirect()->back()->withErrors(['error' => 'Failed to save schedules: ' . $e->getMessage()]);
    }
}
}