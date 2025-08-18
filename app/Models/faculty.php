<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class faculty extends Model
{
    use HasFactory;

    protected $table = 'faculty';

    protected $fillable = [

        'id',
        'id_number',
        'address',
        'bod',  
        'users_id',
        
    ];
}
