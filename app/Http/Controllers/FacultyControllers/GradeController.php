<?php

namespace App\Http\Controllers\FacultyControllers;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use App\Models\Class_Schedules;
use App\Models\EnrollmentSubject;
use App\Models\Grades;
use App\Models\Enrollments;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
class GradeController extends Controller
{
   public function index()
{
    $facultyId = Auth::user()->id;

    // Get active semester with its school year
    $activeSemester = DB::table('semesters')
       ->join('school_year', 'semesters.school_year_id', '=', 'school_year.id')
        ->where('semesters.is_active', 1)
        ->where('school_year.is_active', 1) // also check school year
        ->select('semesters.*', 'school_year.school_year')
        ->first();

    // If no active semester OR school year, return empty schedules
    if (!$activeSemester) {
        return Inertia::render('Faculty/Grades/Grades', [
            'schedules' => [],
            'activeSemester' => null,
        ]);
    }

    // Fetch schedules with relationships
    $schedules = Class_Schedules::with([
            'section',
            'curriculumSubject.subject',
            'curriculumSubject.curriculum.course',
            'faculty',
            'classroom',
        ])
        ->where('faculty_id', $facultyId)
        ->where('semester_id', $activeSemester->id)
        ->orderBy('schedule_day')
        ->orderBy('start_time')
        ->get();

    // Map students and grades
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
                    ->first();

                return [
                    'enrollment_id' => $enrollment->id,
                    'id' => $student->id,
                    'name' => $student->fName . ' ' . $student->lName,
                    'midterm' => $grade->midterm ?? null,
                    'final' => $grade->final ?? null,
                    'remarks' => $grade->remarks ?? null,
                    'status' => $grade->status ?? 'draft',
                    'midterm_status' => $grade->midterm_status ?? 'draft',
                    'final_status' => $grade->final_status ?? 'draft',
                ];
            }

            return null;
        })->filter()->values();

        // Faculty and course info
        $sched->faculty_name = $sched->faculty
            ? $sched->faculty->fName . ' ' . $sched->faculty->lName
            : 'N/A';
        $sched->course = $sched->curriculumSubject->curriculum->course->name ?? 'N/A';
        $sched->course_code = $sched->curriculumSubject->curriculum->course->code ?? 'N/A';
    });

    return Inertia::render('Faculty/Grades/Grades', [
        'schedules' => $schedules,
        'activeSemester' => $activeSemester,
    ]);
}

    public function addGrades(Request $request)
    {
        $facultyId = Auth::user()->id;

        $request->validate([
            'grades' => 'required|array',
            'grades.*.enrollment_id' => 'required|exists:enrollments,id',
            'grades.*.class_schedule_id' => 'required|exists:class_schedules,id',
            'grades.*.midterm' => 'nullable|numeric|min:1|max:5',
            'grades.*.final' => 'nullable|numeric|min:1|max:5',
            'grades.*.remarks' => 'nullable|in:Passed,Failed,Incomplete,Dropped',
            'grades.*.midterm_status' => 'nullable|in:draft,submitted,confirmed',
            'grades.*.final_status' => 'nullable|in:draft,submitted,confirmed',
        ]);

        DB::transaction(function () use ($request, $facultyId) {
            foreach ($request->grades as $data) {
                $midterm = $data['midterm'] ?? null;
                $final = $data['final'] ?? null;
                $midtermStatus = $data['midterm_status'] ?? 'draft';
                $finalStatus = $data['final_status'] ?? 'draft';

                // Compute remarks if not provided
                $remarks = $data['remarks'] ?? 'Incomplete';
                if ($midterm !== null || $final !== null) {
                    $score = $final ?? $midterm;
                    $remarks = $score <= 3.0 ? 'Passed' : 'Failed';
                }

                Grades::updateOrCreate(
                    [
                        'enrollment_id' => $data['enrollment_id'],
                        'class_schedule_id' => $data['class_schedule_id'],
                        'faculty_id' => $facultyId,
                    ],
                    [
                        'midterm' => $midterm,
                        'final' => $final,
                        'remarks' => $remarks,
                        'status' => $finalStatus,
                        'midterm_status' => $midtermStatus,
                        'final_status' => $finalStatus,
                        'confirmed_by' => null,
                        'confirmed_at' => null,
                    ]
                );
            }
        });

        return redirect()->back()->with('success', 'Grades successfully added/updated.');
    }

  public function insertExcel(Request $request)
{
     $facultyId = Auth::user()->id; 

    $request->validate([
        'file' => 'required|file|mimes:xlsx,xls',
        'class_schedule_id' => 'required|exists:class_schedules,id',
    ]);

    $file = $request->file('file');
    $path = $file->getRealPath();

    $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($path);
    $sheet = $spreadsheet->getActiveSheet();
    $rows = $sheet->toArray(null, true, true, true);

    if (empty($rows)) {
        return redirect()->back()->with('error', 'The Excel file is empty.');
    }

    // Remove header row
    array_shift($rows);

    DB::transaction(function () use ($rows, $facultyId, $request) {
        foreach ($rows as $index => $row) {
            $rawId   = trim($row['A'] ?? ''); // enrollment_id or id_number
            $midterm = isset($row['B']) && $row['B'] !== '' ? floatval(trim($row['C'])) : null;
            $final   = isset($row['C']) && $row['C'] !== '' ? floatval(trim($row['D'])) : null;
            $midtermStatus = 'draft';
            $finalStatus = 'draft';

            if (!$rawId) {
                \Log::warning("Skipped row " . ($index + 2) . " - empty identifier", $row);
                continue;
            }

            $enrollmentId = null;

            // Case 1: Excel provides enrollment_id directly
            if (is_numeric($rawId)) {
                $enrollmentId = Enrollments::where('id', $rawId)
                    ->value('id');
            }

            // Case 2: Excel provides id_number from users
            if (!$enrollmentId) {
                $enrollmentId = Enrollments::whereHas('user', function ($q) use ($rawId) {
                        $q->where('id_number', $rawId);
                    })
                    ->value('id');
            }

            if (!$enrollmentId) {
                \Log::warning("Skipped row " . ($index + 2) . " - no enrollment found for identifier: {$rawId}");
                continue;
            }

            // Compute remarks
            $remarks = 'Incomplete';
            if ($midterm !== null || $final !== null) {
                $score = $final ?? $midterm;
                $remarks = $score <= 3.0 ? 'Passed' : 'Failed';
            }

            \App\Models\Grades::updateOrCreate(
                [
                    'enrollment_id'     => $enrollmentId,
                    'class_schedule_id' => $request->class_schedule_id,
                    'faculty_id'        => $facultyId,
                ],
                [
                    'midterm'      => $midterm,
                    'final'        => $final,
                    'remarks'      => $remarks,
                    'status'       => $finalStatus,
                    'midterm_status' => $midtermStatus,
                    'final_status'   => $finalStatus,
                    'confirmed_by' => null,
                    'confirmed_at' => null,
                ]
            );
        }
    });

    return redirect()->back()->with('success', 'Grades imported successfully.');
}

    

    

}
