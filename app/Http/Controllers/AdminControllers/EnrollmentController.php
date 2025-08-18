<?php

namespace App\Http\Controllers\AdminControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EnrollmentController extends Controller
{
   public function records()
    {
        return Inertia::render('Admin/Enrollments/EnrollmentRecords');
    }

    public function periods()
    {
        return Inertia::render('Admin/Enrollments/EnrollmentPeriods');
    }

    public function manage()
    {
        return Inertia::render('Admin/Enrollments/EnrollDropStudents');
    }

    public function sections()
    {
        return Inertia::render('Admin/Enrollments/Sections');
    }
}
