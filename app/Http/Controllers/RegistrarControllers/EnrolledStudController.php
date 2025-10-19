<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Enrollments;

class EnrolledStudController extends Controller
{
   public function index(Request $request)
{
    $students = Enrollments::with([
        'user:id,id_number,fName,mName,lName',
        'yearLevel:id,year_level',
        'section:id,section',
        'course:id,code,name,department_id',
        'major:id,code,name',
        'schoolYear:id,school_year',
        'semester:id,semester', // ✅ include semester
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
                          'curriculumSubject:id,subject_id,lec_unit,lab_unit',
                          'curriculumSubject.subject:id,code,descriptive_title',
                          'classroom:id,room_number',
                          'faculty:id,fName,lName',
                      ]);
                  },
              ]);
        },
    ])
    ->where('status', 'enrolled')
    ->orderBy('enrolled_at', 'desc') // ✅ latest enrolled students first
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

    return Inertia::render('Registrar/Enrollment/RegistrarEnrolledStudents', [
        'enrolledStudents' => $students,
        'evaluator'        => auth()->user(),
    ]);
}
}