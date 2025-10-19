<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\AcademicYear;
use App\Models\Semester;

class EnrollmentPeriod extends Model
{
    use HasFactory;

    protected $table = 'enrollment_periods';
    protected $fillable = [
        'start_date',
        'end_date',
        'status',
        'school_year_id',
        'semesters_id',
    ];

    public function schoolYear()
    {
        return $this->belongsTo(AcademicYear::class, 'school_year_id');
    }

    public function semester()
    {
        return $this->belongsTo(Semester::class, 'semesters_id');
    }
}
