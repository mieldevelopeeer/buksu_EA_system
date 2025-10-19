<?php

namespace App\Http\Controllers\ProgramHeadControllers;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Courses;
use App\Models\Enrollments;
use App\Models\Users;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PHDashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $departmentId = $user?->department_id;

        $activeSchoolYearId = AcademicYear::where('is_active', 1)->value('id');

        $enrollmentBase = Enrollments::query()
            ->when($departmentId, function ($query) use ($departmentId) {
                $query->whereHas('course', function ($courseQuery) use ($departmentId) {
                    $courseQuery->where('department_id', $departmentId);
                });
            })
            ->when($activeSchoolYearId, function ($query) use ($activeSchoolYearId) {
                $query->where('school_year_id', $activeSchoolYearId);
            });

        $totalStudents = (clone $enrollmentBase)
            ->distinct('student_id')
            ->count('student_id');

        $enrolledStudents = (clone $enrollmentBase)
            ->where('status', 'enrolled')
            ->distinct('student_id')
            ->count('student_id');

        $pendingEnrollments = (clone $enrollmentBase)
            ->where('status', 'pending')
            ->count();

        $coursesOffered = Courses::query()
            ->when($departmentId, fn ($query) => $query->where('department_id', $departmentId))
            ->count();

        $facultyCount = Users::query()
            ->where('role', 'faculty')
            ->when($departmentId, fn ($query) => $query->where('department_id', $departmentId))
            ->count();

        $genderCounts = Users::query()
            ->selectRaw('LOWER(gender) as gender, COUNT(DISTINCT users.id) as total')
            ->where('role', 'student')
            ->when($departmentId, function ($query) use ($departmentId) {
                $query->whereHas('enrollments.course', function ($courseQuery) use ($departmentId) {
                    $courseQuery->where('department_id', $departmentId);
                });
            })
            ->when($activeSchoolYearId, function ($query) use ($activeSchoolYearId) {
                $query->whereHas('enrollments', function ($enrollmentQuery) use ($activeSchoolYearId) {
                    $enrollmentQuery->where('school_year_id', $activeSchoolYearId);
                });
            })
            ->groupBy('gender')
            ->pluck('total', 'gender');

        $genderCollection = collect($genderCounts)->map(fn ($count) => (int) $count);
        $genderBreakdown = [
            'male' => $genderCollection->get('male', 0),
            'female' => $genderCollection->get('female', 0),
            'other' => $genderCollection->except(['male', 'female'])->sum(),
        ];

        $statusBreakdown = (clone $enrollmentBase)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($count) => (int) $count)
            ->toArray();

        $recentEnrollments = (clone $enrollmentBase)
            ->with([
                'student:id,fName,mName,lName',
                'course:id,code,name',
            ])
            ->orderByDesc('created_at')
            ->take(5)
            ->get()
            ->map(function (Enrollments $enrollment) {
                $student = $enrollment->student;
                $nameParts = [
                    optional($student)->lName,
                    optional($student)->fName,
                    optional($student)->mName,
                ];

                return [
                    'id' => $enrollment->id,
                    'student' => trim(implode(' ', array_filter($nameParts))) ?: 'Unnamed Student',
                    'course' => optional($enrollment->course)->code ?? optional($enrollment->course)->name ?? 'N/A',
                    'status' => ucfirst($enrollment->status ?? 'pending'),
                    'date' => optional($enrollment->created_at)?->format('M d, Y') ?? '—',
                ];
            });

        $user->loadMissing('department');

        return Inertia::render('ProgramHead/Dashboard', [
            'stats' => [
                'totalStudents' => $totalStudents,
                'enrolledStudents' => $enrolledStudents,
                'pendingEnrollments' => $pendingEnrollments,
                'coursesOffered' => $coursesOffered,
                'facultyCount' => $facultyCount,
            ],
            'genderBreakdown' => $genderBreakdown,
            'statusBreakdown' => $statusBreakdown,
            'recentEnrollments' => $recentEnrollments,
            'department' => [
                'name' => optional($user->department)->name,
            ],
        ]);
    }
}
