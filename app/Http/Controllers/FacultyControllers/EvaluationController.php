<?php

namespace App\Http\Controllers\FacultyControllers;

use App\Http\Controllers\Controller;
use App\Models\Courses;
use App\Models\Enrollments;
use App\Models\FacultyPermission;
use App\Models\Section;
use App\Models\Semester;
use App\Models\YearLevel;
use App\Models\Requirement;
use App\Models\AcademicYear;
use App\Models\EnrollmentPeriod;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Collection;
use Inertia\Inertia;

class EvaluationController extends Controller
{
    public function enrollmentAssessment(Request $request)
    {
        $faculty = Auth::user();

        if (!$faculty || strcasecmp((string) ($faculty->role ?? ''), 'faculty') !== 0) {
            abort(403, 'Only faculty members can access enrollment assessment.');
        }
        $activePermissions = $this->fetchActivePermissions($faculty->id);

        $departmentCourseIds = $this->departmentCourseIds($faculty->department_id);

        $allowedScopes = $this->buildAllowedScopes($activePermissions, $departmentCourseIds);
        $allowedCourseIds = $allowedScopes->pluck('course_id')->unique()->values();

        $selectedCourseId = $request->integer('course');
        if ($selectedCourseId && !$allowedCourseIds->contains($selectedCourseId)) {
            $selectedCourseId = null;
        }

        $pendingAssessments = collect();
        if ($allowedScopes->isNotEmpty()) {
            $pendingAssessments = $this->fetchPendingAssessments($allowedScopes, $selectedCourseId);
        }

        $courses = Courses::query()
            ->select('id', 'code', 'name')
            ->with(['majors:id,name,courses_id'])
            ->whereIn('id', $allowedCourseIds->all())
            ->orderBy('code')
            ->get();

        $corAccessCount = $activePermissions->where('can_print_cor', true)->count();

        return Inertia::render('Faculty/Evaluation/EnrollmentAssessment', [
            'permissions' => $activePermissions,
            'pendingAssessments' => $pendingAssessments,
            'courses' => $courses,
            'stats' => [
                'grants' => $activePermissions->count(),
                'corAccess' => $corAccessCount,
                'pending' => $pendingAssessments->count(),
                'courses' => $allowedCourseIds->count(),
            ],
            'filters' => [
                'course' => $selectedCourseId ? (string) $selectedCourseId : null,
            ],
        ]);
    }

    public function evaluationAccessSnapshot(Request $request)
    {
        $faculty = Auth::user();

        if (!$faculty || strcasecmp((string) ($faculty->role ?? ''), 'faculty') !== 0) {
            abort(403, 'Only faculty members can access evaluation permissions.');
        }

        $activePermissions = $this->fetchActivePermissions($faculty->id);

        $departmentCourses = [];

        if ($faculty->department_id) {
            $departmentCourses = Courses::query()
                ->select('id', 'code', 'name')
                ->where('department_id', $faculty->department_id)
                ->orderBy('code')
                ->get()
                ->map(function ($course) {
                    return [
                        'id' => $course->id,
                        'code' => $course->code,
                        'name' => $course->name,
                    ];
                })
                ->values()
                ->all();
        }

        $snapshot = [
            'hasPermission' => $activePermissions->isNotEmpty(),
            'canPrintCor' => $activePermissions->contains(function ($permission) {
                return (bool) $permission->can_print_cor;
            }),
            'departmentCourses' => $departmentCourses,
        ];

        return response()->json($snapshot);
    }

    public function enrollmentForm(Request $request)
    {
        $faculty = Auth::user();

        if (!$faculty || strcasecmp((string) ($faculty->role ?? ''), 'faculty') !== 0) {
            abort(403, 'Only faculty members can access enrollment evaluation.');
        }

        $activePermissions = $this->fetchActivePermissions($faculty->id);

        if ($activePermissions->isEmpty()) {
            abort(403, 'You do not have active evaluation permissions.');
        }

        $departmentCourseIds = $this->departmentCourseIds($faculty->department_id);
        $allowedScopes = $this->buildAllowedScopes($activePermissions, $departmentCourseIds);
        $allowedCourseIds = $allowedScopes->pluck('course_id')->unique()->values();

        $selectedCourseId = $request->integer('course');
        if ($selectedCourseId && !$allowedCourseIds->contains($selectedCourseId)) {
            abort(403, 'You are not authorized to evaluate this course.');
        }

        $semesters = Semester::where('is_active', 1)->get();
        $schoolYear = AcademicYear::where('is_active', 1)->first();
        $today = Carbon::today();

        $activeEnrollmentPeriod = EnrollmentPeriod::with(['schoolYear', 'semester'])
            ->where('status', 'Open')
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->orderByDesc('start_date')
            ->first();

        $upcomingEnrollmentPeriod = EnrollmentPeriod::with(['schoolYear', 'semester'])
            ->where('status', 'Open')
            ->whereDate('start_date', '>', $today)
            ->orderBy('start_date')
            ->first();
        $yearLevels = YearLevel::all();

        $activeEnrollmentStatuses = ['pending', 'enrolled', 'approved', 'confirmed'];

        $sections = Section::query()
            ->where('department_id', $faculty->department_id)
            ->where('status', 1)
            ->with('yearLevel')
            ->withCount([
                'enrollments as active_enrollment_count' => function ($query) use ($activeEnrollmentStatuses) {
                    $query->whereIn('status', $activeEnrollmentStatuses)
                        ->whereNull('unenrolled_at');
                },
            ])
            ->get();

        $courses = Courses::query()
            ->select('id', 'code', 'name')
            ->with(['majors:id,name,courses_id'])
            ->whereIn('id', $allowedCourseIds->all())
            ->orderBy('code')
            ->get();

        $requirements = Requirement::where('status', 1)->get();

        return Inertia::render('Faculty/Evaluation/Enrollment', [
            'requirements' => $requirements,
            'semesters' => $semesters,
            'sections' => $sections,
            'yearLevels' => $yearLevels,
            'courses' => $courses,
            'schoolYear' => $schoolYear,
            'selectedCourse' => $selectedCourseId,
            'activeEnrollmentPeriod' => $activeEnrollmentPeriod,
            'upcomingEnrollmentPeriod' => $upcomingEnrollmentPeriod,
        ]);
    }

    protected function buildAllowedScopes(Collection $permissions, Collection $departmentCourseIds): Collection
    {
        if ($permissions->isEmpty()) {
            return collect();
        }

        $scopes = collect();

        foreach ($permissions as $permission) {
            $courseIds = collect();

            if ($permission->course_id) {
                $courseIds->push($permission->course_id);
            } elseif ($departmentCourseIds->isNotEmpty()) {
                $courseIds = $departmentCourseIds->copy();
            }

            foreach ($courseIds as $courseId) {
                $scopes->push([
                    'course_id' => (int) $courseId,
                    'major_id' => $permission->major_id ? (int) $permission->major_id : null,
                ]);
            }
        }

        return $scopes->unique(function ($scope) {
            return $scope['course_id'].'-'.($scope['major_id'] ?? 'any');
        })->values();
    }

    protected function fetchPendingAssessments(Collection $allowedScopes, ?int $selectedCourseId): Collection
    {
        $scopes = $allowedScopes;

        if ($selectedCourseId) {
            $scopes = $allowedScopes->where('course_id', $selectedCourseId)->values();

            if ($scopes->isEmpty()) {
                return collect();
            }
        }

        return Enrollments::query()
            ->with([
                'student:id,fName,mName,lName,id_number',
                'course:id,code,name',
                'section:id,section',
                'yearLevel:id,year_level',
                'major:id,name',
                'semester:id,semester',
            ])
            ->where('status', 'pending')
            ->where(function ($query) use ($scopes) {
                foreach ($scopes as $scope) {
                    $query->orWhere(function ($subQuery) use ($scope) {
                        $subQuery->where('courses_id', $scope['course_id']);

                        if (!empty($scope['major_id'])) {
                            $subQuery->where('majors_id', $scope['major_id']);
                        }
                    });
                }
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Enrollments $enrollment) {
                $student = $enrollment->student;
                $course = $enrollment->course;

                return [
                    'id' => $enrollment->id,
                    'student_name' => optional($student)->lName
                        ? trim(sprintf('%s, %s %s', $student->lName, $student->fName, $student->mName))
                        : ($student->fName ?? '—'),
                    'student_number' => optional($student)->id_number,
                    'course' => optional($course)->code ?? optional($course)->name,
                    'course_name' => optional($course)->name,
                    'course_id' => $enrollment->courses_id,
                    'major' => optional($enrollment->major)->name,
                    'section' => optional($enrollment->section)->section,
                    'year_level' => optional($enrollment->yearLevel)->year_level,
                    'semester' => optional($enrollment->semester)->semester,
                    'submitted_at' => optional($enrollment->created_at)?->toDateTimeString(),
                ];
            })
            ->values();
    }

    protected function fetchActivePermissions(int $facultyId): Collection
    {
        return FacultyPermission::with([
                'course:id,code,name',
                'major:id,name',
            ])
            ->where('faculty_id', $facultyId)
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('granted_until')
                    ->orWhereDate('granted_until', '>=', now()->toDateString());
            })
            ->orderByDesc('created_at')
            ->get();
    }

    protected function departmentCourseIds(?int $departmentId): Collection
    {
        if (!$departmentId) {
            return collect();
        }

        return Courses::query()
            ->where('department_id', $departmentId)
            ->pluck('id');
    }
}
