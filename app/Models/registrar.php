<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Users;


class registrar extends Model
{
    use HasFactory;
    protected $table = 'registrar';
    protected $fillable =[
        'id_number',
        'users_id'
    ];

    public function user()
{
    return $this->belongsTo(Users::class, 'users_id');
}



}
