<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    use HasFactory;

      protected $table = 'departments';
     
    protected $fillable = [
        'id',
        'name',
        'description',
        
    ];

    public function courses()
    {
        return $this->hasMany(Courses::class, 'department_id');
    }
}
