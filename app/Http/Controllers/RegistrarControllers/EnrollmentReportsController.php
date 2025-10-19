<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Enrollments;
use App\Models\Courses;
use App\Models\YearLevel;
use App\Models\Semester;
use App\Models\AcademicYear;

class EnrollmentReportsController extends Controller
{
    public function index(Request $request)
    {
        // Eager load relations including semester, major, and school year
        $query = Enrollments::with(['course', 'major', 'yearLevel', 'semester', 'student', 'schoolYear']);

        // Filters
        if ($request->filled('course_id')) {
            $query->where('course_id', $request->course_id);
        }

        if ($request->filled('year_level_id')) {
            $query->where('year_level_id', $request->year_level_id);
        }

        if ($request->filled('semester_id')) {
            $query->where('semester_id', $request->semester_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status); // 'enrolled', 'pending', 'dropped'
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('student', function ($q) use ($search) {
                $q->where('fName', 'like', "%{$search}%")
                    ->orWhere('mName', 'like', "%{$search}%")
                    ->orWhere('lName', 'like', "%{$search}%")
                    ->orWhere('id_number', 'like', "%{$search}%"); // ✅ search by id_number instead of student_id
            });
        }

        $enrollments = $query->orderBy('created_at', 'desc')->paginate(20);

        // ✅ Transform each enrollment to include full course code and student id_number
        $enrollments->getCollection()->transform(function ($enroll) {
            $enroll->full_course_code = $enroll->course
                ? ($enroll->major?->code
                    ? "{$enroll->course->code}-{$enroll->major->code}"
                    : $enroll->course->code)
                : 'N/A';

            // ✅ Attach the student's id_number for display
            $enroll->student_id_number = $enroll->student?->id_number ?? 'N/A';

            if ($enroll->relationLoaded('schoolYear')) {
                $enroll->school_year_label = $enroll->schoolYear?->school_year ?? 'N/A';
            }

            return $enroll;
        });

        $courses = Courses::all();
        $yearLevels = YearLevel::all();
        $semesters = Semester::all();
        $schoolYears = AcademicYear::orderBy('school_year')->get();

        return inertia('Registrar/Reports/EnrollmentReports', [
            'enrollments' => $enrollments,
            'courses' => $courses,
            'yearLevels' => $yearLevels,
            'semesters' => $semesters,
            'schoolYears' => $schoolYears,
        ]);
    }
}
