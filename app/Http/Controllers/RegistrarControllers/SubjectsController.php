<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Subjects;
use App\Models\Department; 

class SubjectsController extends Controller
{
    public function index()
    {
        // Fetch paginated subjects (10 per page)
        $subjects = Subjects::with('department')->orderBy('code')->paginate(10);
        $departments = Department::all();

        return Inertia::render('Registrar/Curriculum/Subjects', [
            'subjects' => $subjects,
            'departments' =>  $departments,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:subjects,code',
            'descriptive_title' => 'required|string|max:255',
             'department_id' => 'nullable|exists:departments,id', 
        ]);

        Subjects::create($validated);

        return redirect()->back()->with('success', 'Subject added successfully!');
    }

    public function update(Request $request, $id)
    {
        $subject = Subjects::findOrFail($id);

        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:subjects,code,' . $subject->id,
            'descriptive_title' => 'required|string|max:255',
            'department_id' => 'nullable|exists:departments,id',
        ]);

        $subject->update($validated);

        return redirect()->back()->with('success', 'Subject updated successfully!');
    }

      // Optional method if you want to fetch departments separately via API
    public function getDepartments()
    {
        return Department::all();
    }
}
