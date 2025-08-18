<?php

// app/Http/Controllers/Registrar/CurriculumController.php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Inertia\Inertia;

class CurriculumController extends Controller
{
    public function index()
    {
        return Inertia::render('Registrar/Curriculum/Curriculum');
    }
}

