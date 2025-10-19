<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class major extends Model
{
    use HasFactory;

    protected $table = 'majors';

    protected $fillable = [
        'name',
        'code',
        'description',
        'courses_id',
        'status',
    ];
    public function majors() {
    return $this->hasMany(Major::class, 'courses_id'); // if you have majors
}

}
