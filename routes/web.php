<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\LoginController;
use App\Http\Controllers\AdminControllers\RegistrarController;
use App\Http\Controllers\AdminControllers\EnrollmentController;
use App\Http\Controllers\AdminControllers\ProgramHeadController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\RegistrarControllers\CurriculumController;
use App\Http\Controllers\RegistrarControllers\CoursesController;
use App\Http\Controllers\RegistrarControllers\SubjectsController;
use App\Http\Controllers\RegistrarControllers\DepartmentController;
use App\Http\Controllers\RegistrarControllers\Academic_yearsControllers;
use App\Http\Controllers\RegistrarControllers\SemesterController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

// GUEST ROUTES
Route::middleware('guest')->group(function () {
    Route::get('/', [LoginController::class, 'showLoginForm'])->name('login');  // <-- change here
    Route::post('/login', [LoginController::class, 'store'])->name('login.attempt');
});


// LOGOUT
Route::post('/logout', [LoginController::class, 'destroy'])->middleware('auth')->name('logout');

// AUTHENTICATED ROUTES
Route::middleware('auth')->group(function () {
    // UNIFIED DASHBOARD ROUTE
    Route::get('/dashboard', function () {
        $user = Auth::user();

        return match ($user->role) {
            'admin'        => Inertia::render('Admin/Dashboard'),
            'registrar'    => Inertia::render('Registrar/Dashboard'),
            'program_head' => Inertia::render('ProgramHead/Dashboard'),
            'faculty'      => Inertia::render('Faculty/Dashboard'),
            'student',
            'students'     => Inertia::render('Students/Dashboard'),
            'judge'        => Inertia::render('Judge/Dashboard'),
            default        => Inertia::render('dashboard'), // fallback
        };
    })->name('dashboard');

    // PROFILE ROUTES
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

   
//ADMINISTRATOR ROUTES
    Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('admin.dashboard');
    Route::get('/registrar', [RegistrarController::class, 'index'])->name('registrar.index');
    Route::post('/registrar', [RegistrarController::class, 'store'])->name('registrar.store');
    Route::put('/registrar/{id}', [RegistrarController::class, 'update'])->name('registrar.update');
    Route::post('/registrar/send-email', [RegistrarController::class, 'sendEmail'])
    ->name('registrar.send.email');
    Route::get('/program-head',[ProgramHeadController::class, 'index'])->name('programHead.index');
    Route::post('/program-head', [ProgramHeadController::class, 'store'])->name('programHead.store');
    Route::put('/program-head/{id}', [ProgramHeadController::class, 'update'])->name('programHead.update');


    Route::get('/records', [EnrollmentController::class, 'records'])->name('admin.enrollment.records');
    Route::get('/periods', [EnrollmentController::class, 'periods'])->name('admin.enrollment.periods');
    Route::get('/manage', [EnrollmentController::class, 'manage'])->name('admin.enrollment.manage');
    Route::get('/sections', [EnrollmentController::class, 'sections'])->name('admin.enrollment.sections');
    });
// REGISTRAR ROUTES
    Route::prefix('registrar')->name('registrar.')->group(function () {
        Route::get('/dashboard', fn () => Inertia::render('Registrar/Dashboard'))->name('dashboard');
        Route::get('/curriculum', [CurriculumController::class, 'index'])->name('curriculum.index'); 
        Route::get('/courses', [CoursesController::class, 'index'])->name('courses.index'); 
        Route::post('/courses', [CoursesController::class, 'store'])->name('courses.store');
        Route::put('/courses/{id}', [CoursesController::class, 'update'])->name('courses.update');
        Route::put('/courses/{id}/status', [CoursesController::class, 'toggleStatus'])->name('courses.toggleStatus');
        Route::get('/subjects',[SubjectsController::class,'index'])->name('subjects.index');
        Route::post('/subjects',[SubjectsController::class,'store'])->name('subjects.store');
        Route::put('/subjects/{id}',[SubjectsController::class,'update'])->name('subjects.update');
        Route::get('/department', [DepartmentController::class, 'index'])->name('departments.index');
        Route::post('/department', [DepartmentController::class, 'store'])->name('departments.store');
        Route::post('/registrar/department', [DepartmentController::class, 'store'])->name('departments.store');
        Route::put('/registrar/department/{id}', [DepartmentController::class, 'update'])->name('departments.update');
        Route::get('/academic-year', [Academic_yearsControllers::class, 'index'])->name('academic_year.index');
        Route::post('/academic-year', [Academic_yearsControllers::class, 'store'])->name('academic-year.store');  
        Route::put('/academic-year/{id}', [Academic_yearsControllers::class, 'update'])->name('academic-year.update'); 
        Route::put('academic_year/{id}/toggleStatus', [Academic_yearsControllers::class, 'toggleStatus'])->name('academic-year.toggleStatus');
        Route::get('/semester',[SemesterController::class, 'index'])->name('semester.index');
        Route::post('/semester',[SemesterController::class, 'store'])->name('semester.store');
    });

    Route::prefix('program-head')->name('program-head.')->group(function () {
        Route::get('/dashboard', fn () => Inertia::render('ProgramHead/Dashboard'))->name('dashboard');
    });

    Route::prefix('faculty')->name('faculty.')->group(function () {
        Route::get('/dashboard', fn () => Inertia::render('Faculty/Dashboard'))->name('dashboard');
    });

    Route::prefix('students')->name('students.')->group(function () {
        Route::get('/dashboard', fn () => Inertia::render('Students/Dashboard'))->name('dashboard');
    });

    Route::prefix('judge')->name('judge.')->group(function () {
        Route::get('/dashboard', fn () => Inertia::render('Judge/Dashboard'))->name('dashboard');
    });
});

// OPTIONAL: AUTH scaffolding
require __DIR__.'/auth.php';
