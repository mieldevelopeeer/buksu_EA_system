<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Registrar;
use App\Models\ProgramHead;

class Users extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
     protected $table = 'users';
     
    protected $fillable = [
        'fName',
        'mName',
        'lName',
        'id_number',
        'generated_password',
        'suffix',
        'username',
        'email',
        'password',
        'role',
        'contact_no',
        'address',
        'profession',
        'gender',
        'date_of_birth',
        'profile_picture',
        'department_id',

    ];
    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    /**
     * The attributes that should be appended to the model array.
     * This ensures name fields are included when serializing to JSON (for Inertia).
     *
     * @var array<int, string>
     */
    protected $appends = [
        'name',
        'full_name',
    ];

    public function getAuthIdentifierName()
    {
        return 'username';
    }

    /**
     * Accessor for the 'name' attribute to return full name.
     * This ensures compatibility with Laravel's standard naming conventions.
     */
    public function getNameAttribute()
    {
        return "{$this->fName} {$this->mName} {$this->lName}";
    }
    // 🔹 Student belongs to a user
    public function user()
    {
        return $this->belongsTo(Users::class, 'student_id');
    }
public function registrar()
{
    return $this->hasOne(Registrar::class, 'users_id');
}

public function programHead(){

    return $this->hasOne(ProgramHead::class, 'users_id','id');

}
public function department()
    {
        return $this->belongsTo(Department::class, 'department_id', 'id');
    }
public function facultyLoads()
{
    return $this->hasMany(FacultyLoad::class, 'faculty_id'); // adjust table & foreign key
}
public function class_schedules()
{
    return $this->hasMany(Class_Schedules::class, 'faculty_id');
}
public function student()
{
    return $this->hasOne(Student::class, 'user_id');
}
public function studentDetails()
{
    return $this->hasOne(StudentDetail::class, 'user_id');
}
// In Users.php
public function getFullNameAttribute()
{
    return "{$this->fName} {$this->mName} {$this->lName}";
}
public function studentRequirements()
{
    return $this->hasMany(StudentRequirement::class, 'student_id');
}

public function enrollments()
{
    return $this->hasMany(Enrollments::class, 'student_id');
}



}
