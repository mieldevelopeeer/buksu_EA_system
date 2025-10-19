<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class subjects extends Model
{
    use HasFactory;
      protected $table = 'subjects';
     
    protected $fillable = [
        'department_id',
        'id',
        'code',
        'descriptive_title',
    
    ];

 public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function curriculumSubjects()
    {
        return $this->hasMany(Curriculum_Subject::class, 'subject_id');
    }

     public function class_schedules()
    {
        return $this->hasMany(Class_Schedules::class, 'subject_id');
    }
}
