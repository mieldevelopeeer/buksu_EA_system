<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\courses;

class class_schedules extends Model
{
    use HasFactory;

    protected $table = 'class_schedules';
     protected $fillable = [
        'start_time',
        'end_time',
        'schedule_day',
        'load_hours',
        'curriculum_subject_id',
        'year_level_id',
        'courses_id',
        'schedule_group',
        'faculty_id',
        'classroom_id',
        'school_year_id',
        'semester_id',
        'section_id',
    ];

     // Relationships
    // public function subject() 
    // {
    //     return $this->belongsTo(Subjects::class, 'subject_id', 'id');
    // }

    public function faculty()  
    {
        return $this->belongsTo(Users::class, 'faculty_id', 'id');
    }

    public function classroom() 
    {
        return $this->belongsTo(Classrooms::class, 'classroom_id', 'id');
    }

    public function schoolYear()
    {
        return $this->belongsTo(AcademicYear::class, 'school_year_id', 'id');
    }

    public function semester()
    {
        return $this->belongsTo(Semester::class, 'semester_id', 'id');
    }

    public function section()  
    {
        return $this->belongsTo(Section::class, 'section_id', 'id')
          ->with('yearLevel');;
    }

 public function enrollmentSubjects()
    {
        return $this->hasMany(EnrollmentSubject::class, 'class_schedule_id', 'id');
    }
    // In class_schedules.php
   public function curriculumSubject()
{
    return $this->belongsTo(Curriculum_Subject::class, 'curriculum_subject_id')
                  ->with(['subject', 'course']);; // eager load the related Subject
}

    public function course()
    {
        return $this->belongsTo(courses::class, 'courses_id');
    }

  // 🔹 Shortcut: ClassSchedule → Subject (through curriculum_subject)
   public function subject()
{
    return $this->hasOneThrough(
        Subjects::class,            // Final model
        Curriculum_Subject::class,  // Intermediate
        'id',                       // PK on curriculum_subject
        'id',                       // PK on subjects
        'curriculum_subject_id',    // FK on class_schedules
        'subject_id'                // FK on curriculum_subject
    );
}

public function yearLevel()
{
    return $this->belongsTo(YearLevel::class, 'year_level_id', 'id');
}


public function enrollments()
{
    return $this->section ? $this->section->enrollments() : $this->hasMany(enrollments::class, 'section_id', 'section_id');
}
 public function getFormattedTimeAttribute()
    {
        return sprintf(
            '%s - %s',
            date('h:i A', strtotime($this->start_time)),
            date('h:i A', strtotime($this->end_time))
        );
    }
}

