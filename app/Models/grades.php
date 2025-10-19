<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\class_schedules;

class Grades extends Model
{
    use HasFactory;

    protected $table = 'grades';

    protected $fillable = [
        'id',
        'enrollment_id',
        'class_schedule_id',
        'faculty_id',
        'grade',
        'midterm',
        'final',
        'remarks',
        'status',
        'midterm_status',
        'final_status',
        'confirmed_by',
        'confirmed_at',
    ];

    public function enrollmentSubject()
    {
        return $this->belongsTo(EnrollmentSubject::class, 'enrollment_subject_id');
    }

    // Relationship to enrollment
// Relationship to enrollment
    public function enrollment()
    {
        return $this->belongsTo(Enrollments::class, 'enrollment_id');
    }

    // Optional: relationship to faculty
    public function faculty()
    {
        return $this->belongsTo(Users::class, 'faculty_id');
    }

    public function classSchedule()
    {
        return $this->belongsTo(class_schedules::class, 'class_schedule_id');
    }

}
