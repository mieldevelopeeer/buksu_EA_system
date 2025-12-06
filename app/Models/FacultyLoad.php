<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FacultyLoad extends Model
{
    use HasFactory;

    protected $table = 'faculty_load';

    protected $fillable = [
        'faculty_id',
        'type',
        'official_load',
        'total_units',
        'student_count',
        'units',
        'courses_id',
        'curriculum_subject_id',
        'semester_id',
        'school_year_id',

    ];

    public function curriculumSubject()
    {
        return $this->belongsTo(Curriculum_Subject::class, 'curriculum_subject_id');
    }

    public function course()
    {
        return $this->belongsTo(Courses::class, 'courses_id');
    }

    public function semester()
    {
        return $this->belongsTo(Semester::class, 'semester_id');
    }

    public function schoolYear()
    {
        return $this->belongsTo(AcademicYear::class, 'school_year_id');
    }
}
