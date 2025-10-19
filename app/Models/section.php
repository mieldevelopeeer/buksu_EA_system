<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\department;
use App\Models\courses;
use App\Models\major;
use App\Models\Enrollments;

class section extends Model
{
    use HasFactory;

    protected $table = 'sections';
    protected $fillable = [
        'id',
       'section',
       'student_limit',
       'status',
       'department_id',
         'year_level_id',
         'classroom_id',
    ];
    
     protected $casts = [
        'status' => 'boolean', // Laravel will auto-cast 0/1 → true/false
    ];

    public function yearLevel()
    {
        return $this->belongsTo(YearLevel::class, 'year_level_id');
    }

    public function class_schedules()
    {
        return $this->hasMany(Class_Schedules::class, 'section_id');
    }

    public function department()
    {
        return $this->belongsTo(department::class, 'department_id');
    }

    public function courses()
    {
        return $this->hasMany(courses::class, 'department_id', 'department_id');
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollments::class, 'section_id', 'id');
    }

protected $appends = ['course_alias', 'major_alias'];

public function getCourseAliasAttribute()
{
    $course = $this->relationLoaded('courses')
        ? $this->courses->first()
        : $this->courses()->first();

    return $course?->code;
}

public function majors()
{
    return $this->hasManyThrough(
        major::class,
        courses::class,
        'department_id',
        'courses_id',
        'department_id',
        'id'
    );
}

public function getMajorAliasAttribute()
{
    $major = $this->relationLoaded('majors')
        ? $this->majors->first()
        : $this->majors()->first();

    return $major?->code;
}
}
