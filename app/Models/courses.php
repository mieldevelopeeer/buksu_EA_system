<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Courses extends Model
{
    use HasFactory;
     protected $table = 'courses';
     
    protected $fillable = [
        'department_id',
        'id',
        'code',
        'name',
        'description',
        'degree_type',
        'status',
        
    ];

    public function department()
{
    return $this->belongsTo(Department::class);
}
public function majors()
{
    return $this->hasMany(Major::class, 'courses_id');
}
  public function faculty(): BelongsTo
    {
        return $this->belongsTo(Faculty::class, 'faculty_id');
    }
// App\Models\Curriculum_Subject.php
public function subject() {
    return $this->belongsTo(Subject::class);
}
public function curricula()
{
    return $this->hasMany(Curricula::class, 'courses_id'); 
}

// Alias for backward compatibility
public function curriculum()
{
    return $this->hasOne(Curricula::class, 'courses_id');
}

public function getFullCourseCodeAttribute() {
    return $this->code . ($this->major ? '-' . $this->major : '');
}

}
