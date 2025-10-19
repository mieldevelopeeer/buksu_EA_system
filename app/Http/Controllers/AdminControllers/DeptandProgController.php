<?php

namespace App\Http\Controllers\AdminControllers;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Users;
use App\Models\courses;
use App\Models\major;
use Inertia\Inertia;

class DeptandProgController extends Controller
{
    public function index()
    {
        $departments = Department::orderBy('name')
            ->paginate(9, ['id', 'name', 'description']);

        $departmentIds = $departments->pluck('id');

        $programHeads = Users::where('role', 'program_head')
            ->with('department:id,name')
            ->when($departmentIds->isNotEmpty(), function ($query) use ($departmentIds) {
                $query->whereIn('department_id', $departmentIds);
            })
            ->orderBy('lName')
            ->orderBy('fName')
            ->get([
                'id',
                'fName',
                'mName',
                'lName',
                'suffix',
                'email',
                'contact_no',
                'id_number',
                'department_id',
                'profile_picture',
            ])->map(function ($head) {
                return [
                    'id' => $head->id,
                    'fName' => $head->fName,
                    'mName' => $head->mName,
                    'lName' => $head->lName,
                    'suffix' => $head->suffix,
                    'email' => $head->email,
                    'contact_no' => $head->contact_no,
                    'id_number' => $head->id_number,
                    'department_id' => $head->department_id,
                    'profile_picture' => $head->profile_picture ? asset('storage/'.$head->profile_picture) : null,
                    'department' => $head->department ? [
                        'id' => $head->department->id,
                        'name' => $head->department->name,
                    ] : null,
                ];
            });

        $courses = courses::with(['department:id,name', 'majors' => function ($query) {
            $query->select('id', 'name', 'code', 'description', 'courses_id');
        }])
            ->orderBy('name')
            ->get(['id', 'department_id', 'code', 'name', 'description', 'degree_type', 'status'])
            ->map(function ($course) {
                return [
                    'id' => $course->id,
                    'code' => $course->code,
                    'name' => $course->name,
                    'description' => $course->description,
                    'degree_type' => $course->degree_type,
                    'status' => $course->status,
                    'department_id' => $course->department_id,
                    'department' => $course->department ? [
                        'id' => $course->department->id,
                        'name' => $course->department->name,
                    ] : null,
                    'majors' => $course->majors->map(function ($major) {
                        return [
                            'id' => $major->id,
                            'name' => $major->name,
                            'code' => $major->code,
                            'description' => $major->description,
                        ];
                    }),
                ];
            });

        return Inertia::render('Admin/Programs/Departments', [
            'departments' => $departments->through(function ($department) {
                return [
                    'id' => $department->id,
                    'name' => $department->name,
                    'description' => $department->description,
                ];
            })->items(),
            'departmentsMeta' => $departments->toArray(),
            'programHeads' => $programHeads,
            'courses' => $courses,
        ]);
    }

    public function courses()
    {
        $departments = Department::orderBy('name')
            ->get(['id', 'name', 'description']);

        $courses = courses::with(['department:id,name', 'majors' => function ($query) {
            $query->select('id', 'name', 'code', 'description', 'courses_id');
        }])
            ->orderBy('name')
            ->paginate(9, ['id', 'department_id', 'code', 'name', 'description', 'degree_type', 'status']);

        $transformedCourses = $courses
            ->through(function ($course) {
                return [
                    'id' => $course->id,
                    'code' => $course->code,
                    'name' => $course->name,
                    'description' => $course->description,
                    'degree_type' => $course->degree_type,
                    'status' => $course->status,
                    'department_id' => $course->department_id,
                    'department' => $course->department ? [
                        'id' => $course->department->id,
                        'name' => $course->department->name,
                    ] : null,
                    'majors' => $course->majors->map(function ($major) {
                        return [
                            'id' => $major->id,
                            'name' => $major->name,
                            'code' => $major->code,
                            'description' => $major->description,
                        ];
                    })->values(),
                ];
            })
            ->items();

        return Inertia::render('Admin/Programs/Courses', [
            'departments' => $departments,
            'courses' => $transformedCourses,
            'coursesMeta' => $courses->toArray(),
        ]);
    }
}
