<?php

namespace App\Http\Controllers\ProgramHeadControllers;

use App\Imports\SubjectsImport;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Models\Curriculum;
use App\Models\Curricula; 
use App\Models\Curriculum_Subject;
use App\Models\ProgramHead;
use App\Models\year_level;
use App\Models\YearLevel;
use App\Models\Semester;
use App\Models\Subjects;
use App\Models\Courses;
use App\Models\Major;
use App\Models\PreRequisites;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;

class CurriculaController extends Controller
{
 public function index()
    {
        $user = auth()->user();

        // Ensure only program_head or admin
        if (!in_array($user->role, ['program_head','admin'])) {
            abort(403, 'Unauthorized');
        }

        // Get department_id from user
        $departmentId = $user->department_id;

        // Fetch courses for this department with their majors
        $courses = Courses::with('majors')
            ->where('department_id', $departmentId)
            ->get();

        // Fetch curricula for their department with related course and major
        $curricula = Curricula::with(['course', 'major'])
            ->where('department_id', $departmentId)
            ->paginate(10);

        return Inertia::render('ProgramHead/Curriculum/Curricula', [
            'curricula' => $curricula,
            'courses'   => $courses,
        ]);
    }

   public function store(Request $request)
{
    $user = auth()->user();

    // Get department_id
    $departmentId = $user->role === 'admin'
        ? $request->input('department_id')
        : $user->department_id;

    if (!$departmentId) {
        return redirect()->back()->withErrors(['department' => 'Department not found.']);
    }

    $validated = $request->validate([
        'name'        => 'required|string|max:255|unique:curricula,name',
        'description' => 'nullable|string|max:500',
        'courses_id'  => 'required|exists:courses,id',
        'majors_id'   => 'nullable|exists:majors,id', // <-- now optional
    ]);

    $curriculum = Curricula::create([
        'name'          => $validated['name'],
        'description'   => $validated['description'] ?? null,
        'department_id' => $departmentId,
        'courses_id'    => $validated['courses_id'],
        'majors_id'     => $validated['majors_id'] ?? null, // <-- handle optional
        'status'        => 'pending',
    ]);

    return redirect()->back()->with('success', 'Curriculum submitted and awaiting approval!');
}


public function update(Request $request, Curricula $curriculum)
{
    $user = auth()->user();

    // Determine department_id
    $departmentId = $user->role === 'admin'
        ? $request->input('department_id')
        : $user->department_id;

    if (!$departmentId) {
        return redirect()->back()->withErrors(['department' => 'Department not found.']);
    }

    // Validate input
    $validated = $request->validate([
        'name'        => 'required|string|max:255|unique:curricula,name,' . $curriculum->id,
        'description' => 'nullable|string|max:500',
        'courses_id'  => 'required|exists:courses,id',
        'majors_id'   => 'nullable|exists:majors,id', // <-- now optional
    ]);

    // Update curriculum
    $curriculum->update([
        'name'          => $validated['name'],
        'description'   => $validated['description'] ?? null,
        'department_id' => $departmentId,
        'courses_id'    => $validated['courses_id'],
        'majors_id'     => $validated['majors_id'] ?? null, // <-- handle optional
    ]);

    return redirect()->back()->with('success', 'Curriculum updated successfully!');
}

public function show($id)
{
    $curriculum = Curricula::with([
        'course',
        'major',
        'curriculumSubjects.subject',
        'curriculumSubjects.semester',
        'curriculumSubjects.yearLevel',
        'curriculumSubjects.prerequisites.subject',
    ])->findOrFail($id);

    $semesters = Semester::select('id', 'semester')->get();
    $yearLevels = YearLevel::select('id', 'year_level')->get();

    $curriculumSubjects = $curriculum->curriculumSubjects->map(function ($subj) {
        return [
            'id'            => $subj->id,
            'subject_id'    => $subj->subject_id,
            'subject'       => $subj->subject,
            'semesters_id'  => $subj->semesters_id,
            'semester'      => $subj->semester,
            'year_level_id' => $subj->year_level_id,
            'year_level'    => $subj->yearLevel,
            'lec_unit'      => $subj->lec_unit,
            'lab_unit'      => $subj->lab_unit,
            'type'          => $subj->type,
            'prerequisites' => $subj->prerequisites->map(function ($pre) {
                return [
                    'id'    => $pre->id,
                    'code'  => $pre->subject?->code,
                    'title' => $pre->subject?->descriptive_title,
                ];
            }),
        ];
    });

    return Inertia::render('ProgramHead/Curriculum/CurriculumPage', [
        'curriculum'        => $curriculum,
        'curriculumSubjects'=> $curriculumSubjects,
        'semesters'         => $semesters,
        'yearLevels'        => $yearLevels,
    ]);
}


public function getSubjectByCode($code)
{
    $subject = Subjects::where('code', $code)->first();

    if (!$subject) {
        return response()->json(['success' => false, 'message' => 'Subject not found']);
    }

    return response()->json([
        'success' => true,
        'subject' => [
            'code'  => $subject->code,
            'title' => $subject->descriptive_title,
        ]
    ]);
}


public function storeSubjects(Request $request, $curriculumId)
{
    $validated = $request->validate([
        'subjects'                   => 'required|array|min:1',
        'subjects.*.code'            => 'required|string|max:50|distinct',
        'subjects.*.title'           => 'required|string|max:255',
        'subjects.*.lec'             => 'required|integer|min:0',
        'subjects.*.lab'             => 'nullable|integer|min:0',
        'subjects.*.semester_id'     => 'required|integer|exists:semesters,id',
        'subjects.*.year'            => 'required|string|max:50',
        'subjects.*.type'            => 'required|in:Old,New',
        'subjects.*.prerequisites'   => 'nullable|array',
        'subjects.*.prerequisites.*' => 'string|exists:subjects,code',
    ]);

    $user = Auth::user();
    $departmentId = $user->department_id;

    if (!$departmentId) {
        abort(403, 'Unauthorized');
    }

    DB::transaction(function () use ($validated, $curriculumId, $departmentId) {
        // 🔹 Map to store subject_code → curriculum_subject_id
        $subjectMap = [];

        /**
         * STEP 1: Create or update all subjects & curriculum_subjects first
         */
        foreach ($validated['subjects'] as $subj) {
            $labUnit = $subj['lab'] ?? 0;

            // Ensure subject exists
            $subject = Subjects::updateOrCreate(
                ['code' => $subj['code']],
                [
                    'descriptive_title' => $subj['title'],
                    'department_id'     => $departmentId,
                ]
            );

            // Ensure year level exists
            $yearLevel = Year_Level::firstOrCreate([
                'year_level' => $subj['year'],
            ]);

            // Update or create curriculum_subject
            $curriculumSubject = Curriculum_Subject::updateOrCreate(
                [
                    'curricula_id'  => $curriculumId,
                    'subject_id'    => $subject->id,
                    'semesters_id'  => $subj['semester_id'],
                    'year_level_id' => $yearLevel->id,
                ],
                [
                    'lec_unit' => $subj['lec'],
                    'lab_unit' => $labUnit,
                    'type'     => $subj['type'],
                ]
            );

            // Store mapping for later use in prerequisites
            $subjectMap[$subj['code']] = $curriculumSubject->id;
        }

        /**
         * STEP 2: Attach prerequisites now that all curriculum_subjects exist
         */
        foreach ($validated['subjects'] as $subj) {
            if (!empty($subj['prerequisites'])) {
                $currentCurrSubjId = $subjectMap[$subj['code']] ?? null;
                if (!$currentCurrSubjId) continue;

                // Get the curriculum_subject IDs for prerequisite subjects
                $prereqIds = collect($subj['prerequisites'])
                    ->map(fn($code) => $subjectMap[$code] ?? null)
                    ->filter()
                    ->toArray();

                // Sync the prerequisites (pivot table)
                if (!empty($prereqIds)) {
                    Curriculum_Subject::find($currentCurrSubjId)
                        ->prerequisites()
                        ->sync($prereqIds);
                }
            } else {
                // If no prerequisites, ensure it's detached
                $currentCurrSubjId = $subjectMap[$subj['code']] ?? null;
                if ($currentCurrSubjId) {
                    Curriculum_Subject::find($currentCurrSubjId)
                        ->prerequisites()
                        ->detach();
                }
            }
        }
    });

    return redirect()->back()->with('success', 'Subjects added successfully!');
}


public function updateSubject(Request $request, $curriculumId)
{
    $validated = $request->validate([
        'id'                      => 'required|integer|exists:curriculum_subject,id',
        'code'                    => 'required|string|max:50',
        'title'                   => 'required|string|max:255',
        'lec'                     => 'required|integer|min:0',
        'lab'                     => 'nullable|integer|min:0',
        'semester_id'             => 'required|integer|exists:semesters,id',
        'year'                    => 'required|string|max:50',
        'type'                    => 'required|in:Old,New',
        'prerequisites'           => 'nullable|array',
        'prerequisites.*.code'    => 'nullable|string|exists:subjects,code',
        'prerequisites.*.comment' => 'nullable|string|max:255',
    ]);

    $user = Auth::user();

    if ($user->role !== 'program_head') {
        return redirect()->back()->with('error', 'Unauthorized action.');
    }

    try {
        DB::transaction(function () use ($validated, $curriculumId, $user) {
            $labUnit = $validated['lab'] ?? 0;

            // ✅ Update or create the subject
            $subject = Subjects::updateOrCreate(
                ['code' => $validated['code']],
                [
                    'descriptive_title' => $validated['title'],
                    'department_id'     => $user->department_id,
                ]
            );

            // ✅ Ensure year level exists
            $yearLevel = Year_Level::firstOrCreate([
                'year_level' => $validated['year'],
            ]);

            // ✅ Update curriculum_subject
            $curriculumSubject = Curriculum_Subject::findOrFail($validated['id']);
            $curriculumSubject->update([
                'curricula_id'  => $curriculumId,
                'subject_id'    => $subject->id,
                'semesters_id'  => $validated['semester_id'],
                'year_level_id' => $yearLevel->id,
                'lec_unit'      => $validated['lec'],
                'lab_unit'      => $labUnit,
                'type'          => $validated['type'],
            ]);

            // ✅ Remove old prerequisites
            PreRequisites::where('curriculum_subject_id', $curriculumSubject->id)->delete();

            if (!empty($validated['prerequisites'])) {
                foreach ($validated['prerequisites'] as $pre) {
                    // Allow comment-only entries (no subject code)
                    $preSubject = !empty($pre['code'])
                        ? Subjects::where('code', $pre['code'])->first()
                        : null;

                    PreRequisites::create([
                        'curriculum_subject_id'   => $curriculumSubject->id,
                        'prerequisite_subject_id' => $preSubject?->id, // nullable
                        'comment'                 => $pre['comment'] ?? null,
                    ]);

                    Log::info('✅ Inserted prerequisite/comment', [
                        'curriculum_subject_id'   => $curriculumSubject->id,
                        'prerequisite_subject_id' => $preSubject?->id,
                        'comment'                 => $pre['comment'] ?? null,
                    ]);
                }
            } else {
                Log::info('ℹ️ No prerequisites provided', [
                    'curriculum_subject_id' => $curriculumSubject->id,
                ]);
            }
        });

        return redirect()->back()->with('success', 'Subject updated successfully with comments!');
    } catch (\Exception $e) {
        Log::error('❌ Failed to update subject', ['error' => $e->getMessage()]);
        return redirect()->back()->with('error', 'Failed to update subject: ' . $e->getMessage());
    }
}




public function uploadFile(Request $request, $curriculumId)
{
    Log::info("📂 Upload started for curriculum ID: {$curriculumId}");

    $validated = $request->validate([
        'file' => 'required|file|mimes:xls,xlsx,csv,doc,docx,pdf,jpg,jpeg,png|max:5120',
    ]);

    $user = Auth::user();
    Log::info("👤 Authenticated user:", ['id' => $user->id, 'role' => $user->role, 'name' => $user->username ?? $user->email]);

    if ($user->role !== 'program_head') {
        Log::warning("❌ Unauthorized attempt by user {$user->id}");
        abort(403, 'Unauthorized');
    }

    $file = $request->file('file');
    $extension = strtolower($file->getClientOriginalExtension());
    Log::info("📑 File received:", ['name' => $file->getClientOriginalName(), 'ext' => $extension]);

    try {
        // Excel/CSV → parse subjects
        if (in_array($extension, ['xls', 'xlsx', 'csv'])) {
            Excel::import(new \App\Imports\SubjectsImport($curriculumId, $user), $file);
            Log::info("✅ Excel subjects uploaded successfully");
            return redirect()->back()->with('success', 'Subjects uploaded and stored successfully!');
        }

        // PDF, Word, Image → store file
        if (in_array($extension, ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'])) {
            $filePath = $file->store('curriculum_files');

            DB::table('curriculum_files')->insert([
                'curriculum_id' => $curriculumId,
                'user_id'       => $user->id,
                'file_name'     => $file->getClientOriginalName(),
                'file_path'     => $filePath,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);

            Log::info("📄 File stored successfully", ['file' => $filePath]);
            return redirect()->back()->with('success', 'File uploaded and stored successfully!');
        }

        return redirect()->back()->with('error', 'Unsupported file type.');

    } catch (\Exception $e) {
        Log::error("❌ Upload failed:", ['error' => $e->getMessage()]);
        return redirect()->back()->with('error', 'Upload failed: ' . $e->getMessage());
    }
}
}
