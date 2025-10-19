<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Enrollments extends Model
{
    use HasFactory;


    protected $table = 'enrollments';   
   protected $fillable = [
    'student_id',
    'courses_id',
    'majors_id',
    'enrolled_at',
    'year_level_id',
    'semester_id',
    'section_id',
    'school_year_id', // <-- must be here
    'status',
    'student_type',
];



// Student relationship
     public function user()
    {
        // student_id in enrollments points to id in users
        return $this->belongsTo(Users::class, 'student_id', 'id');
    }
    // Semester relationship
    public function semester()
    {
        return $this->belongsTo(Semester::class, 'semester_id','id');
    }

    // School Year relationship
    public function schoolYear()
    {
        return $this->belongsTo(AcademicYear::class, 'school_year_id');
    }

    // Course relationship
    public function course()
    {
        return $this->belongsTo(Courses::class, 'courses_id');
    }

    // Major relationship
    public function major()
    {
        return $this->belongsTo(Major::class, 'majors_id');
    }

    // Year Level relationship
    public function yearLevel()
    {
        return $this->belongsTo(YearLevel::class, 'year_level_id', 'id');
    }

    // Section relationship
    public function section()
    {
        return $this->belongsTo(Section::class, 'section_id','id');
    }

      public function student()
    {
        return $this->belongsTo( Users::class, 'student_id','id');
    }

      // ✅ ClassSchedules (many-to-many)
    public function classSchedules()
    {
        return $this->belongsToMany(
            Class_Schedules::class,
            'enrollment_subjects',
            'enrollment_id',
            'class_schedule_id'
        )->withTimestamps();
    }
public function enrollmentSubjects()
{
    return $this->hasMany(EnrollmentSubject::class, 'enrollment_id','id');
}   
public function enrollments()
{
    return $this->hasManyThrough(
        Enrollments::class, // final model
        Section::class,    // intermediate model
        'id',              // PK on Section
        'section_id',      // FK on Enrollment → Section
        'section_id',      // FK on ClassSchedule → Section
        'id'               // PK on Section
    );
}


}


