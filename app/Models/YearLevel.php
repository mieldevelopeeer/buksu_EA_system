<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class YearLevel extends Model
{
    use HasFactory;
    
    protected $table = 'year_levels'; // Specify the table name if it differs from the model name

    protected $fillable = [
        'id',
        'year_level',
       
        
    ];

     public function curriculumSubjects()
    {
        return $this->hasMany(Curriculum_Subject::class, 'year_level_id');
    }
}
