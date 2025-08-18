<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Inertia\Inertia; 
use App\Models\Courses;
use App\Models\Department;
class CoursesController extends Controller
{

public function index()
{
    $courses = Courses::with('department')->paginate(10);
    $departments = Department::all();

    // ✅ Get ENUM values from courses table
    $enumValues = DB::select("SHOW COLUMNS FROM courses LIKE 'degree_type'");
    $type = $enumValues[0]->Type; // e.g. enum('Bachelor','Master','Doctorate')
    preg_match("/^enum\('(.*)'\)$/", $type, $matches);
    $degreeTypes = explode("','", $matches[1]);

    return Inertia::render('Registrar/Curriculum/Courses', [
        'courses' => $courses,
        'departments' => $departments,
        'degreeTypes' => $degreeTypes
    ]);
}



    public function store(Request $request)
    {
        $request->validate([
            'department_id' => 'required|exists:departments,id',
            'code' => 'required|string|max:50|unique:courses,code',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'degree_type' => 'required|in:Bachelor,Master,Doctorate',
            'status' => 'boolean',
        ]);

        Courses::create($request->all());

        return back()->with('message', 'Course added successfully.');
    }

    public function show($id)
    {
        $course = Courses::with('department')->findOrFail($id);

        return response()->json($course);
    }

    
    public function update(Request $request, $id)
    {
        $course = Courses::findOrFail($id);

        $request->validate([
            'department_id' => 'required|exists:departments,id',
            'code' => 'required|string|max:50|unique:courses,code,' . $course->id,
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'degree_type' => 'required|in:Bachelor,Master,Doctorate',
        ]);

        $course->update($request->all());

        return back()->with('message', 'Course updated successfully.');
    }
    public function toggleStatus($id, Request $request)
    {
        $course = Courses::findOrFail($id);
        $course->status = $request->status; // Expecting 1 or 0
        $course->save();

        return back();
    }



}
