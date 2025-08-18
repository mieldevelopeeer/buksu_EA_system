<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class courses extends Model
{
    use HasFactory;
     protected $table = 'courses';
     
    protected $fillable = [
        'department_id',
        'id',
        'code',
        'name',
        'description',
        'degree_type',
        'status',
        
    ];

    public function department()
{
    return $this->belongsTo(Department::class);
}

}
