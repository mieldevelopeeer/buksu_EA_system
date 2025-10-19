<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use App\Models\Enrollments;

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
                'user' => $request->user(),
            ],
            'pendingEnrollmentCount' => $this->pendingEnrollmentCount($request),
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
                'redirect_enrollment_id' => $request->session()->get('redirect_enrollment_id'),
                'redirect_to_subject_load' => $request->session()->has('redirect_enrollment_id')
                    ? route('program-head.evaluation.subjectload', ['id' => $request->session()->get('redirect_enrollment_id')])
                    : null,
            ],
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
}
