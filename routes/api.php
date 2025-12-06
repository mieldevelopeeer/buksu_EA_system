<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Temporary route to check curriculum subjects
Route::get('/check-curriculum/{id}', function($id) {
    $curriculum = \App\Models\Curricula::with(['curriculumSubjects.subject'])->find($id);
    
    if (!$curriculum) {
        return response()->json(['error' => 'Curriculum not found'], 404);
    }
    
    return response()->json([
        'curriculum_id' => $curriculum->id,
        'curriculum_name' => $curriculum->name,
        'subjects_count' => $curriculum->curriculumSubjects->count(),
        'subjects' => $curriculum->curriculumSubjects->map(function($cs) {
            return [
                'id' => $cs->id,
                'subject_id' => $cs->subject_id,
                'subject_code' => $cs->subject->code ?? 'N/A',
                'subject_name' => $cs->subject->name ?? 'N/A',
                'lec_unit' => $cs->lec_unit,
                'lab_unit' => $cs->lab_unit,
                'year_level_id' => $cs->year_level_id,
                'semester_id' => $cs->semesters_id
            ];
        })
    ]);
});
