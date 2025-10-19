<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PreRequisites extends Model
{
    use HasFactory;

    protected $table = 'prerequisite_subjects';

    protected $fillable = [
        'curriculum_subject_id',
        'prerequisite_subject_id',
        'comment',
    ];

    public function curriculumSubject()
    {
        return $this->belongsTo(Curriculum_Subject::class, 'curriculum_subject_id');
    }

    public function prerequisite()
    {
        return $this->belongsTo(Curriculum_Subject::class, 'prerequisite_subject_id');
    }
}
