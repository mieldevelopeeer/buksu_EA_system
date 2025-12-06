<?php

namespace App\Http\Controllers\AdminControllers;

use App\Http\Controllers\Controller;
use App\Models\Enrollments;
use App\Models\EnrollmentPeriod;
use App\Models\Grades;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class ReportsController extends Controller
{
    public function enrollment()
    {
        // Get active enrollment period
        $activeEnrollmentPeriod = EnrollmentPeriod::with(['schoolYear', 'semester'])
            ->where('status', 'active')
            ->whereDate('start_date', '<=', now())
            ->whereDate('end_date', '>=', now())
            ->first();

        $enrollments = Enrollments::with([
            'course:id,code,name',
            'major:id,name,code,courses_id',
            'schoolYear:id,school_year',
            'semester:id,semester',
            'yearLevel:id,year_level',
            'student:id,fName,mName,lName,id_number,gender',
            'student.studentDetails:id,user_id,campus',
        ])
            ->when($activeEnrollmentPeriod, function ($query) use ($activeEnrollmentPeriod) {
                return $query->where('school_year_id', $activeEnrollmentPeriod->school_year_id)
                    ->where('semester_id', $activeEnrollmentPeriod->semesters_id);
            })
            ->latest('enrolled_at')
            ->get([
                'id',
                'student_id',
                'courses_id',
                'majors_id',
                'year_level_id',
                'school_year_id',
                'semester_id',
                'status',
                'enrolled_at',
            ]);

        $totals = [
            'total' => $enrollments->count(),
            'enrolled' => $enrollments->where('status', 'enrolled')->count(),
            'pending' => $enrollments->whereIn('status', ['pending', 'processing'])->count(),
            'withdrawn' => $enrollments->whereIn('status', ['withdrawn', 'cancelled', 'dropped'])->count(),
        ];

        $statusSummary = $enrollments
            ->groupBy(function ($enrollment) {
                return strtolower($enrollment->status ?? 'unspecified');
            })
            ->map(function ($group, $status) {
                return [
                    'status' => ucfirst($status),
                    'count' => $group->count(),
                ];
            })
            ->values()
            ->all();

        $byCourse = $enrollments
            ->groupBy('courses_id')
            ->map(function ($group) {
                $course = $group->first()->course;

                $statusBreakdown = $group
                    ->groupBy(function ($item) {
                        return strtolower($item->status ?? 'unspecified');
                    })
                    ->map(function ($items, $status) {
                        return [
                            'status' => ucfirst($status),
                            'count' => $items->count(),
                        ];
                    })
                    ->values()
                    ->all();

                return [
                    'course_id' => $course->id ?? null,
                    'course_code' => $course->code ?? 'Unassigned',
                    'course_name' => $course->name ?? 'Unassigned Course',
                    'total' => $group->count(),
                    'statusBreakdown' => $statusBreakdown,
                ];
            })
            ->values()
            ->all();

        $bySchoolYear = $enrollments
            ->groupBy(function ($enrollment) {
                return optional($enrollment->schoolYear)->school_year ?? 'Unassigned';
            })
            ->map(function ($group, $schoolYear) {
                $semesters = $group
                    ->groupBy(function ($item) {
                        return optional($item->semester)->semester ?? 'N/A';
                    })
                    ->map(function ($items, $semester) {
                        return [
                            'semester' => $semester,
                            'count' => $items->count(),
                        ];
                    })
                    ->values()
                    ->all();

                return [
                    'school_year' => $schoolYear,
                    'total' => $group->count(),
                    'semesters' => $semesters,
                ];
            })
            ->values()
            ->all();

        $recentEnrollments = $enrollments
            ->map(function ($enrollment) {
                $student = $enrollment->student;
                $studentNameParts = collect([
                    $student->lName ?? null,
                    $student->fName ?? null,
                    $student->mName ?? null,
                ])->filter()->all();

                $course = $enrollment->course;
                $major = $enrollment->major;
                $yearLevel = $enrollment->yearLevel;
                $campus = optional($student->studentDetails)->campus;

                return [
                    'id' => $enrollment->id,
                    'student' => empty($studentNameParts)
                        ? 'Unknown Student'
                        : sprintf('%s, %s%s',
                            $studentNameParts[0],
                            $studentNameParts[1] ?? '',
                            isset($studentNameParts[2]) ? ' ' . $studentNameParts[2] : ''
                        ),
                    'id_number' => $student->id_number ?? null,
                    'student_id' => $student->id,
                    'course_code' => $course->code ?? 'N/A',
                    'course_name' => $course->name ?? 'N/A',
                    'code' => $course->code ?? 'N/A',
                    'name' => $course->name ?? 'N/A',
                    'major' => $major->code ?? $major->name ?? null,
                    'major_code' => $major->code ?? null,
                    'school_year' => optional($enrollment->schoolYear)->school_year,
                    'semester' => optional($enrollment->semester)->semester,
                    'year_level' => optional($yearLevel)->year_level,
                    'status' => ucfirst(strtolower($enrollment->status ?? 'Unspecified')),
                    'gender' => $student->gender ?? 'unknown',
                    'campus' => $campus ?? 'N/A',
                    'enrolled_at' => $enrollment->enrolled_at
                        ? Carbon::parse($enrollment->enrolled_at)->format('M d, Y • h:i A')
                        : null,
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Admin/Reports/EnrollmentReport', [
            'totals' => $totals,
            'statusSummary' => $statusSummary,
            'byCourse' => $byCourse,
            'bySchoolYear' => $bySchoolYear,
            'recentEnrollments' => $recentEnrollments,
            'activeEnrollmentPeriod' => $activeEnrollmentPeriod ? [
                'school_year' => optional($activeEnrollmentPeriod->schoolYear)->school_year,
                'semester' => optional($activeEnrollmentPeriod->semester)->semester,
                'start_date' => $activeEnrollmentPeriod->start_date,
                'end_date' => $activeEnrollmentPeriod->end_date,
            ] : null,
        ]);
    }

    public function grades()
    {
        $grades = Grades::with([
            'enrollment.course:id,code,name,department_id',
            'enrollment.course.department:id,name',
            'enrollment.schoolYear:id,school_year',
            'enrollment.semester:id,semester',
            'enrollment.student:id,id_number,fName,mName,lName',
            'faculty:id,fName,mName,lName',
            'classSchedule:id,start_time,end_time,schedule_day,curriculum_subject_id,faculty_id',
            'classSchedule.subject:subjects.id,subjects.code',
            'classSchedule.faculty:id,fName,mName,lName',
            'enrollmentSubject',
        ])
            ->whereNotNull('midterm')
            ->whereNotNull('final')
            ->whereNotNull('class_schedule_id')
            ->whereHas('classSchedule.subject')
            ->whereHas('enrollment.student')
            ->latest('updated_at')
            ->get([
                'id',
                'enrollment_id',
                'class_schedule_id',
                'faculty_id',
                'midterm',
                'final',
                'summer',
                'midterm_status',
                'final_status',
                'summer_status',
                'remarks',
                'updated_at',
            ]);

        $resolveNumericGrade = static function (Grades $grade): ?float {
            $midterm = is_numeric($grade->midterm) ? (float) $grade->midterm : null;
            $final = is_numeric($grade->final) ? (float) $grade->final : null;

            // Only calculate if both midterm and final are present
            if ($midterm !== null && $final !== null) {
                return round(($midterm + $final) / 2, 2);
            }

            return null;
        };

        $numericGrades = $grades
            ->map(fn (Grades $grade) => $resolveNumericGrade($grade))
            ->filter(fn ($value) => $value !== null)
            ->values();

        $totals = [
            'records' => $grades->count(),
            'withGrades' => $numericGrades->count(),
            'average' => $numericGrades->count() ? round($numericGrades->avg(), 2) : null,
        ];

        $statusSummary = $grades
            ->groupBy(function ($grade) {
                return strtolower($grade->final_status ?? 'unspecified');
            })
            ->map(function ($group, $status) {
                return [
                    'status' => ucfirst($status),
                    'count' => $group->count(),
                ];
            })
            ->values()
            ->all();

        $byCourse = $grades
            ->groupBy(function ($grade) {
                return optional(optional($grade->enrollment)->course)->id ?? 'unassigned';
            })
            ->map(function ($group) use ($resolveNumericGrade) {
                $course = optional(optional($group->first())->enrollment)->course;

                $numeric = $group
                    ->map(fn (Grades $grade) => $resolveNumericGrade($grade))
                    ->filter(fn ($value) => $value !== null)
                    ->values();

                $statusBreakdown = $group
                    ->groupBy(function ($grade) {
                        return strtolower($grade->final_status ?? 'unspecified');
                    })
                    ->map(function ($items, $status) {
                        return [
                            'status' => ucfirst($status),
                            'count' => $items->count(),
                        ];
                    })
                    ->values()
                    ->all();

                return [
                    'course_id' => $course->id ?? null,
                    'course_code' => $course->code ?? 'Unassigned',
                    'course_name' => $course->name ?? 'Unassigned Course',
                    'records' => $group->count(),
                    'average' => $numeric->count() ? round($numeric->avg(), 2) : null,
                    'statusBreakdown' => $statusBreakdown,
                ];
            })
            ->values()
            ->all();

        $bySchoolYear = $grades
            ->groupBy(function ($grade) {
                return optional(optional($grade->enrollment)->schoolYear)->school_year ?? 'Unassigned';
            })
            ->map(function ($group, $schoolYear) {
                $records = $group->count();
                $numeric = $group
                    ->pluck('grade')
                    ->filter(fn ($grade) => is_numeric($grade))
                    ->map(fn ($grade) => (float) $grade);

                return [
                    'school_year' => $schoolYear,
                    'records' => $records,
                    'average' => $numeric->count() ? round($numeric->avg(), 2) : null,
                ];
            })
            ->values()
            ->all();

        $recentGrades = $grades
            ->sortByDesc('updated_at')
            ->filter(function ($grade) {
                // Filter out records with missing critical data
                return $grade->classSchedule && 
                       $grade->classSchedule->subject && 
                       $grade->enrollment && 
                       $grade->enrollment->student &&
                       ($grade->classSchedule->faculty || $grade->faculty);
            })
            ->take(50)
            ->map(function ($grade) use ($resolveNumericGrade) {
                $enrollment = $grade->enrollment;
                $student = $enrollment?->student;
                $studentNameParts = collect([
                    $student->lName ?? null,
                    $student->fName ?? null,
                    $student->mName ?? null,
                ])->filter()->all();

                $course = optional($enrollment)->course;
                $classSchedule = $grade->classSchedule;
                $subject = optional($classSchedule)->subject;
                $semester = optional($enrollment)->semester;
                $schoolYear = optional($enrollment)->schoolYear;
                $studentIdNumber = $student->id_number ?? null;
                
                // Get faculty from class_schedule first, fallback to grade's faculty
                $faculty = optional($classSchedule)->faculty ?? $grade->faculty;
                $facultyName = $faculty ? collect([
                    $faculty->fName ?? null,
                    $faculty->mName ?? null,
                    $faculty->lName ?? null,
                ])->filter()->implode(' ') : 'N/A';

                // Format schedule (e.g., "MW 8:00 AM - 10:00 AM")
                $schedule = 'N/A';
                if ($classSchedule) {
                    $days = $classSchedule->schedule_day ?? '';
                    $startTime = $classSchedule->start_time ?? '';
                    $endTime = $classSchedule->end_time ?? '';
                    if ($days && $startTime && $endTime) {
                        $schedule = sprintf('%s %s - %s', $days, 
                            date('g:i A', strtotime($startTime)),
                            date('g:i A', strtotime($endTime))
                        );
                    }
                }

                return [
                    'id' => $grade->id,
                    'student' => empty($studentNameParts)
                        ? 'Unknown Student'
                        : sprintf('%s, %s%s',
                            $studentNameParts[0],
                            $studentNameParts[1] ?? '',
                            isset($studentNameParts[2]) ? ' ' . $studentNameParts[2] : ''
                        ),
                    'student_id' => $studentIdNumber,
                    'course_code' => $course->code ?? 'N/A',
                    'course_name' => $course->name ?? 'N/A',
                    'subject_code' => $subject->code ?? 'N/A',
                    'schedule' => $schedule,
                    'semester' => $semester->semester ?? 'N/A',
                    'school_year' => $schoolYear->school_year ?? 'N/A',
                    'faculty' => $facultyName,
                    'grade' => $resolveNumericGrade($grade),
                    'status' => ucfirst(strtolower($grade->final_status ?? 'unspecified')),
                    'recorded_at' => $grade->updated_at
                        ? Carbon::parse($grade->updated_at)->toDateTimeString()
                        : null,
                    'remarks' => $grade->remarks,
                ];
            })
            ->values()
            ->all();

        // Get program head and admin information
        $programHeadName = null;
        $adminName = null;
        
        // Get program head (role = 'program_head')
        $programHead = \App\Models\Users::where('role', 'program_head')
            ->select('id', 'fName', 'mName', 'lName')
            ->first();
            
        if ($programHead) {
            $programHeadName = collect([
                $programHead->fName,
                $programHead->mName,
                $programHead->lName,
            ])->filter()->implode(' ');
        }
        
        // Get admin (role = 'admin')
        $admin = \App\Models\Users::where('role', 'admin')
            ->select('id', 'fName', 'mName', 'lName')
            ->first();
            
        if ($admin) {
            $adminName = collect([
                $admin->fName,
                $admin->mName,
                $admin->lName,
            ])->filter()->implode(' ');
        }

        return Inertia::render('Admin/Reports/GradeReport', [
            'totals' => $totals,
            'statusSummary' => $statusSummary,
            'byCourse' => $byCourse,
            'bySchoolYear' => $bySchoolYear,
            'recentGrades' => $recentGrades,
            'programHead' => $programHeadName,
            'campusHead' => $adminName,
        ]);
    }
}
