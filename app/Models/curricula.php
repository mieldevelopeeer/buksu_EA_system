<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Curriculum_Subject;

class Curricula extends Model
{
    use HasFactory;

    protected $table = 'curricula';

    protected $fillable = [
        'id',
        'name',
        'description',
        'semesters_id',
        'department_id',
        'courses_id',
        'majors_id',
        'status',

    ];

     public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function curriculumSubjects()
{
    return $this->hasMany(Curriculum_Subject::class, 'curricula_id');
}
    public function course() {
        return $this->belongsTo(Courses::class, 'courses_id');
    }

    public function major() {
        return $this->belongsTo(Major::class, 'majors_id');
    }



}



