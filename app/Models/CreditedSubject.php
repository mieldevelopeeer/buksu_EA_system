<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CreditedSubject extends Model
{
    use HasFactory;

    protected $table = "credited_subjects";
    
protected $fillable = [
    'student_id',               // match the table
    'curriculum_subject_id',
    'credited_units',
    'remarks',
];


}
