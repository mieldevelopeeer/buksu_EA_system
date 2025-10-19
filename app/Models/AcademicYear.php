<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AcademicYear extends Model
{
    use HasFactory;
protected $table = 'school_year';

    protected $fillable = [
        'id',
        'school_year',
        'is_active',
        
        
    ];


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

public function semesters()
{
    return $this->hasMany(Semester::class, 'school_year_id');
}

}
