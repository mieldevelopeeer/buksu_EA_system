<?php

namespace App\Http\Middleware;

use App\Providers\RouteServiceProvider;
use Closure;
use Illuminate\Http\Request;

class EnsurePortalRole
{
    protected array $segmentRoleMap = [
        'admin' => ['admin'],
        'registrar' => ['registrar'],
        'program-head' => ['program_head'],
        'faculty' => ['faculty'],
        'students' => ['student'],
        'judge' => ['judge'],
    ];

    protected array $roleRedirects = [
        'admin' => '/admin/dashboard',
        'registrar' => '/registrar/dashboard',
        'program_head' => '/program-head/dashboard',
        'faculty' => '/faculty/dashboard',
        'student' => '/students/dashboard',
        'judge' => '/judge/dashboard',
    ];

    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$user) {
            return $next($request);
        }

        $segment = $request->segment(1);

        if (!$segment || !isset($this->segmentRoleMap[$segment])) {
            return $next($request);
        }

        $allowedRoles = $this->segmentRoleMap[$segment];

        if (in_array($user->role, $allowedRoles, true)) {
            $this->rememberPortalLocation($request, $user->role);
            return $next($request);
        }

        $redirect = $this->retrieveLastLocation($request, $user->role)
            ?? $this->roleRedirects[$user->role]
            ?? RouteServiceProvider::HOME;

        return redirect($redirect);
    }

    protected function rememberPortalLocation(Request $request, string $role): void
    {
        $key = 'portal.last_visits';
        $routes = $request->session()->get($key, []);
        $routes[$role] = $request->fullUrl();
        $request->session()->put($key, $routes);
    }

    protected function retrieveLastLocation(Request $request, string $role): ?string
    {
        $routes = $request->session()->get('portal.last_visits', []);
        $target = $routes[$role] ?? null;

        if ($target && str_contains($request->fullUrl(), $target)) {
            return null;
        }

        return $target;
    }
}
