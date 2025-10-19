<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\EnrollmentPeriod;
use App\Models\AcademicYear;
use App\Models\Semester;
use Inertia\Inertia;

class EnrollmentPeriodController extends Controller
{
    /**
     * Show all enrollment periods.
     */
    public function index()
    {
        $enrollmentPeriods = EnrollmentPeriod::with(['schoolYear', 'semester'])
            ->orderBy('start_date', 'desc')
            ->get();

        $schoolYears = AcademicYear::orderBy('school_year', 'desc')->get();
        $semesters   = Semester::orderBy('id')->get();

        return Inertia::render('Registrar/Enrollment/EnrollmentPeriod', [
            'enrollmentPeriods' => $enrollmentPeriods,
            'schoolYears'       => $schoolYears,
            'semesters'         => $semesters,
        ]);
    }

    /**
     * Store a new enrollment period.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'start_date'     => 'required|date',
            'end_date'       => 'required|date|after_or_equal:start_date',
            'status'         => 'required|in:Open,Closed',
            'school_year_id' => 'required|exists:school_year,id',
            'semester_id'    => 'required|exists:semesters,id',
        ]);

        EnrollmentPeriod::create([
            'start_date'     => $validated['start_date'],
            'end_date'       => $validated['end_date'],
            'status'         => $validated['status'],
            'school_year_id' => $validated['school_year_id'],
            'semesters_id'   => $validated['semester_id'],
        ]);

        return redirect()->route('registrar.enrollmentperiod.index')
            ->with('success', 'Enrollment period created successfully.');
    }

    /**
     * Update an existing enrollment period.
     */
    public function update(Request $request, EnrollmentPeriod $enrollmentPeriod)
    {
        $validated = $request->validate([
            'start_date'     => 'required|date',
            'end_date'       => 'required|date|after_or_equal:start_date',
            'status'         => 'required|in:Open,Closed',
            'school_year_id' => 'required|exists:school_year,id',
            'semester_id'    => 'required|exists:semesters,id',
        ]);

        $enrollmentPeriod->update([
            'start_date'     => $validated['start_date'],
            'end_date'       => $validated['end_date'],
            'status'         => $validated['status'],
            'school_year_id' => $validated['school_year_id'],
            'semesters_id'   => $validated['semester_id'],
        ]);

        return redirect()->route('registrar.enrollmentperiod.index')
            ->with('success', 'Enrollment period updated successfully.');
    }

    /**
     * Toggle the status between Open and Closed.
     */
    public function toggleStatus(EnrollmentPeriod $enrollmentPeriod)
    {
        $enrollmentPeriod->update([
            'status' => $enrollmentPeriod->status === 'Open' ? 'Closed' : 'Open',
        ]);

        return redirect()->route('registrar.enrollmentperiod.index')
            ->with('success', 'Enrollment period status updated.');
    }
}
