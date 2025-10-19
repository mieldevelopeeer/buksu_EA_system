<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Class_Schedules;
use App\Models\EnrollmentSubject;
use App\Models\Grades;
use App\Models\Users; 
use App\Models\Enrollments; 
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use App\Mail\StudentCreated;
use App\Models\Requirement;
use App\Models\StudentRequirement;

class StudentRecsController extends Controller
{
    // Fetch submitted grades
    public function studentGrades(Request $request)
    {
        // Get active semester
        $activeSemester = DB::table('semesters')->where('is_active', 1)->first();

        if (!$activeSemester) {
            return Inertia::render('Registrar/Students/StudentGrades', [
                'schedules' => [],
                'activeSemester' => null,
            ]);
        }

        // Fetch schedules along with section, subject, course, and faculty
        $schedules = Class_Schedules::with([
            'section',
            'section.yearLevel',
            'curriculumSubject.subject',
            'faculty',
            'classroom',
            'enrollments.course' // pull course from enrollments
        ])
        ->where('semester_id', $activeSemester->id)
        ->orderBy('schedule_day')
        ->orderBy('start_time')
        ->get();

        // Map enrolled students with submitted grades
        $schedules->map(function ($sched) {
            $enrolledSubjects = EnrollmentSubject::with(['enrollment.student'])
                ->where('class_schedule_id', $sched->id)
                ->get();

            $sched->students = $enrolledSubjects->map(function ($enrolled) use ($sched) {
                $enrollment = $enrolled->enrollment;
                $student = $enrollment->student ?? null;

                if ($student && $enrollment->status === 'enrolled') {
                    $grade = $enrolled->grades()
                        ->where('class_schedule_id', $sched->id)
                        ->where('status', 'submitted')
                        ->first();

                    if (!$grade) return null;

                    return [
                        'enrollment_id' => $enrollment->id,
                        'id' => $student->id,
                        'name' => $student->fName . ' ' . $student->lName,
                        'midterm' => $grade->midterm,
                        'final' => $grade->final,
                        'remarks' => $grade->remarks,
                        'status' => $grade->status,
                    ];
                }

                return null;
            })->filter()->values();

            // Additional fields for frontend display
            $sched->faculty_name = $sched->faculty 
                ? $sched->faculty->fName . ' ' . $sched->faculty->lName 
                : 'N/A';

            $sched->course_code = $sched->curriculum_subject && $sched->curriculum_subject->course
                ? $sched->curriculum_subject->course->code
                : 'N/A';

            $sched->year_level = $sched->section && $sched->section->yearLevel
                ? $sched->section->yearLevel->year_level
                : 'N/A';
        });

        return Inertia::render('Registrar/Students/StudentGrades', [
            'schedules' => $schedules,
            'activeSemester' => $activeSemester,
        ]);
    }

    // Confirm or reject a submitted grade
    public function confirmGrade(Request $request)
    {
        $request->validate([
            'enrollment_id' => 'required|exists:enrollments,id',
            'class_schedule_id' => 'required|exists:class_schedules,id',
            'status' => 'required|in:confirmed,rejected',
        ]);

        $grade = Grades::where('enrollment_id', $request->enrollment_id)
            ->where('class_schedule_id', $request->class_schedule_id)
            ->where('status', 'submitted') // only submitted grades
            ->first();

        if (!$grade) {
            return response()->json(['message' => 'Grade not found or already confirmed.'], 404);
        }

        $grade->status = $request->status;
        $grade->confirmed_by = auth()->user()->id;
        $grade->confirmed_at = now();
        $grade->save();

        return back()->with('success', 'Student grade confirmed');
    }

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


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
//CREATE STUDENT ACCOUNT
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
        // 📧 Send credentials (username + password)
        Mail::to($student->email)->send(
            new StudentCreated($student, $rawPassword)
        );

        return back()->with('success', 'Student account created with username "' . $username . '" and credentials sent to ' . $student->email);
    } catch (\Exception $e) {
        return back()->with('error', 'Student account created but email sending failed: ' . $e->getMessage());
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////

public function studentProfiles()
{
    $students = Users::where('role', 'student')
        ->with([
            'enrollments.course:id,code',
            'enrollments.yearLevel:id,year_level',
            'enrollments.semester:id,semester',
            // remove requirements since you don’t want them
        ])
        ->get([
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
        ]);

    return Inertia::render('Registrar/Students/StudentProfile', [
        'students' => $students,
    ]);
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
    ->where('status', 'confirmed')
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



}
