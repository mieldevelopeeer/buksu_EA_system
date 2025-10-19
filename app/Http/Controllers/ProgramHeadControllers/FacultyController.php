<?php

namespace App\Http\Controllers\ProgramHeadControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Models\Users; // Assuming faculty are stored in users table
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

use App\Models\Section;
use App\Models\Semester;
use App\Models\Class_Schedules;
use App\Models\subjects;
use App\Models\Curriculum_Subject;
use App\Models\year_level;
use App\Models\Classrooms;
use App\Models\AcademicYear;
use App\Models\FacultyLoad;
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

    return Inertia::render('ProgramHead/Faculty/Faculties', [
        'faculties' => $faculties,
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

            // Update or create schedule
            Class_Schedules::updateOrCreate(
                [
                    'schedule_day'          => $sched['schedule_day'],
                    'semester_id'           => $sched['semester_id'],
                    'school_year_id'        => $sched['school_year_id'],
                    'section_id'            => $sched['section_id'],
                    'classroom_id'          => $sched['classroom_id'],
                    'curriculum_subject_id' => $sched['curriculum_subject_id'],
                    'faculty_id'            => $sched['faculty_id'],
                ],
                $sched
            );

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