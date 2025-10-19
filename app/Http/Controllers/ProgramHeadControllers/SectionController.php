<?php

namespace App\Http\Controllers\ProgramHeadControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Models\Section;
use App\Models\YearLevel;
use Inertia\Inertia;

class SectionController extends Controller
{
  public function index()
{
    $user = auth()->user();

    $sections = Section::with('yearLevel')
        ->where('department_id', $user->department_id) // ✅ filter by the logged-in program head's department
        ->paginate(30);

    $yearLevels = YearLevel::all(); // keep this global since year_levels has no department_id

    return Inertia::render('ProgramHead/Sections/Section', [
        'sections'   => $sections,
        'yearLevels' => $yearLevels,
    ]);
}


   public function store(Request $request)
{
    $user = auth()->user();
    $departmentId = $user->department_id ?? $request->input('department_id');

    if (!$departmentId) {
        return redirect()->back()->withErrors(['department' => 'Department not found.']);
    }

    $validated = $request->validate([
        'section'       => [
            'required',
            'string',
            'max:255',
            // ✅ unique per year_level_id AND department_id
            Rule::unique('sections')->where(function ($query) use ($request, $departmentId) {
                return $query->where('year_level_id', $request->year_level_id)
                             ->where('department_id', $departmentId);
            }),
        ],
        'year_level_id' => 'required|exists:year_levels,id',
        'student_limit' => 'required|integer|min:1|max:200',
    ], [
        'section.unique' => 'Section already exists in this year level for your department.',
    ]);

    Section::create([
        'section'       => $validated['section'],
        'year_level_id' => $validated['year_level_id'],
        'student_limit' => $validated['student_limit'],
        'department_id' => $departmentId,
    ]);

    return redirect()->back()->with('success', 'Section created successfully.');
}

    public function update(Request $request, $id)
    {
        $section = Section::findOrFail($id);
        $user = auth()->user();
        $departmentId = $user->department_id ?? $request->input('department_id');

        if (!$departmentId) {
            return redirect()->back()->withErrors(['department' => 'Department not found for this user.']);
        }

        $validated = $request->validate([
            'section'       => [
                'required',
                'string',
                'max:255',
                Rule::unique('sections')
                    ->ignore($section->id)
                    ->where(fn($q) => $q->where('year_level_id', $request->year_level_id)),
            ],
            'year_level_id' => 'required|exists:year_levels,id',
            'student_limit' => 'required|integer|min:1|max:200',
        ], [
            'section.unique' => 'Section already exists in this year level.',
        ]);

        $section->update([
            'section'       => $validated['section'],
            'year_level_id' => $validated['year_level_id'],
            'student_limit' => $validated['student_limit'],
            'department_id' => $departmentId,
        ]);

        return redirect()->back()->with('success', 'Section updated successfully.');
    }

    public function toggleStatus(Request $request, $id)
    {
        $section = Section::findOrFail($id);
        $section->status = $request->boolean('status') ? 1 : 0;
        $section->save();

        return back()->with('success', 'Status updated successfully.');
    }
}
