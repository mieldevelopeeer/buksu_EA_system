<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Enrollments;
use App\Models\Grades;
use App\Models\Users;
use App\Models\Semester;
use App\Models\EnrollmentSubject;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RegistrarDashboardController extends Controller
{
    public function index()
    {
        // Get active academic year
        $activeAcademicYear = AcademicYear::where('is_active', 1)
            ->first(['id', 'school_year', 'start_date', 'end_date']);

        // Get active semester
        $activeSemester = Semester::where('is_active', 1)
            ->first(['id', 'semester', 'school_year_id']);

        // Total Students (all active students in system)
        $totalStudents = Users::where('role', 'student')->count();

        // Enrolled Students Today
        $enrolledToday = Enrollments::whereDate('created_at', today())
            ->where('status', 'enrolled')
            ->distinct('student_id')
            ->count('student_id');

        // Pending Grades (grades without final submission)
        $pendingGrades = Grades::where(function ($query) {
            $query->where('final_status', '!=', 'confirmed')
                ->orWhereNull('final')
                ->orWhereNull('final_status');
        })
        ->count();

        // Get enrollment statistics
        $enrollmentStats = Enrollments::selectRaw('
            COUNT(*) as total,
            SUM(CASE WHEN status = "enrolled" THEN 1 ELSE 0 END) as enrolled,
            SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = "dropped" OR status = "rejected" THEN 1 ELSE 0 END) as rejected
        ')
        ->when($activeAcademicYear?->id, function ($query) use ($activeAcademicYear) {
            $query->where('school_year_id', $activeAcademicYear->id);
        })
        ->first();

        // Courses enrolled with count
        $coursesEnrolled = Enrollments::with('course')
            ->where('status', 'enrolled')
            ->when($activeAcademicYear?->id, function ($query) use ($activeAcademicYear) {
                $query->where('school_year_id', $activeAcademicYear->id);
            })
            ->get()
            ->groupBy('course.code')
            ->map(function ($enrollments, $courseCode) {
                $course = $enrollments->first()->course;
                return [
                    'code' => $courseCode,
                    'name' => $course->title ?? $courseCode,
                    'count' => $enrollments->count(),
                ];
            })
            ->values()
            ->sortByDesc('count')
            ->take(10)
            ->toArray();

        // Year level distribution
        $yearLevelDistribution = Enrollments::with('yearLevel')
            ->where('status', 'enrolled')
            ->when($activeAcademicYear?->id, function ($query) use ($activeAcademicYear) {
                $query->where('school_year_id', $activeAcademicYear->id);
            })
            ->get()
            ->groupBy('yearLevel.year_level')
            ->map(function ($enrollments, $yearLevel) {
                return [
                    'year' => $yearLevel ?? 'Unknown',
                    'count' => $enrollments->count(),
                ];
            })
            ->sortBy(function ($item) {
                return (int) preg_replace('/\D/', '', $item['year']);
            })
            ->values()
            ->toArray();

        // Gender distribution
        $genderDistribution = Enrollments::whereHas('student', function ($query) {
            $query->select('id', 'gender');
        })
        ->where('status', 'enrolled')
        ->when($activeAcademicYear?->id, function ($query) use ($activeAcademicYear) {
            $query->where('school_year_id', $activeAcademicYear->id);
        })
        ->join('users', 'enrollments.student_id', '=', 'users.id')
        ->select('users.gender', DB::raw('COUNT(*) as count'))
        ->groupBy('users.gender')
        ->get()
        ->map(function ($item) {
            return [
                'gender' => ucfirst($item->gender ?? 'Not Specified'),
                'count' => $item->count,
            ];
        })
        ->toArray();

        // Enrollment trend data (last 7 days)
        $enrollmentTrends = Enrollments::selectRaw('
            DATE(created_at) as date,
            COUNT(*) as submitted,
            10 as target
        ')
        ->whereDate('created_at', '>=', now()->subDays(6))
        ->groupBy(DB::raw('DATE(created_at)'))
        ->orderBy('date', 'asc')
        ->get()
        ->map(function ($item) {
            return [
                'name' => \Carbon\Carbon::parse($item->date)->format('D'),
                'submitted' => $item->submitted,
                'target' => $item->target,
            ];
        })
        ->values()
        ->toArray();

        // Request queue: recent enrollments
        $requestQueue = Enrollments::with('student', 'course')
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get()
            ->map(function ($enrollment) {
                $statusMap = [
                    'enrolled' => ['title' => 'Enrollment Approved', 'status' => 'success', 'icon' => 'CheckCircle'],
                    'pending' => ['title' => 'Enrollment Pending', 'status' => 'pending', 'icon' => 'Clock'],
                    'dropped' => ['title' => 'Enrollment Dropped', 'status' => 'alert', 'icon' => 'Warning'],
                    'rejected' => ['title' => 'Enrollment Rejected', 'status' => 'alert', 'icon' => 'Warning'],
                ];

                $statusInfo = $statusMap[$enrollment->status] ?? ['title' => 'Enrollment Updated', 'status' => 'info', 'icon' => 'CheckCircle'];
                
                $studentName = $enrollment->student 
                    ? $enrollment->student->fname . ' ' . $enrollment->student->lname 
                    : 'Unknown Student';
                $courseCode = $enrollment->course 
                    ? $enrollment->course->code 
                    : 'Unknown Course';

                return [
                    'title' => $statusInfo['title'],
                    'detail' => $studentName . ' - ' . $courseCode,
                    'date' => $enrollment->created_at->format('M d, g:i A'),
                    'status' => $statusInfo['status'],
                    'iconName' => $statusInfo['icon'],
                ];
            });

        $stats = [
            'students' => $totalStudents,
            'enrolledToday' => $enrolledToday,
            'pendingRequests' => $pendingGrades,
            'upcomingEvents' => 0,
            'enrollmentStats' => $enrollmentStats,
        ];

        return Inertia::render('Registrar/Dashboard', [
            'stats' => $stats,
            'enrollmentTrends' => $enrollmentTrends,
            'requestQueue' => $requestQueue,
            'coursesEnrolled' => $coursesEnrolled,
            'yearLevelDistribution' => $yearLevelDistribution,
            'genderDistribution' => $genderDistribution,
            'currentSemester' => $activeSemester ? [
                'id' => $activeSemester->id,
                'name' => $activeSemester->semester,
                'schoolYearId' => $activeSemester->school_year_id,
            ] : null,
            'currentSchoolYear' => $activeAcademicYear ? [
                'id' => $activeAcademicYear->id,
                'year' => $activeAcademicYear->school_year,
                'startDate' => $activeAcademicYear->start_date,
                'endDate' => $activeAcademicYear->end_date,
            ] : null,
        ]);
    }
}
