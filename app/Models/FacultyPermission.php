<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FacultyPermission extends Model
{
    use HasFactory;

    protected $table = 'faculty_evaluation_permissions';

    protected $fillable = [
        'faculty_id',
        'course_id',
        'major_id',
        'is_active',
        'can_print_cor',
        'granted_until',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'can_print_cor' => 'boolean',
        'granted_until' => 'date',
    ];

    public function faculty()
    {
        return $this->belongsTo(Users::class, 'faculty_id');
    }

    public function course()
    {
        return $this->belongsTo(Courses::class, 'course_id');
    }

    public function major()
    {
        return $this->belongsTo(Major::class, 'major_id');
    }
}
