<?php

namespace App\Http\Controllers\AdminControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Enrollments;
use App\Models\Requirement;
use App\Models\Users;
use App\Models\Grades;
use App\Models\class_schedules as ClassSchedule;
use App\Models\AcademicYear;
use App\Models\Semester;
use App\Models\YearLevel;
use Illuminate\Support\Facades\DB;

class AcademicRecordsController extends Controller
{
    /**
     * Display enrolled students with latest enrollment details.
     */
    public function students()
    {
        $students = Enrollments::with([
                'student:id,fName,mName,lName,id_number,profile_picture',
                'course:id,code,name',
                'major:id,code,name',
                'yearLevel:id,year_level',
                'section:id,section',
                'semester:id,semester',
                'schoolYear:id,school_year',
                'enrollmentSubjects.classSchedule.curriculumSubject',
                'enrollmentSubjects.classSchedule.curriculumSubject.subject:id,code,descriptive_title',
                'enrollmentSubjects.classSchedule.classroom:id,room_number',
                'enrollmentSubjects.classSchedule.faculty:id,fName,lName',
            ])
            ->where('status', 'enrolled')
            ->orderByDesc('enrolled_at')
            ->get([
                'id',
                'student_id',
                'courses_id',
                'majors_id',
                'year_level_id',
                'semester_id',
                'section_id',
                'school_year_id',
                'status',
                'enrolled_at',
            ])
            ->map(function ($enrollment) {
                $enrollment->school_year_label = optional($enrollment->schoolYear)->school_year;
                return $enrollment;
            });

        return Inertia::render('Admin/Academic/Students', [
            'students' => $students,
        ]);
    }

    /**
     * Display grade viewing list (links to detailed grade page).
     */
    public function gradeList(Request $request)
    {
        $perPage = (int) $request->input('per_page', 9);
        $perPage = $perPage > 0 ? $perPage : 9;
        $search = trim((string) $request->input('search'));

        $students = Enrollments::with([
                'student:id,fName,mName,lName,id_number',
                'course:id,code',
                'yearLevel:id,year_level',
                'semester:id,semester',
                'schoolYear:id,school_year',
                'section:id,section',
            ])
            ->where('status', 'enrolled')
            ->when($search !== '', function ($query) use ($search) {
                $like = "%{$search}%";

                $query->where(function ($q) use ($like) {
                    $q->whereHas('student', function ($student) use ($like) {
                        $student->where(function ($nameQuery) use ($like) {
                            $nameQuery->where('fName', 'like', $like)
                                ->orWhere('mName', 'like', $like)
                                ->orWhere('lName', 'like', $like)
                                ->orWhere('id_number', 'like', $like);
                        });
                    })
                    ->orWhereHas('course', function ($course) use ($like) {
                        $course->where('code', 'like', $like)
                            ->orWhere('name', 'like', $like);
                    })
                    ->orWhereHas('yearLevel', function ($yearLevel) use ($like) {
                        $yearLevel->where('year_level', 'like', $like);
                    })
                    ->orWhereHas('semester', function ($semester) use ($like) {
                        $semester->where('semester', 'like', $like);
                    })
                    ->orWhereHas('schoolYear', function ($schoolYear) use ($like) {
                        $schoolYear->where('school_year', 'like', $like);
                    });
                });
            })
            ->orderByDesc('enrolled_at')
            ->paginate($perPage)
            ->withQueryString()
            ->through(function ($enrollment) {
                $enrollment->school_year_label = optional($enrollment->schoolYear)->school_year;
                return $enrollment;
            });

        return Inertia::render('Admin/Academic/Grades', [
            'students' => $students,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Show detailed grades for a given student enrollment.
     */
    public function studentGrades($studentId)
    {
        $enrollment = Enrollments::with([
                'student:id,fName,mName,lName,id_number,email,profile_picture',
                'course:id,code,name',
                'yearLevel:id,year_level',
                'section:id,section',
                'semester:id,semester',
                'schoolYear:id,school_year',
                'enrollmentSubjects.classSchedule.curriculumSubject.subject:id,code,descriptive_title',
                'enrollmentSubjects.classSchedule.yearLevel:id,year_level',
                'enrollmentSubjects.classSchedule.semester:id,semester',
            ])
            ->where('student_id', $studentId)
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

        return Inertia::render('Admin/Academic/StudentGrades', [
            'student' => $enrollment->student,
            'course' => $enrollment->course,
            'yearLevel' => $enrollment->yearLevel,
            'section' => $enrollment->section,
            'semester' => $enrollment->semester,
            'schoolYear' => $enrollment->schoolYear,
            'enrolledSubjects' => $enrollment->enrollmentSubjects,
        ]);
    }

    /**
     * List requirements grouped by applicant type.
     */
    public function requirements()
    {
        $enumValues = DB::select("SHOW COLUMNS FROM requirements LIKE 'required_for'");
        preg_match("/^enum\('(.*)'\)$/", $enumValues[0]->Type, $matches);
        $requiredForOptions = explode("','", $matches[1]);

        $requirements = Requirement::all();

        return Inertia::render('Admin/Academic/Requirements', [
            'requirements' => $requirements,
            'requiredForOptions' => $requiredForOptions,
        ]);
    }

    /**
     * Store a new requirement.
     */
    public function storeRequirement(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'required_for' => 'required|string',
        ]);

        Requirement::create($validated);

        return redirect()->route('admin.academic.requirements')
            ->with('success', 'Requirement added successfully!');
    }

    /**
     * Update an existing requirement record.
     */
    public function updateRequirement(Request $request, Requirement $requirement)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'required_for' => 'required|string',
            'status' => 'boolean',
        ]);

        $requirement->update($validated);

        return redirect()->route('admin.academic.requirements')
            ->with('success', 'Requirement updated successfully!');
    }

    /**
     * Show submitted requirements per student.
     */
    public function submittedRequirements()
    {
        $students = Users::where('role', 'student')
            ->with(['studentRequirements.requirement'])
            ->get([
                'id',
                'fName',
                'mName',
                'lName',
                'profile_picture',
            ]);

        return Inertia::render('Admin/Academic/SubmittedRequirements', [
            'students' => $students,
        ]);
    }

    /**
     * Display class schedules grouped by school year, semester, and year level.
     */
    public function classSchedules(Request $request)
    {
        $filters = [
            'school_year_id' => $request->input('school_year_id'),
            'semester_id' => $request->input('semester_id'),
            'year_level_id' => $request->input('year_level_id'),
            'section_id' => $request->input('section_id'),
            'course_id' => $request->input('course_id'),
        ];

        $schedulesQuery = ClassSchedule::with([
                'schoolYear:id,school_year',
                'semester:id,semester',
                'yearLevel:id,year_level',
                'section:id,section,year_level_id',
                'section.yearLevel:id,year_level',
                'curriculumSubject.subject:id,descriptive_title,code',
                'course:id,code,name,department_id',
                'course.department:id,name',
                'classroom:id,room_number',
                'faculty:id,fName,mName,lName',
            ])
            ->select('class_schedules.*')
            ->orderByDesc('school_year_id')
            ->orderByDesc('semester_id')
            ->orderBy('year_level_id')
            ->orderBy('schedule_day')
            ->orderBy('start_time')
            ->when($filters['school_year_id'], function ($query, $id) {
                $query->where('school_year_id', $id);
            })
            ->when($filters['semester_id'], function ($query, $id) {
                $query->where('semester_id', $id);
            })
            ->when($filters['year_level_id'], function ($query, $id) {
                $query->where('year_level_id', $id);
            })
            ->when($filters['section_id'], function ($query, $id) {
                $query->where('section_id', $id);
            })
            ->when($filters['course_id'], function ($query, $id) {
                $query->where('courses_id', $id);
            });

        $schedules = $schedulesQuery->get();

        $groupedSchedules = $schedules
            ->groupBy(function ($schedule) {
                return $schedule->courses_id ?? 'uncategorized';
            })
            ->map(function ($courseSchedules) {
                $course = optional($courseSchedules->first()->course);
                $department = optional($course->department);

                $schoolYears = $courseSchedules
                    ->groupBy(function ($schedule) {
                        return optional($schedule->schoolYear)->school_year ?? 'Unassigned School Year';
                    })
                    ->map(function ($bySchoolYear) {
                        return $bySchoolYear
                            ->groupBy(function ($schedule) {
                                return optional($schedule->semester)->semester ?? 'Unassigned Semester';
                            })
                            ->map(function ($bySemester) {
                                return $bySemester
                                    ->groupBy(function ($schedule) {
                                        return optional($schedule->yearLevel)->year_level
                                            ?? optional(optional($schedule->section)->yearLevel)->year_level
                                            ?? 'Unassigned Year Level';
                                    })
                                    ->map(function ($items) {
                                        return $items->map(function ($schedule) {
                                            $subject = optional($schedule->curriculumSubject)->subject;
                                            $course = optional($schedule->course);
                                            $department = optional($course->department);
                                            $faculty = $schedule->faculty;
                                            $facultyData = $faculty ? $faculty->only(['id', 'fName', 'mName', 'lName']) : null;

                                            return [
                                                'id' => $schedule->id,
                                                'day' => $schedule->schedule_day,
                                                'time' => $schedule->formatted_time,
                                                'start_time' => $schedule->start_time,
                                                'end_time' => $schedule->end_time,
                                                'load_hours' => $schedule->load_hours,
                                                'subject' => $subject->descriptive_title ?? 'N/A',
                                                'subject_code' => $subject->code ?? 'N/A',
                                                'course' => $course->code ?? 'N/A',
                                                'course_name' => $course->name ?? 'N/A',
                                                'department' => $department->name ?? 'N/A',
                                                'section' => optional($schedule->section)->section ?? 'N/A',
                                                'section_id' => $schedule->section_id,
                                                'classroom' => optional($schedule->classroom)->room_number ?? 'N/A',
                                                'faculty' => $facultyData,
                                            ];
                                        })->values();
                                    })
                                    ->toArray();
                            })
                            ->toArray();
                    })
                    ->toArray();

                return [
                    'course_id' => $course->id ?? null,
                    'course_code' => $course->code ?? 'Unassigned Course',
                    'course_name' => $course->name ?? 'Unassigned Course',
                    'department_id' => $department->id ?? null,
                    'department_name' => $department->name ?? 'Unassigned Department',
                    'school_years' => $schoolYears,
                ];
            })
            ->values()
            ->toArray();

        $schoolYears = AcademicYear::orderByDesc('school_year')->get(['id', 'school_year']);
        $semesters = Semester::orderBy('semester')->get(['id', 'semester']);
        $yearLevels = YearLevel::orderBy('year_level')->get(['id', 'year_level']);
        $courses = DB::table('courses')
            ->select('id', 'code', 'name')
            ->orderBy('code')
            ->get();
        $sections = DB::table('sections')
            ->select('id', 'section', 'year_level_id')
            ->orderBy('section')
            ->get();

        return Inertia::render('Admin/AcademicSetup/ClassSchedules', [
            'groupedSchedules' => $groupedSchedules,
            'filters' => $filters,
            'options' => [
                'schoolYears' => $schoolYears,
                'semesters' => $semesters,
                'yearLevels' => $yearLevels,
                'courses' => $courses,
                'sections' => $sections,
            ],
        ]);
    }
}
