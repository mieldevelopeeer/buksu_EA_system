<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class curriculum_subject extends Model
{
    use HasFactory;

    protected $table = 'curriculum_subject';

    protected $fillable = [
        'id',
        'lec_unit',
        'lab_uni',
        'school_id',
        'year_level',
        'curricula_id',
        'subject_id',
    ];
}
