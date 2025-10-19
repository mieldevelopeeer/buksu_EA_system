<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class requirement extends Model
{
    use HasFactory;

    protected $table = 'requirements';

    protected $fillable = [
        'id',
        'name',
        'description',
        'required_for',
        'status',
        'image',
    ];
}
