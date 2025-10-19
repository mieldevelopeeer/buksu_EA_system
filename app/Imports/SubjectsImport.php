<?php

namespace App\Imports;

use App\Models\Subjects;
use App\Models\Curriculum_Subject;
use App\Models\Semester;
use App\Models\year_level;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class SubjectsImport implements ToCollection, WithHeadingRow
{
    protected $curriculumId;
    protected $user;

    public function __construct($curriculumId, $user)
    {
        $this->curriculumId = $curriculumId;
        $this->user = $user;
    }

    public function collection(Collection $rows)
    {
        foreach ($rows as $row) {
            // Flexible headers
            $code        = $row['subject_code'] ?? $row['code'] ?? null;
            $title       = $row['descriptive_title'] ?? $row['title'] ?? null;
            $lec_unit    = $row['lec'] ?? $row['units'] ?? 0;
            $lab_unit    = $row['lab'] ?? 0;
            $semesterStr = $row['semester'] ?? $row['semester_name'] ?? null;
            $year        = $row['year'] ?? $row['year_level'] ?? null;

            if (!$code || !$title || !$semesterStr || !$year) continue;

            $semester = Semester::whereRaw('LOWER(semester) = ?', [strtolower(trim($semesterStr))])->first();
            if (!$semester) continue;

            $subject = Subjects::firstOrCreate(
                ['code' => $code],
                [
                    'descriptive_title' => $title,
                    'department_id'     => $this->user->department_id,
                ]
            );

            $yearLevel = year_level::firstOrCreate([
                'year_level' => $year,
            ]);

            Curriculum_Subject::updateOrCreate(
                [
                    'curricula_id'  => $this->curriculumId,
                    'subject_id'    => $subject->id,
                    'semesters_id'  => $semester->id,
                    'year_level_id' => $yearLevel->id,
                ],
                [
                    'lec_unit' => $lec_unit,
                    'lab_unit' => $lab_unit,
                ]
            );
        }
    }
}
