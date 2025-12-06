<?php

namespace App\Http\Controllers\ProgramHeadControllers;

use App\Http\Controllers\Controller;
use App\Models\Curricula;
use App\Models\Courses;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class OtherCurriculaController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'search' => 'nullable|string|max:120',
            'course_id' => 'nullable|integer',
        ]);

        $query = Curricula::query()
            ->where('status', 'approved')
            ->with([
                'course:id,name,code',
                'curriculumSubjects.subject:id,code,descriptive_title',
                'curriculumSubjects.prerequisites',
                'curriculumSubjects.yearLevel:id,year_level',
                'curriculumSubjects.semester:id,semester',
            ])
            ->select('id', 'name', 'courses_id');

        if ($request->filled('course_id')) {
            $query->where('courses_id', $request->course_id);
        }

        if ($request->filled('search')) {
            $term = '%' . $request->input('search') . '%';
            $query->where(function ($builder) use ($term) {
                $builder->where('name', 'like', $term)
                    ->orWhereHas('course', function ($courseQuery) use ($term) {
                        $courseQuery->where('name', 'like', $term)
                            ->orWhere('code', 'like', $term);
                    });
            });
        }

        $curricula = $query->limit(20)->get()->map(function ($curriculum) {
            $subjects = $curriculum->curriculumSubjects
                ->filter(fn ($subject) => $subject->prerequisites->isEmpty())
                ->map(function ($subject) use ($curriculum) {
                    return [
                        'curriculum_subject_id' => $subject->id,
                        'subject_id' => $subject->subject_id,
                        'code' => $subject->subject?->code,
                        'title' => $subject->subject?->descriptive_title,
                        'lec_unit' => $subject->lec_unit,
                        'lab_unit' => $subject->lab_unit,
                        'year_level' => optional($subject->yearLevel)->year_level,
                        'semester' => optional($subject->semester)->semester,
                        'course_name' => $curriculum->course?->name,
                        'course_code' => $curriculum->course?->code,
                    ];
                })
                ->values();

            return [
                'id' => $curriculum->id,
                'name' => $curriculum->name,
                'course_name' => $curriculum->course?->name,
                'course_code' => $curriculum->course?->code,
                'subjects' => $subjects,
            ];
        })->filter(fn ($entry) => $entry['subjects']->isNotEmpty())->values();

        $courseOptions = Courses::query()
            ->select('id', 'name', 'code')
            ->whereIn('id', function ($subQuery) {
                $subQuery->select('courses_id')
                    ->from((new Curricula())->getTable())
                    ->whereNotNull('courses_id')
                    ->where('status', 'approved');
            })
            ->orderBy('name')
            ->get();

        return response()->json([
            'curricula' => $curricula,
            'courses' => $courseOptions,
        ], SymfonyResponse::HTTP_OK);
    }
}
