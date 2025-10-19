<?php

namespace App\Http\Controllers\AdminControllers;

use App\Http\Controllers\Controller;
use App\Models\Courses;
use App\Models\Department;
use App\Models\Enrollments;
use App\Models\Users;
use App\Models\YearLevel;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AdminDashboardController extends Controller
{
    public function index()
    {
        $activeSchoolYear = DB::table('school_year')
            ->where('is_active', 1)
            ->first();
        $activeSchoolYearId = $activeSchoolYear?->id;

        $studentsQuery = Users::query()->where('role', 'student');
        $facultyQuery = Users::query()->where('role', 'faculty');
        $registrarQuery = Users::query()->where('role', 'registrar');

        $totalStudents = (clone $studentsQuery)->count();
        $totalFaculty = (clone $facultyQuery)->count();
        $totalRegistrars = (clone $registrarQuery)->count();

        $studentsPerYear = [
            'First Year' => 0,
            'Second Year' => 0,
            'Third Year' => 0,
            'Fourth Year' => 0,
        ];

        $yearLevels = YearLevel::pluck('year_level', 'id');

        $yearCounts = Enrollments::query()
            ->select('year_level_id', DB::raw('COUNT(DISTINCT student_id) as total'))
            ->when($activeSchoolYearId, fn ($query) => $query->where('school_year_id', $activeSchoolYearId))
            ->groupBy('year_level_id')
            ->pluck('total', 'year_level_id');

        foreach ($yearCounts as $yearLevelId => $count) {
            $label = match (strtolower((string) $yearLevels->get($yearLevelId))) {
                'first year', '1st year', '1' => 'First Year',
                'second year', '2nd year', '2' => 'Second Year',
                'third year', '3rd year', '3' => 'Third Year',
                'fourth year', '4th year', '4' => 'Fourth Year',
                default => null,
            };

            if ($label) {
                $studentsPerYear[$label] += (int) $count;
            }
        }

        $genderBreakdown = (clone $studentsQuery)
            ->selectRaw('LOWER(gender) as gender, COUNT(*) as total')
            ->groupBy('gender')
            ->pluck('total', 'gender')
            ->map(fn ($count) => (int) $count)
            ->toArray();

        $departmentStats = Department::with(['courses' => function ($query) {
            $query->select('id', 'department_id', 'code', 'name');
        }])->get(['id', 'name']);

        $enrollments = Enrollments::query()
            ->select('courses_id', 'school_year_id', 'status')
            ->when($activeSchoolYearId, fn ($query) => $query->where('school_year_id', $activeSchoolYearId))
            ->get();

        $studentsPerCourse = $enrollments
            ->groupBy('courses_id')
            ->map->count();

        $genderByCourse = Enrollments::query()
            ->select('courses_id', DB::raw('LOWER(users.gender) as gender'), DB::raw('COUNT(DISTINCT enrollments.student_id) as total'))
            ->join('users', 'users.id', '=', 'enrollments.student_id')
            ->when($activeSchoolYearId, fn ($query) => $query->where('enrollments.school_year_id', $activeSchoolYearId))
            ->groupBy('courses_id', 'gender')
            ->get()
            ->groupBy('courses_id');

        $facultyPerDepartment = (clone $facultyQuery)
            ->select('department_id', DB::raw('COUNT(*) as total'))
            ->groupBy('department_id')
            ->pluck('total', 'department_id');

        $registrarsPerDepartment = (clone $registrarQuery)
            ->select('department_id', DB::raw('COUNT(*) as total'))
            ->groupBy('department_id')
            ->pluck('total', 'department_id');

        $courseLookup = Courses::pluck('name', 'id');

        $departments = $departmentStats->map(function (Department $department) use ($studentsPerCourse, $facultyPerDepartment, $registrarsPerDepartment, $courseLookup, $genderByCourse) {
            $departmentGender = collect(['male' => 0, 'female' => 0, 'other' => 0]);

            $courseSummary = collect($department->courses)->map(function ($course) use ($studentsPerCourse, $courseLookup, $genderByCourse, $departmentGender) {
                $genderCounts = ['male' => 0, 'female' => 0, 'other' => 0];

                if ($genderByCourse->has($course->id)) {
                    foreach ($genderByCourse->get($course->id) as $record) {
                        $key = in_array($record->gender, ['male', 'female'], true) ? $record->gender : 'other';
                        $genderCounts[$key] += (int) $record->total;
                    }
                }

                $departmentGender['male'] += $genderCounts['male'];
                $departmentGender['female'] += $genderCounts['female'];
                $departmentGender['other'] += $genderCounts['other'];

                return [
                    'id' => $course->id,
                    'name' => $course->name ?? $courseLookup->get($course->id, 'Unknown Course'),
                    'code' => $course->code,
                    'student_count' => $studentsPerCourse->get($course->id, 0),
                    'gender_breakdown' => $genderCounts,
                ];
            });

            return [
                'id' => $department->id,
                'name' => $department->name,
                'registrar_count' => $registrarsPerDepartment->get($department->id, 0),
                'faculty_count' => $facultyPerDepartment->get($department->id, 0),
                'courses' => $courseSummary,
                'student_total' => $courseSummary->sum('student_count'),
                'gender_breakdown' => $departmentGender,
            ];
        });

        $statusBreakdown = $enrollments
            ->groupBy('status')
            ->map(fn ($group) => $group->count())
            ->map(fn ($count) => (int) $count)
            ->toArray();

        $adminName = Auth::user()?->fName ?? Auth::user()?->username ?? 'Admin';

        return Inertia::render('Admin/Dashboard', [
            'totals' => [
                'students' => $totalStudents,
                'faculty' => $totalFaculty,
                'registrars' => $totalRegistrars,
            ],
            'genderBreakdown' => $genderBreakdown,
            'departments' => $departments,
            'statusBreakdown' => $statusBreakdown,
            'activeSchoolYear' => $activeSchoolYear?->school_year,
            'adminName' => $adminName,
            'studentsPerYear' => $studentsPerYear,
        ]);
    }
}
