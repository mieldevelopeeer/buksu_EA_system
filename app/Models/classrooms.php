<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class classrooms extends Model
{
    use HasFactory;


    protected $table = 'classrooms';

    protected $fillable = [
       'room_number',
       'capacity',
    ];
}

