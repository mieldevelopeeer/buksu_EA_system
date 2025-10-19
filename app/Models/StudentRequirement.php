<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentRequirement extends Model
{
    use HasFactory;
     protected $table = 'student_requirements';
    protected $fillable = [
        'id',
        'student_id',
        'requirement_id',
        'image',
        'is_submitted',
        'submitted_at',

    ];

    
    // ✅ Relationship to Student (User)
    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    // ✅ Relationship to Requirement
    public function requirement()
    {
        return $this->belongsTo(Requirement::class, 'requirement_id');
    }   
}
