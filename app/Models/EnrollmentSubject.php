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
        return $this->belongsTo(class_schedules::class, 'class_schedule_id');
    }
        //  public function grade()
        // {
        //     // One-to-one relationship to Grades table
        //     return $this->hasOne(Grades::class, 'enrollment_id', 'enrollment_id')
        //                 ->where('class_schedule_id', $this->class_schedule_id);
        // }

        // EnrollmentSubject.php
// public function grades()
// {
//     return $this->hasOne(Grades::class, 'enrollment_id', 'enrollment_id')
//                 ->where('class_schedule_id', $this->class_schedule_id);
// }
// public function grades()
// {
//     return $this->hasOne(Grades::class, 'enrollment_id', 'enrollment_id')
//                 ->whereColumn('class_schedule_id', 'enrollment_subjects.class_schedule_id');
// }
// public function grade()
// {
//     return $this->hasOne(Grades::class, 'enrollment_id', 'enrollment_id')
//                 ->where('class_schedule_id', $this->class_schedule_id);
// }

public function grades()
{
    return $this->hasOne(Grades::class, 'enrollment_id', 'enrollment_id')
                ->where('grades.class_schedule_id', $this->class_schedule_id);
}

}


