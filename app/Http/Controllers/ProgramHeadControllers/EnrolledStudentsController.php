<?php

namespace App\Http\Controllers\ProgramHeadControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Users;
use App\Models\Enrollments;
use App\Models\Grades;
use App\Models\Curriculum_Subject;
use App\Models\CreditedSubject;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EnrolledStudentsController extends Controller
{
    private const PROGRAM_HEAD_DROP_REASON = 'Enrollment cancelled by Program Head';

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
                $q->select('id', 'enrollment_id', 'class_schedule_id', 'curriculum_subject_id')
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
                              'section:id,section',
                          ]);
                      },
                      'curriculumSubject' => function ($curriculumSubject) {
                          $curriculumSubject->select('id', 'subject_id', 'lec_unit', 'lab_unit')
                              ->with([
                                  'subject:id,code,descriptive_title',
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
            'unenrolled_at',
            'unenrolled_by',
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

    public function reenroll(Request $request, $enrollmentId)
    {
        $programHead = auth()->user();

        $enrollment = Enrollments::with(['course', 'student'])
            ->where('id', $enrollmentId)
            ->whereHas('course', function ($query) use ($programHead) {
                $query->where('department_id', $programHead->department_id);
            })
            ->firstOrFail();

        if ($enrollment->status === 'enrolled') {
            return back()->withErrors(['error' => 'Student is already enrolled.']);
        }

        if ($enrollment->status !== 'unenrolled') {
            return back()->withErrors(['error' => 'Only unenrolled students can be re-enrolled.']);
        }

        try {
            DB::transaction(function () use ($enrollment) {
                $enrollment->update([
                    'status' => 'enrolled',
                    'unenrolled_by' => null,
                    'unenrolled_at' => null,
                    'enrolled_at' => $enrollment->enrolled_at ?? now(),
                ]);

                $enrollment->enrollmentSubjects()
                    ->where('status', 'dropped')
                    ->where('drop_reason', self::PROGRAM_HEAD_DROP_REASON)
                    ->update([
                        'status' => 'enrolled',
                        'drop_reason' => null,
                        'dropped_at' => null,
                        'dropped_by' => null,
                    ]);
            });

            Log::info('Program Head re-enrolled student', [
                'enrollment_id' => $enrollment->id,
                'student_id' => $enrollment->student_id,
                'processed_by' => auth()->id(),
            ]);

            return back()->with('success', 'Student has been successfully re-enrolled.');
        } catch (\Exception $e) {
            Log::error('Failed to re-enroll student', [
                'enrollment_id' => $enrollmentId,
                'error' => $e->getMessage(),
            ]);

            return back()->withErrors(['error' => 'Failed to re-enroll student. Please try again.']);
        }
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
                'unenrolled_at',
                'unenrolled_by',
            ]);

        return Inertia::render('ProgramHead/Students/StudentsList', [
            'enrollments' => $enrollments,
            'department' => $programHead->department,
        ]);
    }

    public function profile($studentId)
    {
        $programHead = auth()->user();

    // Get student with all student details from student_details table
    $student = Users::with([
        'studentDetails' => function ($query) {
            // Load all fields from student_details table
            $query->select([
                'id',
                'user_id',
                'campus',
                'birth_date',
                'place_of_birth',
                'height_ft',
                'weight_kg',
                'contact_number',
                'email_address',
                'exam_result',
                'current_address_street',
                'current_address_barangay',
                'current_address_municipality',
                'current_address_province',
                'home_address_street',
                'home_address_barangay',
                'home_address_municipality',
                'home_address_province',
                'father_name',
                'father_contact',
                'father_occupation',
                'mother_maiden_name',
                'mother_contact',
                'mother_occupation',
                'guardian_name',
                'guardian_contact',
                'guardian_occupation',
                'last_school_attended',
                'last_school_name',
                'last_school_year_graduated',
                'college_name',
                'college_year_graduated',
                'senior_high_school_name',
                'senior_high_school_year_graduated',
                'junior_high_school_name',
                'junior_high_school_year_graduated',
                'elementary_school_name',
                'elementary_school_year_graduated',
                'admission_type',
                'transfer_status',
                'student_status',
                'department_id',
            ]);
        }
    ])
        ->where('id', $studentId)
        ->where('role', 'student')
        ->firstOrFail();

    // Get all enrollments for this student in the program head's department
    $enrollments = Enrollments::with([
        'course:id,code,name,department_id',
        'major:id,code,name',
        'yearLevel:id,year_level',
        'section:id,section',
        'semester:id,semester',
        'schoolYear:id,school_year',
        'unenrolledBy:id,fName,lName',
    ])
        ->where('student_id', $studentId)
        ->whereHas('course', function ($query) use ($programHead) {
            $query->where('department_id', $programHead->department_id);
        })
        ->orderBy('enrolled_at', 'desc')
        ->get([
            'id',
            'student_id',
            'courses_id',
            'majors_id',
            'year_level_id',
            'section_id',
            'semester_id',
            'school_year_id',
            'status',
            'enrolled_at',
            'student_type',
            'unenrolled_at',
            'unenrolled_by',
        ]);

    // Identify primary enrollment (currently enrolled or most recent)
    $primaryEnrollment = $enrollments->firstWhere('status', 'enrolled') ?? $enrollments->first();

    // Fetch curriculum subjects + schedules based on the student's active curriculum
    $curriculumSubjects = collect();
    if ($primaryEnrollment) {
        $curriculumSubjects = Curriculum_Subject::with([
            'subject:id,code,descriptive_title',
            'yearLevel:id,year_level',
            'semester:id,semester',
            'classSchedules' => function ($query) {
                $query->select('id', 'curriculum_subject_id', 'schedule_day', 'start_time', 'end_time', 'classroom_id', 'faculty_id')
                    ->with([
                        'classroom:id,room_number',
                        'faculty:id,fName,lName',
                    ]);
            },
        ])
            ->whereHas('curriculum', function ($query) use ($primaryEnrollment, $programHead) {
                $query->where('department_id', $programHead->department_id);

                if ($primaryEnrollment->courses_id) {
                    $query->where('courses_id', $primaryEnrollment->courses_id);
                }

                if ($primaryEnrollment->majors_id) {
                    $query->where(function ($inner) use ($primaryEnrollment) {
                        $inner->whereNull('majors_id')
                            ->orWhere('majors_id', $primaryEnrollment->majors_id);
                    });
                }
            })
            ->orderBy('year_level_id')
            ->orderBy('subject_id')
            ->get([
                'id',
                'curricula_id',
                'subject_id',
                'year_level_id',
                'semesters_id',
                'lec_unit',
                'lab_unit',
            ]);
    }

    // Get enrollment subjects for all enrollments
    $enrollmentIds = $enrollments->pluck('id');
    
    // Get enrollment subjects with all relationships
    // Access subjects through curriculum_subject using curriculum_subject_id from enrollment_subjects table
    $enrollmentSubjects = \App\Models\EnrollmentSubject::with([
        'enrollment:id,semester_id',
        'enrollment.semester:id,semester',
        'curriculumSubject.subject:id,code,descriptive_title',
        'curriculumSubject.yearLevel:id,year_level',
        'curriculumSubject.semester:id,semester',
        'classSchedule' => function ($query) {
            $query->with([
                'curriculumSubject.subject:id,code,descriptive_title',
                'classroom:id,room_number',
                'faculty:id,fName,lName',
            ]);
        },
    ])
        ->whereIn('enrollment_id', $enrollmentIds)
        ->whereIn('status', ['enrolled', 'reserved']) // Only get enrolled or reserved subjects
        ->get();
    
    // Debug: Log enrollment subjects count
    \Log::info('Enrollment Subjects Loaded', [
        'enrollment_ids' => $enrollmentIds->toArray(),
        'count' => $enrollmentSubjects->count(),
        'subjects' => $enrollmentSubjects->map(function ($es) {
            return [
                'id' => $es->id,
                'enrollment_id' => $es->enrollment_id,
                'curriculum_subject_id' => $es->curriculum_subject_id,
                'class_schedule_id' => $es->class_schedule_id,
                'status' => $es->status,
                'has_curriculum_subject' => $es->curriculumSubject ? true : false,
                'has_class_schedule' => $es->classSchedule ? true : false,
            ];
        })->toArray(),
    ]);

    // Get grades for all enrollments
    $grades = Grades::whereIn('enrollment_id', $enrollmentIds)
        ->get([
            'id',
            'enrollment_id',
            'class_schedule_id',
            'midterm',
            'final',
            'remarks',
            'midterm_status',
            'final_status',
        ]);

    // Get student details from student_details table
    $studentDetailsData = $student->studentDetails;

    $creditedSubjects = CreditedSubject::query()
        ->where('student_id', $studentId)
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

    return Inertia::render('ProgramHead/Students/StudentProfile', [
        'student' => $student,
        'studentDetails' => $studentDetailsData, // Data from student_details table
        'enrollments' => $enrollments,
        'enrollmentSubjects' => $enrollmentSubjects,
        'curriculumSubjects' => $curriculumSubjects,
        'grades' => $grades,
        'department' => $programHead->department,
        'creditedSubjects' => $creditedSubjects,
    ]);
}

public function unenroll(Request $request, $enrollmentId)
{
    $programHead = auth()->user();

    $enrollment = Enrollments::with(['course', 'student'])
        ->where('id', $enrollmentId)
        ->whereHas('course', function ($query) use ($programHead) {
            $query->where('department_id', $programHead->department_id);
        })
        ->firstOrFail();

    if ($enrollment->status === 'unenrolled') {
        return back()->withErrors(['error' => 'Student is already unenrolled.']);
    }

    try {
        $processedBy = optional(auth()->user())->id;
        $timestamp = now();

        DB::transaction(function () use ($enrollment, $processedBy, $timestamp) {
            $enrollment->update([
                'status' => 'unenrolled',
                'unenrolled_by' => $processedBy,
                'unenrolled_at' => $timestamp,
            ]);

            $enrollment->enrollmentSubjects()
                ->whereIn('status', ['enrolled', 'reserved', null])
                ->update([
                    'status' => 'dropped',
                    'drop_reason' => self::PROGRAM_HEAD_DROP_REASON,
                    'dropped_at' => $timestamp,
                    'dropped_by' => $processedBy,
                ]);
        });

        Log::info('Program Head unenrolled student', [
            'enrollment_id' => $enrollment->id,
            'student_id' => $enrollment->student_id,
            'processed_by' => auth()->id(),
        ]);

        return back()->with('success', 'Student has been successfully unenrolled.');
    } catch (\Exception $e) {
        Log::error('Failed to unenroll student', [
            'enrollment_id' => $enrollmentId,
            'error' => $e->getMessage(),
        ]);

        return back()->withErrors(['error' => 'Failed to unenroll student. Please try again.']);
    }
}

}
