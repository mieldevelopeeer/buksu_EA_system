<?php

namespace App\Http\Controllers\ProgramHeadControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Users;
use App\Models\Enrollments;

class EnrolledStudentsController extends Controller
{
    public function index(Request $request)
    {
        $programHead = auth()->user(); // ✅ Logged-in Program Head

        // ✅ Fetch enrolled students with nested relationships
        $students = Enrollments::with([
            'user:id,id_number,fName,mName,lName,email',
            'yearLevel:id,year_level',
            'section:id,section',
                        // ✅ Include code + name + department_id for course
            'course:id,code,name,department_id',

            // ✅ Include code + name for major
            'major:id,code,name',


            'schoolYear:id,school_year',
            'semester:id,semester',

            // ✅ Enrollment Subjects (with nested schedules)
            'enrollmentSubjects' => function ($q) {
                $q->select('id', 'enrollment_id', 'class_schedule_id')
                  ->with([
                      'classSchedule' => function ($cs) {
                          $cs->select(
                              'id',
                              'curriculum_subject_id',
                              'start_time',
                              'end_time',
                              'schedule_day',
                              'faculty_id',
                              'classroom_id',
                              'year_level_id',
                              'courses_id'
                          )
                          ->with([
                              // Curriculum + Subject
                              'curriculumSubject:id,subject_id,lec_unit,lab_unit',
                              'curriculumSubject.subject:id,code,descriptive_title',

                              // Extra info
                              'classroom:id,room_number',
                              'faculty:id,fName,lName',
                          ]);
                      },
                  ]);
            },
        ])
        ->where('status', 'enrolled')
        ->whereHas('course', function ($q) use ($programHead) {
            $q->where('department_id', $programHead->department_id);
        })
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
        ]);

        // 🔎 Debug log for backend
        foreach ($students as $student) {
            \Log::info("Student {$student->id} has " . $student->enrollmentSubjects->count() . " subjects");
              \Log::info("YearLevel relation: " . optional($student->yearLevel)->year_level);
        }

        return Inertia::render('ProgramHead/Students/EnrolledStudents', [
            'enrolledStudents' => $students,
             'evaluator' => auth()->user(),
        ]);
    }



public function students()
{
    $programHead = auth()->user();

    $enrollments = Enrollments::with([
            'student:id,fName,mName,lName,id_number,email,department_id',
            'course:id,code,name,department_id',
            'major:id,code,name',
            'yearLevel:id,year_level',
            'section:id,section',
        ])
        ->where('status', 'enrolled')
        ->whereHas('course', function ($query) use ($programHead) {
            $query->where('department_id', $programHead->department_id);
        })
        ->latest('enrolled_at')
        ->get([
            'id',
            'student_id',
            'courses_id',
            'majors_id',
            'year_level_id',
            'section_id',
            'status',
            'enrolled_at',
        ]);

    return Inertia::render('ProgramHead/Students/StudentsList', [
        'enrollments' => $enrollments,
        'department' => $programHead->department,
    ]);
}


}
