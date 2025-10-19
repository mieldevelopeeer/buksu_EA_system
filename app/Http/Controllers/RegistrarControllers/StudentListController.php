<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Users;

class StudentListController extends Controller
{
    // Fetch all students and render list
    public function index()
    {
        $students = Users::where('role', 'student')
            ->orderBy('lName')
            ->get([
                'id',
                'fName',
                'mName',
                'lName',
                'id_number',
                'gender',
                'contact_no',
                'email',
            ]);

        return Inertia::render('Registrar/Enrollment/StudentsList', [
            'students' => $students,
        ]);
    }
}
