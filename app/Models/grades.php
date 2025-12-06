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
        'enrollment_subject_id',
        'class_schedule_id',
        'faculty_id',
        'grade',
        'midterm',
        'final',
        'summer',
        'remarks',
        'midterm_status',
        'final_status',
        'summer_status',
        'midterm_change_status',
        'final_change_status',
        'summer_change_status',
        'confirmed_by',
        'confirmed_at',
        'status',
        'created_at',
        'updated_at'
    ];
    
    protected $casts = [
        'midterm' => 'float',
        'final' => 'float',
        'summer' => 'float',
        'confirmed_at' => 'datetime',
    ];

    /**
     * Get the enrollment subject that owns the grade.
     */
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
        return $this->belongsTo(Class_Schedules::class, 'class_schedule_id');
    }

}
