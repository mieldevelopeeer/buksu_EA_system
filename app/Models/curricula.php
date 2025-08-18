<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class curricula extends Model
{
    use HasFactory;

    protected $table = 'curricula';

    protected $fillable = [
        'id',
        'name',
        'semesters_id',
        'department_id',

    ];
}
