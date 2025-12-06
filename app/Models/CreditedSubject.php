<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CreditedSubject extends Model
{
    use HasFactory;

    protected $table = 'credited_subjects';

    protected $fillable = [
        'student_id',
        'curriculum_subject_id',
        'credited_units',
        'remarks',
    ];

    public function curriculumSubject()
    {
        return $this->belongsTo(Curriculum_Subject::class, 'curriculum_subject_id');
    }

    public function subject()
    {
        return $this->hasOneThrough(
            Subjects::class,
            Curriculum_Subject::class,
            'id', // curriculum_subject primary key
            'id', // subjects primary key
            'curriculum_subject_id',
            'subject_id'
        );
    }
}
