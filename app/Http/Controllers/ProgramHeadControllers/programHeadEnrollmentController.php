<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class programHeadEnrollmentController extends Controller
{
     public function index()
    {
        return Inertia::render('Registrar/Evaluation/Enrollment');
    }
}
