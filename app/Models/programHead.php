<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Users;

class programHead extends Model
{
    use HasFactory;

    protected $table = 'program_head';

    protected $fillable =[
        'user_id',
        'id_number',
        'contact_no',
        'department_id',
        'suffix',

    ];


        public function user()
{
    return $this->belongsTo(Users::class, 'users_id');
}

  public function department()
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

}
