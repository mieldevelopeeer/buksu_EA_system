<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use App\Models\Enrollments;
use App\Models\FacultyPermission;
use App\Models\courses;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): string|null
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'email' => $request->user()->email,
                    'name' => $request->user()->name,
                    'fName' => $request->user()->fName,
                    'mName' => $request->user()->mName,
                    'lName' => $request->user()->lName,
                    'full_name' => $request->user()->full_name,
                    'role' => $request->user()->role,
                    'username' => $request->user()->username,
                    'profile_picture' => $request->user()->profile_picture,
                    'department_id' => $request->user()->department_id,
                ] : null,
            ],
            'pendingEnrollmentCount' => $this->pendingEnrollmentCount($request),
            'facultyEvaluationAccess' => $this->facultyEvaluationAccess($request),
            'flash' => array_merge(
                $request->session()->get('flash_notification', []),
                [
                    'success' => $request->session()->get('success'),
                    'error' => $request->session()->get('error'),
                    'warning' => $request->session()->get('warning'),
                    'redirect_enrollment_id' => $request->session()->get('redirect_enrollment_id'),
                    'redirect_to_subject_load' => $request->session()->get('redirect_to_subject_load'),
                ]
            ),
            'credentials' => $request->session()->get('credentials'),
        ];
    }

    protected function pendingEnrollmentCount(Request $request): int
    {
        $user = $request->user();

        if (!$user || !isset($user->role)) {
            return 0;
        }

        if ($user->role !== 'program_head') {
            return 0;
        }

        return Enrollments::query()
            ->where('status', 'pending')
            ->when(isset($user->department_id), function ($query) use ($user) {
                $query->whereHas('course', function ($courseQuery) use ($user) {
                    $courseQuery->where('department_id', $user->department_id);
                });
            })
            ->count();
    }

    protected function facultyEvaluationAccess(Request $request): array
    {
        $user = $request->user();

        $default = [
            'hasPermission' => false,
            'canPrintCor' => false,
            'departmentCourses' => [],
        ];

        if (!$user || strcasecmp((string) ($user->role ?? ''), 'faculty') !== 0) {
            return $default;
        }

        $activePermissions = FacultyPermission::query()
            ->where('faculty_id', $user->id)
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('granted_until')
                    ->orWhereDate('granted_until', '>=', now()->toDateString());
            })
            ->get();

        if ($activePermissions->isEmpty()) {
            return $default + ['expiredPermissions' => $this->expiredPermissions($user->id)];
        }

        $departmentCourses = [];

        if ($user->department_id) {
            $departmentCourses = courses::query()
                ->select('id', 'code', 'name')
                ->where('department_id', $user->department_id)
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

        return [
            'hasPermission' => true,
            'canPrintCor' => $activePermissions->contains(function ($permission) {
                return (bool) $permission->can_print_cor;
            }),
            'departmentCourses' => $departmentCourses,
            'expiredPermissions' => $this->expiredPermissions($user->id),
        ];
    }

    protected function expiredPermissions(int $facultyId): array
    {
        return FacultyPermission::query()
            ->select('id', 'course_id', 'major_id', 'granted_until')
            ->where('faculty_id', $facultyId)
            ->where('is_active', true)
            ->whereNotNull('granted_until')
            ->whereDate('granted_until', '<', now()->toDateString())
            ->with([
                'course:id,code,name',
                'major:id,name',
            ])
            ->get()
            ->map(function ($permission) {
                return [
                    'id' => $permission->id,
                    'granted_until' => optional($permission->granted_until)->toDateString(),
                    'course' => optional($permission->course)->only(['id', 'code', 'name']),
                    'major' => optional($permission->major)->only(['id', 'name']),
                ];
            })
            ->all();
    }
}
