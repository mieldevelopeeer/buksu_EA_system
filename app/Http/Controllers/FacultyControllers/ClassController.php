<?php

namespace App\Http\Controllers\FacultyControllers;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use App\Models\class_schedules;
use App\Models\Section;
use Illuminate\Support\Facades\Auth;

class ClassController extends Controller
{
    public function index()
    {
        // Get the numeric ID of the logged-in user
        $facultyId = Auth::user()->id; // this should be an integer

        \Log::info('Logged-in faculty numeric ID:', [$facultyId]);

        $sections = Section::whereHas('class_schedules', function ($query) use ($facultyId) {
                $query->where('faculty_id', $facultyId);
            })
            ->with(['yearLevel', 'department', 'majors'])
            ->orderBy('section')
            ->get();

        // Fetch schedules assigned to this faculty
        $schedules = class_schedules::with([
                'curriculumSubject.course',
                'curriculumSubject.curricula.major',
                'classroom',
                'section',
                'schoolYear',
                'semester'
            ])
            ->where('faculty_id', $facultyId) // now numeric
            ->orderBy('schedule_day')
            ->orderBy('start_time')
            ->get();

        \Log::info('Schedules fetched:', [$schedules->toArray()]);

        return Inertia::render('Faculty/MyClass/Classes', [
            'schedules' => $schedules,
            'sections' => $sections,
        ]);
    }
}