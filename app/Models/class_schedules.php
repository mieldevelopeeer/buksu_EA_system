<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Class_Schedules extends Model
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
        'color',
    ];

    /**
     * Get the faculty that owns the class ClassSchedules.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function faculty(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Users::class, 'faculty_id');
    }

    /**
     * Get the classroom that owns the class ClassSchedules.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Classrooms::class, 'classroom_id');
    }

    /**
     * Alias for classroom relationship (for backward compatibility).
     */
    public function room(): BelongsTo
    {
        return $this->classroom();
    }

    /**
     * Get the school year that owns the class ClassSchedules.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'school_year_id');
    }

    /**
     * Get the semester that owns the class ClassSchedules.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class, 'semester_id');
    }

    /**
     * Get the curriculum subject that owns the class ClassSchedules.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function curriculumSubject(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Curriculum_Subject::class, 'curriculum_subject_id');
    }

    /**
     * Get the day for the class ClassSchedules.
     * This is a helper method since schedule_day is an enum.
     *
     * @return string|null
     */
    public function getDayAttribute(): ?string
    {
        return $this->schedule_day;
    }

    /**
     * Get the section that owns the class ClassSchedules.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Section::class, 'section_id')
            ->with('yearLevel');
    }

    /**
     * Get the enrollment subjects for the class ClassSchedules.
     */
    /**
     * Get the enrollment subjects for the class ClassSchedules.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function enrollmentSubjects()
    {
        return $this->hasMany(\App\Models\EnrollmentSubject::class, 'class_schedule_id')
            ->with(['subject', 'course']);
    }

    /**
     * Get the course that owns the class ClassSchedules.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Courses::class, 'courses_id');
    }

    /**
     * Get the subject through curriculum_subject.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasOneThrough
     */
    public function subject()
    {
        return $this->hasOneThrough(
            \App\Models\Subjects::class,            // Final model
            \App\Models\Curriculum_Subject::class,  // Intermediate
            'id',                                   // PK on curriculum_subject
            'id',                                   // PK on subjects
            'curriculum_subject_id',                // FK on class_schedules
            'subject_id'                            // FK on curriculum_subject
        );
    }

    /**
     * Get the year level that owns the class ClassSchedules.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function yearLevel(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Year_Level::class, 'year_level_id');
    }

    /**
     * Get the enrollments for the class ClassSchedules.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany|\Illuminate\Database\Query\Builder
     */
    public function enrollments()
    {
        return $this->section 
            ? $this->section->enrollments() 
            : $this->hasMany(\App\Models\Enrollments::class, 'section_id', 'section_id');
    }

    /**
     * Get the formatted time range.
     *
     * @return string
     */
    public function getFormattedTimeAttribute(): string
    {
        if (!$this->start_time || !$this->end_time) {
            return 'TBA';
        }
        
        return sprintf(
            '%s - %s',
            date('h:i A', strtotime($this->start_time)),
            date('h:i A', strtotime($this->end_time))
        );
    }
    
    /**
     * Get the display name for the schedule.
     *
     * @return string
     */
    public function getDisplayNameAttribute(): string
    {
        $parts = [
            $this->schedule_day,
            $this->formatted_time,
            $this->classroom ? '(' . $this->classroom->room_number . ')' : ''
        ];
        
        return implode(' ', array_filter($parts));
    }
}


