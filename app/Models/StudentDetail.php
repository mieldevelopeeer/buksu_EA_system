<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentDetail extends Model
{
    use HasFactory;

    protected $table = 'student_details';

    protected $fillable = [
        'user_id',
        'campus',
        'birth_date',
        'place_of_birth',
        'height_ft',
        'weight_kg',
        'contact_number',
        'email_address',
        'exam_result',
        'current_address_street',
        'current_address_barangay',
        'current_address_municipality',
        'current_address_province',
        'home_address_street',
        'home_address_barangay',
        'home_address_municipality',
        'home_address_province',
        'father_name',
        'father_contact',
        'father_occupation',
        'mother_maiden_name',
        'mother_contact',
        'mother_occupation',
        'guardian_name',
        'guardian_contact',
        'guardian_occupation',
        'last_school_attended',
        'last_school_name',
        'last_school_year_graduated',
        'college_name',
        'college_year_graduated',
        'senior_high_school_name',
        'senior_high_school_year_graduated',
        'junior_high_school_name',
        'junior_high_school_year_graduated',
        'elementary_school_name',
        'elementary_school_year_graduated',
        'admission_type',
        'transfer_status',
        'student_status',
        'department_id',
    ];
}
