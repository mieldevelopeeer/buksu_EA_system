<?php

namespace App\Http\Middleware;

use App\Providers\RouteServiceProvider;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RedirectIfAuthenticated
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$guards): Response
    {
        $guards = empty($guards) ? [null] : $guards;

        foreach ($guards as $guard) {
            if (!Auth::guard($guard)->check()) {
                continue;
            }

            $user = Auth::guard($guard)->user();

            if ($user && method_exists($this, 'resolveRedirectPath')) {
                return redirect($this->resolveRedirectPath($user));
            }

            return redirect(RouteServiceProvider::HOME);
        }

        return $next($request);
    }

    protected function resolveRedirectPath($user): string
    {
        return match ($user->role) {
            'admin' => '/admin/dashboard',
            'registrar' => '/registrar/dashboard',
            'program_head' => '/program-head/dashboard',
            'faculty' => '/faculty/dashboard',
            'student' => '/students/dashboard',
            default => RouteServiceProvider::HOME,
        };
    }
}
