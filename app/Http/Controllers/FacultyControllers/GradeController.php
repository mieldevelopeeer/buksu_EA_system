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
use App\Models\Notification;
use App\Models\Users;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
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
                $grade = $enrolled->grades;

                // If no grade found via relationship, try direct query
                if (!$grade) {
                    $grade = \App\Models\Grades::where('enrollment_subject_id', $enrolled->id)
                        ->first();
                }

                $compositeStatus = 'draft';
                if ($grade) {
                    $partStatuses = [
                        $grade->midterm_status,
                        $grade->final_status,
                    ];

                    if (collect($partStatuses)->filter()->every(fn ($status) => $status === 'submitted')) {
                        $compositeStatus = 'submitted';
                    } elseif (collect($partStatuses)->contains('submitted')) {
                        $compositeStatus = 'submitted';
                    }
                }

                return [
                    'enrollment_id' => $enrollment->id,
                    'id' => $student->id,
                    'name' => $student->fName . ' ' . $student->lName,
                    'midterm' => $grade->midterm ?? null,
                    'final' => $grade->final ?? null,
                    'remarks' => $grade->remarks ?? null,
                    'status' => $compositeStatus,
                    'midterm_status' => $grade->midterm_status ?? 'draft',
                    'final_status' => $grade->final_status ?? 'draft',
                    'midterm_change_status' => $grade->midterm_change_status ?? 'none',
                    'final_change_status' => $grade->final_change_status ?? 'none',
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
                $grade = Grades::firstOrNew(
                    [
                        'enrollment_id' => $data['enrollment_id'],
                        'class_schedule_id' => $data['class_schedule_id'],
                        'faculty_id' => $facultyId,
                    ],
                    [
                        'midterm_status' => 'draft',
                        'final_status' => 'draft',
                        'midterm_change_status' => 'none',
                        'final_change_status' => 'none',
                    ]
                );

                $midterm = $data['midterm'] ?? $grade->midterm;
                $final = $data['final'] ?? $grade->final;
                $midtermStatus = $data['midterm_status'] ?? $grade->midterm_status ?? 'draft';
                $finalStatus = $data['final_status'] ?? $grade->final_status ?? 'draft';

                $midtermLocked = $grade->exists
                    && in_array(strtolower($grade->midterm_status ?? 'draft'), ['submitted', 'confirmed'])
                    && strtolower($grade->midterm_change_status ?? 'none') !== 'approved';
                $finalLocked = $grade->exists
                    && in_array(strtolower($grade->final_status ?? 'draft'), ['submitted', 'confirmed'])
                    && strtolower($grade->final_change_status ?? 'none') !== 'approved';

                if ($midtermLocked && ($midterm !== $grade->midterm || $midtermStatus !== $grade->midterm_status)) {
                    throw ValidationException::withMessages([
                        'grades' => ['Midterm grade is locked until the registrar approves the change request.'],
                    ]);
                }

                if ($finalLocked && ($final !== $grade->final || $finalStatus !== $grade->final_status)) {
                    throw ValidationException::withMessages([
                        'grades' => ['Final grade is locked until the registrar approves the change request.'],
                    ]);
                }

                // Compute remarks if not provided
                $remarks = $data['remarks'] ?? $grade->remarks ?? 'Incomplete';
                if ($midterm !== null || $final !== null) {
                    $score = $final ?? $midterm;
                    $remarks = $score <= 3.0 ? 'Passed' : 'Failed';
                }

                $grade->midterm = $midterm;
                $grade->final = $final;
                $grade->remarks = $remarks;
                $grade->midterm_status = $midtermStatus;
                $grade->final_status = $finalStatus;
                $grade->confirmed_by = null;
                $grade->confirmed_at = null;
                $grade->faculty_id = $facultyId;

                $grade->save();
            }
        });

        return redirect()->back()->with('success', 'Grades successfully added/updated.');
    }

    public function requestChange(Request $request)
    {
        $facultyId = Auth::user()->id;

        if ($request->has('students')) {
            $payload = $request->validate([
                'students' => 'required|array|min:1',
                'students.*.enrollment_id' => 'required|exists:enrollments,id',
                'students.*.class_schedule_id' => 'required|exists:class_schedules,id',
                'students.*.grade_part' => 'required|in:midterm,final',
                'reason' => 'nullable|string|max:255',
            ]);

            $reason = $payload['reason'] ?? null;
            foreach ($payload['students'] as $studentData) {
                $grade = Grades::firstOrCreate(
                    [
                        'enrollment_id' => $studentData['enrollment_id'],
                        'class_schedule_id' => $studentData['class_schedule_id'],
                    ],
                    [
                        'faculty_id' => $facultyId,
                        'midterm_status' => 'draft',
                        'final_status' => 'draft',
                    ]
                );

                $field = $studentData['grade_part'] . '_change_status';
                $alreadyRequested = $grade->$field === 'requested';
                $grade->$field = 'requested';
                $grade->save();

                if (!$alreadyRequested) {
                    $this->notifyRegistrarsOfGradeChange(
                        $studentData['enrollment_id'],
                        $studentData['class_schedule_id'],
                        $studentData['grade_part'],
                        $reason
                    );
                }
            }

            return back()->with('success', 'Grade change requests submitted.');
        }

        $data = $request->validate([
            'enrollment_id' => 'required|exists:enrollments,id',
            'class_schedule_id' => 'required|exists:class_schedules,id',
            'grade_part' => 'required|in:midterm,final',
            'reason' => 'nullable|string|max:255',
        ]);

        $grade = Grades::firstOrCreate(
            [
                'enrollment_id' => $data['enrollment_id'],
                'class_schedule_id' => $data['class_schedule_id'],
            ],
            [
                'faculty_id' => $facultyId,
                'midterm_status' => 'draft',
                'final_status' => 'draft',
            ]
        );

        $field = $data['grade_part'] . '_change_status';
        $alreadyRequested = $grade->$field === 'requested';
        $grade->$field = 'requested';
        $grade->save();

        if (!$alreadyRequested) {
            $this->notifyRegistrarsOfGradeChange(
                $data['enrollment_id'],
                $data['class_schedule_id'],
                $data['grade_part'],
                $data['reason'] ?? null
            );
        }

        return back()->with('success', ucfirst($data['grade_part']) . ' grade change requested.');
    }

    protected function notifyRegistrarsOfGradeChange(int $enrollmentId, int $classScheduleId, string $gradePart, ?string $reason = null): void
    {
        static $registrarIds = null;

        if ($registrarIds === null) {
            $registrarIds = Users::query()->where('role', 'registrar')->pluck('id');
        }

        if ($registrarIds->isEmpty()) {
            return;
        }

        $enrollment = Enrollments::with('student:id,fName,mName,lName')->find($enrollmentId);
        $schedule = Class_Schedules::with([
            'curriculumSubject.subject',
            'curriculumSubject.curriculum.course',
            'curriculumSubject.curriculum.major',
            'section.yearLevel',
        ])->find($classScheduleId);
        $student = optional($enrollment)->student;
        $studentName = $student
            ? trim("{$student->fName} {$student->lName}")
            : 'a student';
        $subjectTitle = optional($schedule?->curriculumSubject?->subject)->descriptive_title ?? 'their subject';

        $faculty = Auth::user();
        $facultyName = $faculty ? trim("{$faculty->fName} {$faculty->lName}") : 'A faculty member';

        $gradeLabel = ucfirst($gradePart);
        $message = sprintf(
            '%s requested a %s grade change for %s (%s).',
            $facultyName,
            strtolower($gradeLabel),
            $studentName,
            $subjectTitle
        );

        if ($reason) {
            $message .= ' Reason: ' . $reason;
        }

        $notificationUrl = $this->buildRegistrarGradeReviewUrl($schedule, $student, $gradePart);

        foreach ($registrarIds as $registrarId) {
            Notification::create([
                'user_id' => $registrarId,
                'type' => 'grade_change',
                'title' => $gradeLabel . ' grade change request',
                'message' => $message,
                'url' => $notificationUrl,
                'is_read' => false,
            ]);
        }
    }

    protected function buildRegistrarGradeReviewUrl(?Class_Schedules $schedule, $student, ?string $gradePart = null): string
    {
        try {
            $fallback = route('registrar.student.grades');
        } catch (\Throwable $exception) {
            $fallback = '/registrar/grades';
        }

        if (!$schedule) {
            return $fallback;
        }

        $courseId = optional($schedule->curriculumSubject?->curriculum?->course)->id;
        $yearId = optional($schedule->section?->yearLevel)->id;
        $sectionId = $schedule->section?->id;
        $subjectId = $schedule->id;

        if (!$courseId || !$yearId || !$sectionId || !$subjectId) {
            return $fallback;
        }

        $params = [
            'course' => $courseId,
            'year' => $yearId,
            'section' => $sectionId,
            'subject' => $subjectId,
        ];

        $query = [];
        $majorId = optional($schedule->curriculumSubject?->curriculum?->major)->id;
        if ($majorId) {
            $query['major_id'] = $majorId;
        }

        if ($student?->id) {
            $query['student_id'] = $student->id;
        }

        $term = strtolower($gradePart ?? '');
        if (in_array($term, ['midterm', 'final', 'both'])) {
            $query['term'] = $term;
        }

        try {
            $url = route('registrar.student.grades.course.year.section.subject', $params);
        } catch (\Throwable $exception) {
            return $fallback;
        }

        if (!empty($query)) {
            $url .= '?' . http_build_query($query);
        }

        return $url;
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
