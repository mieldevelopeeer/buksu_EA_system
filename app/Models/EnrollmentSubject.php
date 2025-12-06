<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EnrollmentSubject extends Model
{
    use HasFactory;

    protected $table = 'enrollment_subjects';

    protected $fillable = [
        'id',
        'enrollment_id',
        'class_schedule_id',
        'curriculum_subject_id',
        'status',
        'drop_reason',
        'dropped_at',
        'dropped_by',
    ];

   // ✅ Belongs to Enrollment
  public function enrollment()
    {
        return $this->belongsTo(Enrollments::class, 'enrollment_id');
    }

     // ✅ Relationship to Faculty (Users table)
   public function faculty()
{
    return $this->hasOneThrough(
        Users::class,
        Class_Schedules::class,
        'id',          // class_schedules.id
        'id',          // users.id
        'class_schedule_id', // enrollment_subjects.class_schedule_id
        'faculty_id'   // class_schedules.faculty_id
    );
}

    public function student()
    {
        return $this->hasOneThrough(
            Users::class,         // final model: Users
            Enrollments::class,   // intermediate model: Enrollments
            'id',                 // enrollments.id
            'id',                 // users.id
            'enrollment_id',      // enrollment_subjects.enrollment_id
            'student_id'          // enrollments.student_id
        );
    }

    public function classSchedule()
    {
        return $this->belongsTo(Class_Schedules::class, 'class_schedule_id');
    }

    public function curriculumSubject()
    {
        return $this->belongsTo(Curriculum_Subject::class, 'curriculum_subject_id');
    }

    public function subject()
    {
        return $this->hasOneThrough(
            Subjects::class,
            Curriculum_Subject::class,
            'id',
            'id',
            'curriculum_subject_id',
            'subject_id'
        );
    }

    public function course()
    {
        return $this->hasOneThrough(
            Courses::class,
            Class_Schedules::class,
            'id',               // class_schedules primary key
            'id',               // courses primary key
            'class_schedule_id',// FK on enrollment_subjects → class_schedules
            'courses_id'        // FK on class_schedules → courses
        );
    }

    public function droppedBy()
    {
        return $this->belongsTo(Users::class, 'dropped_by');
    }

    /**
     * Get the grades for the enrollment subject.
     */
    public function grades()
    {
        return $this->hasOne(Grades::class, 'enrollment_subject_id', 'id');
    }

    /**
     * Get the first grade record for the enrollment subject.
     */
    public function grade()
    {
        return $this->hasOne(Grades::class, 'enrollment_subject_id', 'id');
    }
}

