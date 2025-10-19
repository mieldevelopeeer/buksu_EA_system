<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class courses extends Model
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

// App\Models\Curriculum_Subject.php
public function subject() {
    return $this->belongsTo(Subject::class);
}
public function curriculum()
{
    return $this->hasOne(Curricula::class, 'courses_id'); 
    // or hasMany if a course can have multiple curricula
}

public function getFullCourseCodeAttribute() {
    return $this->code . ($this->major ? '-' . $this->major : '');
}

}
