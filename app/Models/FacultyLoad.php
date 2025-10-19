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
}
