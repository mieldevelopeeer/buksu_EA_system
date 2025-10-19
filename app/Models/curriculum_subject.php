<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Curriculum_Subject extends Model
{
    use HasFactory;

    protected $table = 'curriculum_subject';

    protected $fillable = [
        'id',
        'lec_unit',
        'lab_unit',
        'semesters_id',
        'school_id',
        'subject_id',
        'year_level_id',
        'curricula_id',
        'curriculum_subject_id',
        'type',
    ];

     public function curriculum()
    {
        return $this->belongsTo(Curricula::class, 'curricula_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subjects::class, 'subject_id');
    }

    public function semester()
    {
        return $this->belongsTo(Semester::class, 'semesters_id');
    }

    public function yearLevel()
    {
        return $this->belongsTo(year_level::class, 'year_level_id');
    }
    // ✅ Add this for schedules
public function classSchedules()
{
    return $this->hasMany(Class_Schedules::class, 'curriculum_subject_id' , 'id');
}
// Link to its curriculum
public function curricula()
{
    return $this->belongsTo(Curricula::class, 'curricula_id'); 
}

// Access the course through curriculum
public function course()
{
    return $this->hasOneThrough(
        Courses::class,    // final model
        Curricula::class, // intermediate model
        'id',             // Curricula table PK
        'id',             // Courses table PK
        'curricula_id',   // FK on Curriculum_Subject to Curricula
        'courses_id'      // FK on Curricula to Course
    )->select('courses.*');
}

public function prerequisites()
{
    return $this->belongsToMany(
        Curriculum_Subject::class,
        'prerequisite_subjects',
        'curriculum_subject_id',
        'prerequisite_subject_id'
          )
    ->withPivot('comment') // ✅ include comment
    ->with('subject');     // eager load subject details
}
    


    


   
}
