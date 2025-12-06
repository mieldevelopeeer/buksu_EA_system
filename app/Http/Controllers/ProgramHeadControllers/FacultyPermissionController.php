<?php

namespace App\Http\Controllers\ProgramHeadControllers;

use App\Http\Controllers\Controller;
use App\Models\FacultyPermission;
use App\Models\Users;
use App\Models\Courses;
use App\Models\Major;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class FacultyPermissionController extends Controller
{
    public function index()
    {
        $programHead = Auth::user();

        $permissions = FacultyPermission::with([
            'faculty:id,fName,lName,id_number,department_id',
            'course:id,code,name',
            'major:id,name,courses_id',
        ])
            ->whereHas('faculty', function ($query) use ($programHead) {
                $query->where('department_id', $programHead->department_id);
            })
            ->orderByDesc('created_at')
            ->get();

        $faculties = Users::select('id', 'fName', 'lName', 'id_number')
            ->where('role', 'faculty')
            ->where('department_id', $programHead->department_id)
            ->orderBy('lName')
            ->orderBy('fName')
            ->get();

        $courses = Courses::select('id', 'code', 'name')
            ->where('department_id', $programHead->department_id)
            ->orderBy('code')
            ->get();

        $majors = Major::select('id', 'name', 'courses_id')
            ->whereIn('courses_id', $courses->pluck('id')->filter()->all() ?: [0])
            ->orderBy('name')
            ->get();

        return Inertia::render('ProgramHead/Faculty/FacultyPermissions', [
            'permissions' => $permissions,
            'faculties'   => $faculties,
            'courses'     => $courses,
            'majors'      => $majors,
        ]);
    }

    public function store(Request $request)
    {
        $programHead = Auth::user();

        $validated = $request->validate([
            'faculty_id'    => ['required', Rule::exists('users', 'id')],
            'course_id'     => ['nullable', 'integer', Rule::exists('courses', 'id')],
            'major_id'      => ['nullable', 'integer', Rule::exists('majors', 'id')],
            'granted_until' => ['nullable', 'date'],
            'can_print_cor' => ['required', 'boolean'],
            'is_active'     => ['required', 'boolean'],
        ]);

        $this->assertFacultyInDepartment($validated['faculty_id'], $programHead->department_id);

        if (!empty($validated['course_id'])) {
            $this->assertCourseInDepartment($validated['course_id'], $programHead->department_id);
        }

        if (!empty($validated['major_id'])) {
            $this->assertMajorInDepartment($validated['major_id'], $programHead->department_id);
        }

        if (empty($validated['granted_until'])) {
            $validated['granted_until'] = null;
        }

        $permission = FacultyPermission::create($validated);
        $permission->load([
            'faculty:id,fName,lName,id_number,department_id',
            'course:id,code,name',
            'major:id,name,courses_id',
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Permission granted successfully.',
                'permission' => $permission,
            ], 201);
        }

        return redirect()->back()->with('success', 'Permission granted successfully.');
    }

    public function update(Request $request, FacultyPermission $permission)
    {
        $programHead = Auth::user();

        if ($permission->faculty->department_id !== $programHead->department_id) {
            abort(403, 'You are not allowed to modify this permission.');
        }

        $validated = $request->validate([
            'is_active'     => ['sometimes', 'boolean'],
            'can_print_cor' => ['sometimes', 'boolean'],
            'course_id'     => ['sometimes', 'nullable', 'integer', Rule::exists('courses', 'id')],
            'major_id'      => ['sometimes', 'nullable', 'integer', Rule::exists('majors', 'id')],
            'granted_until' => ['sometimes', 'nullable', 'date'],
        ]);

        if (array_key_exists('course_id', $validated) && !empty($validated['course_id'])) {
            $this->assertCourseInDepartment($validated['course_id'], $programHead->department_id);
        }

        if (array_key_exists('major_id', $validated) && !empty($validated['major_id'])) {
            $this->assertMajorInDepartment($validated['major_id'], $programHead->department_id);
        }

        if (array_key_exists('granted_until', $validated) && empty($validated['granted_until'])) {
            $validated['granted_until'] = null;
        }

        $permission->fill($validated)->save();
        $permission->load([
            'faculty:id,fName,lName,id_number,department_id',
            'course:id,code,name',
            'major:id,name,courses_id',
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Permission updated successfully.',
                'permission' => $permission,
            ]);
        }

        return redirect()->back()->with('success', 'Permission updated successfully.');
    }

    public function destroy(FacultyPermission $permission)
    {
        $programHead = Auth::user();

        if ($permission->faculty->department_id !== $programHead->department_id) {
            abort(403, 'You are not allowed to delete this permission.');
        }

        $permission->delete();

        if (request()->expectsJson()) {
            return response()->json([
                'message' => 'Permission deleted successfully.',
            ]);
        }

        return redirect()->back()->with('success', 'Permission deleted successfully.');
    }

    private function assertFacultyInDepartment(int $facultyId, ?int $departmentId): void
    {
        Users::where('role', 'faculty')
            ->where('department_id', $departmentId)
            ->findOrFail($facultyId);
    }

    private function assertCourseInDepartment(int $courseId, ?int $departmentId): void
    {
        Courses::where('department_id', $departmentId)->findOrFail($courseId);
    }

    private function assertMajorInDepartment(int $majorId, ?int $departmentId): void
    {
        $major = Major::findOrFail($majorId);

        if (!$major->courses_id) {
            abort(422, 'Major is not linked to any course.');
        }

        Courses::where('department_id', $departmentId)->findOrFail($major->courses_id);
    }
}
