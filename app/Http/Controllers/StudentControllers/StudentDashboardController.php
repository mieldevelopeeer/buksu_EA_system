<?php

namespace App\Http\Controllers\StudentControllers;

use App\Http\Controllers\Controller;
use App\Models\EnrollmentSubject;
use App\Models\Grades;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;

class StudentDashboardController extends Controller
{
    public function index(Request $request)
    {
        $student = $request->user();

        if (!$student) {
            abort(403, 'Unable to resolve authenticated student.');
        }

        $today = Carbon::now();
        $tomorrow = Carbon::now()->addDay();

        return Inertia::render('Students/Dashboard', [
            'classesToday' => $this->loadClassesForDay($student->id, $today),
            'classesTomorrow' => $this->loadClassesForDay($student->id, $tomorrow),
            'gradeSummary' => $this->buildGradeSummary($student->id),
            'auth' => [
                'user' => $student->only(['id', 'name', 'email', 'role']),
            ],
        ]);
    }

    protected function loadClassesForDay(int $studentId, Carbon $day): array
    {
        $fullDay = strtolower($day->format('l')); // e.g. monday
        $shortDay = strtolower($day->format('D')); // e.g. mon

        $subjects = EnrollmentSubject::with([
                'classSchedule.classroom',
                'classSchedule.curriculumSubject.subject',
            ])
            ->whereHas('enrollment', function ($query) use ($studentId) {
                $query->where('student_id', $studentId)
                    ->where('status', 'enrolled');
            })
            ->whereHas('classSchedule', function ($query) use ($fullDay, $shortDay) {
                $query->where(function ($inner) use ($fullDay, $shortDay) {
                    $inner->whereRaw('LOWER(schedule_day) = ?', [$fullDay])
                        ->orWhereRaw('LOWER(schedule_day) = ?', [$shortDay])
                        ->orWhereRaw('LOWER(schedule_day) LIKE ?', ['%' . $shortDay . '%']);
                });
            })
            ->get()
            ->filter(function ($subject) {
                return $subject->classSchedule !== null;
            })
            ->sortBy(function ($subject) {
                return $subject->classSchedule->start_time ?? '23:59:59';
            })
            ->map(function ($subject) {
                $schedule = $subject->classSchedule;
                $curriculumSubject = $subject->curriculumSubject;
                $subjectModel = optional($curriculumSubject)->subject;

                return [
                    'id' => $subject->id,
                    'subject' => $subjectModel->descriptive_title
                        ?? $subjectModel->title
                        ?? $subjectModel->name
                        ?? 'Subject',
                    'start_time' => $schedule->start_time,
                    'end_time' => $schedule->end_time,
                    'time' => $this->formatTimeRange($schedule->start_time, $schedule->end_time),
                    'room' => optional($schedule->classroom)->room_number ?? 'Room TBA',
                    'day' => $schedule->schedule_day,
                ];
            })
            ->values();

        return $subjects->toArray();
    }

    protected function buildGradeSummary(int $studentId): array
    {
        $gradeRecords = Grades::whereHas('enrollment', function ($query) use ($studentId) {
            $query->where('student_id', $studentId);
        })
            ->orderByDesc('updated_at')
            ->get(['midterm', 'final', 'updated_at']);

        $numericGrades = $gradeRecords
            ->map(fn ($record) => $this->resolveNumericGrade($record))
            ->filter(fn ($value) => $value !== null);

        $gpa = $numericGrades->isNotEmpty()
            ? round($numericGrades->avg(), 2)
            : null;

        $latest = $gradeRecords->first();

        $latestGrade = $latest ? $this->resolveNumericGrade($latest) : null;

        return [
            'gpa' => $gpa,
            'latestGrade' => $latestGrade,
            'updatedAt' => $latest?->updated_at?->diffForHumans(),
            'status' => $this->determineGradeStatus($gpa),
        ];
    }

    protected function resolveNumericGrade($record): ?float
    {
        if (!$record) {
            return null;
        }

        if (isset($record->grade) && is_numeric($record->grade)) {
            return (float) $record->grade;
        }

        $midterm = is_numeric($record->midterm ?? null) ? (float) $record->midterm : null;
        $final = is_numeric($record->final ?? null) ? (float) $record->final : null;

        if ($midterm !== null && $final !== null) {
            return ($midterm + $final) / 2;
        }

        return $final ?? $midterm;
    }

    protected function determineGradeStatus(?float $gpa): ?string
    {
        if ($gpa === null) {
            return null;
        }

        if ($gpa <= 1.75) {
            return 'excellent';
        }

        if ($gpa <= 2.25) {
            return 'good';
        }

        if ($gpa <= 2.75) {
            return 'warning';
        }

        return 'at risk';
    }

    protected function formatTimeRange(?string $start, ?string $end): string
    {
        if (!$start || !$end) {
            return 'Schedule to follow';
        }

        return trim($this->formatTimeSingle($start) . ' - ' . $this->formatTimeSingle($end));
    }

    protected function formatTimeSingle(?string $time): string
    {
        if (!$time) {
            return '';
        }

        try {
            return Carbon::createFromFormat('H:i:s', $time)->format('g:i A');
        } catch (\Exception $e) {
            // If DB stores HH:MM only
            try {
                return Carbon::createFromFormat('H:i', $time)->format('g:i A');
            } catch (\Exception $ignored) {
                return $time;
            }
        }
    }
}
