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
}
