<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    protected $table = 'attendance';

    protected $fillable = [
        'type',
        'date',
        'time_in',
        'time_out',
        'status',
        'enrollment_id',
        'class_schedule_id',
    ];

    protected $casts = [
        'date' => 'date',
        'time_in' => 'datetime',
        'time_out' => 'datetime',
    ];

    public function enrollment()
    {
        return $this->belongsTo(Enrollments::class, 'enrollment_id');
    }

    public function classSchedule()
    {
        return $this->belongsTo(class_schedules::class, 'class_schedule_id');
    }
}
