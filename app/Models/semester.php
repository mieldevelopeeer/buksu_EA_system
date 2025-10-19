<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class semester extends Model
{
    use HasFactory;

    protected $table ='semesters';

     protected $fillable = ['school_year_id', 'semester', 'is_active'];

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class, 'school_year_id');
    }
 public function subject()
{
    return $this->belongsTo(Subjects::class, 'subject_id');
}
public function section()
{
    return $this->belongsTo(Section::class, 'section_id');
}

public function classroom()
{
    return $this->belongsTo(Classroom::class, 'classroom_id');
}
}
