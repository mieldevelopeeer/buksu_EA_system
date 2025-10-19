<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Profile\PasswordSecurityController;
use App\Http\Controllers\LoginController;

use App\Http\Controllers\AdminControllers\RegistrarController;
use App\Http\Controllers\AdminControllers\EnrollmentController;
use App\Http\Controllers\AdminControllers\ProgramHeadController;
use App\Http\Controllers\AdminControllers\DeptandProgController;
use App\Http\Controllers\AdminControllers\ReportsController;
use App\Http\Controllers\AdminControllers\AcademicRecordsController as AdminAcademicRecordsController;
use App\Http\Controllers\AdminControllers\CurriculumsperDeptController;
use App\Http\Controllers\AdminControllers\ClassroomsController;
use App\Http\Controllers\AdminControllers\FacultiesController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\RegistrarControllers\CurriculumController;
use App\Http\Controllers\RegistrarControllers\CoursesController;
use App\Http\Controllers\RegistrarControllers\SubjectsController;
use App\Http\Controllers\RegistrarControllers\DepartmentController;
use App\Http\Controllers\RegistrarControllers\Academic_yearsControllers;
use App\Http\Controllers\RegistrarControllers\SemesterController;
use App\Http\Controllers\RegistrarControllers\RequirementsController;
use App\Http\Controllers\RegistrarControllers\StudentRecsController;
use App\Http\Controllers\RegistrarControllers\PreEnrollController;
use App\Http\Controllers\RegistrarControllers\EnrolledStudController;
use App\Http\Controllers\RegistrarControllers\AcademicYearSemesterController;
use App\Http\Controllers\RegistrarControllers\StudentListController;
use App\Http\Controllers\RegistrarControllers\EnrollmentPeriodController;
use App\Http\Controllers\RegistrarControllers\EnrollmentReportsController;
use App\Http\Controllers\RegistrarControllers\GradeReportsController;


use App\Http\Controllers\ProgramHeadControllers\CurriculaController;
use App\Http\Controllers\ProgramHeadControllers\SectionController;
use App\Http\Controllers\ProgramHeadControllers\EvaluationEnrollmentController;
use App\Http\Controllers\ProgramHeadControllers\EnrolledStudentsController;
use App\Http\Controllers\ProgramHeadControllers\FacultyController;
use App\Http\Controllers\ProgramHeadControllers\AcademicRecordsController as ProgramHeadAcademicRecordsController;
use App\Http\Controllers\ProgramHeadControllers\ReportsController as ProgramHeadReportsController;

use App\Http\Controllers\FacultyControllers\GradeController;
use App\Http\Controllers\FacultyControllers\FacultyReportsController;
use App\Http\Controllers\FacultyControllers\ClassController;
use App\Http\Controllers\FacultyControllers\AttendanceController;


use App\Http\Controllers\StudentControllers\AcademicRecordsController;
use App\Http\Controllers\StudentControllers\MyEnrolledSubController;
use App\Http\Controllers\StudentControllers\MyGradesController;
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
            'student'      => Inertia::render('Students/Dashboard'),
            // 'judge'        => Inertia::render('Judge/Dashboard'),
            default        => Inertia::render('dashboard'), // fallback
        };
    })->name('dashboard');

    // PROFILE ROUTES
    Route::get('/profile', [ProfileController::class, 'index'])->name('profile.index');
    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar'])->name('profile.avatar.upload');
    Route::get('/profile/edit', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::get('/change-password', [PasswordController::class, 'edit'])->name('password.change');
    Route::put('/change-password', [PasswordController::class, 'update'])->name('password.change.update');

    Route::get('/secure-changepass', [PasswordSecurityController::class, 'edit'])->name('profile.password.edit');
    Route::put('/secure-changepass', [PasswordSecurityController::class, 'update'])->name('profile.password.update');

    
//ADMINISTRATOR ROUTES
    Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', [\App\Http\Controllers\AdminControllers\AdminDashboardController::class, 'index'])->name('admin.dashboard');
    Route::get('/curriculums', [CurriculumsperDeptController::class, 'index'])->name('curricula.index');
   // Publicly accessible curriculum detail
    Route::get('/DeptCurriculums/{id}', [CurriculumsperDeptController::class, 'show'])
    ->name('DeptCurriculums.show');
    Route::put('/curriculums/{id}/status', [CurriculumsperDeptController::class, 'updateStatus'])
        ->name('curricula.updateStatus');
    Route::get('/classrooms', [ClassroomsController::class, 'index'])->name('classrooms.classrooms');
    Route::post('/classrooms', [ClassroomsController::class, 'store'])->name('classrooms.store');
    Route::put('/classrooms/{id}', [ClassroomsController::class, 'update'])->name('classrooms.update');

    Route::get('/registrar', [RegistrarController::class, 'index'])->name('registrar.index');
    Route::post('/registrar', [RegistrarController::class, 'store'])->name('registrar.store');
    Route::put('/registrar/{id}', [RegistrarController::class, 'update'])->name('registrar.update');
    Route::post('/registrar/send-email', [RegistrarController::class, 'sendEmail'])
        ->name('registrar.send.email');
    Route::get('/program-head',[ProgramHeadController::class, 'index'])->name('programHead.index');
    Route::post('/program-head', [ProgramHeadController::class, 'store'])->name('programHead.store');
    Route::put('/program-head/{id}', [ProgramHeadController::class, 'update'])->name('programHead.update');
    Route::get('/programs/departments', [DeptandProgController::class, 'index'])->name('programs.departments');
    Route::get('/programs/courses', [DeptandProgController::class, 'courses'])->name('programs.courses');
    Route::get('/reports/enrollment-report', [ReportsController::class, 'enrollment'])->name('reports.enrollmentReport');
    Route::get('/reports/grade-report', [ReportsController::class, 'grades'])->name('reports.gradeReport');

    Route::get('/faculty',[FacultiesController::class , 'index'])->name('faculties.index');
    Route::post('/faculty', [FacultiesController::class, 'store'])->name('faculties.store');
    Route::put('/faculty/{id}', [FacultiesController::class, 'update'])->name('faculties.update');

    Route::get('/records', [EnrollmentController::class, 'records'])->name('admin.enrollment.records');
    Route::get('/periods', [EnrollmentController::class, 'periods'])->name('admin.enrollment.periods');
    Route::get('/manage', [EnrollmentController::class, 'manage'])->name('admin.enrollment.manage');
    Route::get('/sections', [EnrollmentController::class, 'sections'])->name('admin.enrollment.sections');

    Route::prefix('academic')->name('academic.')->group(function () {
        Route::get('/students', [AdminAcademicRecordsController::class, 'students'])->name('students');
        Route::get('/students/{student}', [AdminAcademicRecordsController::class, 'studentGrades'])->name('students.show');
        Route::get('/grades', [AdminAcademicRecordsController::class, 'gradeList'])->name('grades');
        Route::get('/grades/{student}', [AdminAcademicRecordsController::class, 'studentGrades'])->name('grades.show');

        Route::get('/requirements', [AdminAcademicRecordsController::class, 'requirements'])->name('requirements');
        Route::post('/requirements', [AdminAcademicRecordsController::class, 'storeRequirement'])->name('requirements.store');
        Route::put('/requirements/{requirement}', [AdminAcademicRecordsController::class, 'updateRequirement'])->name('requirements.update');

        Route::get('/submitted-requirements', [AdminAcademicRecordsController::class, 'submittedRequirements'])->name('requirements.submitted');
    });
    Route::prefix('academic-setup')->name('academic-setup.')->group(function () {
        Route::get('/class-schedules', [AdminAcademicRecordsController::class, 'classSchedules'])->name('schedule');
    });
    });
// REGISTRAR ROUTES
    Route::prefix('registrar')->name('registrar.')->group(function () {
        Route::get('/dashboard', fn () => Inertia::render('Registrar/Dashboard'))->name('dashboard');
        Route::get('/curriculum', [CurriculumController::class, 'index'])->name('curriculum.index'); 
         Route::get('/curriculum/{id}', [CurriculumController::class, 'show'])->name('curriculum.show');
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
        Route::get('/program-heads', [DepartmentController::class, 'showHeads'])->name('departments.heads');
        Route::get('/academic-year', [Academic_yearsControllers::class, 'index'])->name('academic_year.index');
        Route::post('/academic-year', [Academic_yearsControllers::class, 'store'])->name('academic-year.store');  
        Route::put('/academic-year/{id}', [Academic_yearsControllers::class, 'update'])->name('academic-year.update'); 
        Route::put('academic_year/{id}/toggleStatus', [Academic_yearsControllers::class, 'toggleStatus'])->name('academic-year.toggleStatus');
        Route::get('/semester',[SemesterController::class, 'index'])->name('semester.index');
        Route::post('/semester',[SemesterController::class, 'store'])->name('semester.store');
        Route::get('/semester/toggle/{id}', [SemesterController::class, 'toggleStatus'])->name('semester.toggle');
        Route::get('/requirements', [RequirementsController::class, 'index'])->name('requirements.index');
        Route::post('/requirements', [RequirementsController::class, 'store'])->name('requirements.store');
        Route::put('/requirements/{id}', [RequirementsController::class, 'update'])->name('requirements.update');
        Route::get('/courses/{courseId}/majors', [CurriculumController::class, 'showMajors'])->name('courses.majors.index');
        Route::post('/courses/{course}/majors', [CurriculumController::class, 'storeMajors'])->name('courses.majors.store');
        Route::put('/courses/majors/{majorId}', [CurriculumController::class, 'updateMajors']) ->name('courses.majors.update');
// Fetch submitted grades for registrar
Route::get('/grades', [StudentRecsController::class, 'studentGrades'])
    ->name('student.grades');
Route::post('/students/create-account/{id}', [StudentRecsController::class, 'createAccount'])
    ->name('students.createAccount');
        
// Confirm or reject a submitted grade
Route::post('/grades/confirm', [StudentRecsController::class, 'confirmGrade'])
    ->name('grades.confirmGrade');

   Route::get('/pre-enroll', [PreEnrollController::class, 'index'])->name('preenroll.index');
    Route::get('/pre-enroll/{id}/review', [PreEnrollController::class, 'review'])->name('preenroll.review');
    Route::post('/pre-enroll/{id}/subjects', [PreEnrollController::class, 'updateSubjects'])->name('preenroll.updateSubjects');
    Route::post('/pre-enroll/{id}/confirm', [PreEnrollController::class, 'confirm'])->name('preenroll.confirm');
    Route::post('/pre-enroll/{id}/reject', [PreEnrollController::class, 'reject'])->name('preenroll.reject');
    
   Route::get('/enrolled', [EnrolledStudController::class, 'index'])->name('enrolled.index');
   
   Route::get('/account', [StudentRecsController::class, 'showStudentAcc'])->name('account.show');
 // Combined Academic Year & Semester page
    Route::get('/ay-semester', [AcademicYearSemesterController::class, 'index'])
        ->name('ay-semester.index');

     // Academic Year actions
Route::post('/ay-year/academic-year', [AcademicYearSemesterController::class, 'storeAcademicYear'])
    ->name('ay-year.store');

Route::put('/ay-year/{id}', [AcademicYearSemesterController::class, 'updateAcademicYear'])
    ->name('ay-year.update');

Route::put('/ay-year/{id}/toggle', [AcademicYearSemesterController::class, 'toggleYear'])
    ->name('ay-year.toggle');

// Semester actions
Route::post('/ay-semester', [AcademicYearSemesterController::class, 'storeSemester'])
    ->name('ay-semester.store');

Route::put('/ay-semester/{id}', [AcademicYearSemesterController::class, 'updateSemester'])
    ->name('ay-semester.update');

Route::put('/ay-semester/{id}/toggle', [AcademicYearSemesterController::class, 'toggleSemester'])
    ->name('ay-semester.toggle');

  
        Route::get('/students-profile', [StudentRecsController::class, 'studentProfiles'])
    ->name('students.profile');

    Route::get('/submitted-requirements', [StudentRecsController::class, 'showSubmittedReq'])
    ->name('submitted.requirements');
    Route::post('/submitted-requirements', [StudentRecsController::class, 'storeStudentRequirement'])
    ->name('submitted.requirements.store');
    Route::get('/students-list', [StudentListController::class, 'index'])->name('registrar.students.list');
    Route::get('/approved-grades',[StudentRecsController::class, 'showApprovedGrades'])->name('approved.grades');
    Route::get('/students-grades', [StudentRecsController::class, 'registrarStudentList'])
    ->name('students.grades.list');

Route::get('/students-grades/{id}', [StudentRecsController::class, 'registrarStudentGrades'])
    ->name('students.grades');

 Route::get('/enrollment-period', [EnrollmentPeriodController::class, 'index'])
        ->name('enrollmentperiod.index');

    // For storing new enrollment period
    Route::post('/enrollment-period', [EnrollmentPeriodController::class, 'store'])
        ->name('enrollmentperiod.store');
    Route::put('/enrollment-period/{enrollmentPeriod}', [EnrollmentPeriodController::class, 'update'])
        ->name('enrollmentperiod.update');
    Route::put('/enrollment-period/{enrollmentPeriod}/toggle', [EnrollmentPeriodController::class, 'toggleStatus'])
        ->name('enrollmentperiod.toggle');
        // Enrollment Reports
Route::get('/enrollment-reports', [EnrollmentReportsController::class, 'index'])
    ->name('enrollment-reports');

Route::get('/enrollment-reports/export/pdf', [EnrollmentReportsController::class, 'exportPdf'])
    ->name('enrollment-reports.export.pdf');

Route::get('/enrollment-reports/export/excel', [EnrollmentReportsController::class, 'exportExcel'])
    ->name('enrollment-reports.export.excel');
// Grade Reports
Route::get('/grade-reports', [GradeReportsController::class, 'index'])
    ->name('grade-reports');

// Optional: Export PDF/Excel if needed
Route::get('/grade-reports/export/pdf', [GradeReportsController::class, 'exportPdf'])
    ->name('grade-reports.export.pdf');

Route::get('/grade-reports/export/excel', [GradeReportsController::class, 'exportExcel'])
    ->name('grade-reports.export.excel');


    });

  


//PROGRAM HEAD ROUTES
        Route::prefix('program-head')->name('program-head.')->group(function () {
            Route::get('/dashboard', [\App\Http\Controllers\ProgramHeadControllers\PHDashboardController::class, 'index'])->name('dashboard');
            Route::get('/curricula',[CurriculaController::class, 'index'])->name('curricula.index');
            Route::post('/curricula', [CurriculaController::class, 'store'])->name('curriculum.store');
            Route::put('/curricula/{curriculum}', [CurriculaController::class, 'update'])->name('curriculum.update');
Route::get('curricula/subject/{code}', [CurriculaController::class, 'getSubjectByCode'])
    ->name('curricula.showSubject');

            Route::get('/curriculum/{id}', [CurriculaController::class, 'show'])->name('curriculum.show');
            Route::post('/curriculum/{id}', [CurriculaController::class, 'storeSubjects'])->name('curriculum.storeSubjects');
            Route::put('/curriculum/{id}', [CurriculaController::class, 'updateSubject'])->name('curriculum.updateSubject');
            Route::post('/curricula/{curriculum}/upload-file', [CurriculaController::class, 'uploadFile'])
            ->name('curricula.uploadFile');
            // Save prerequisites for a subject
            Route::post('/curriculum/{curriculum}/prerequisites', [CurriculaController::class, 'savePrerequisites'])
                ->name('curriculum.savePrerequisites');
                 Route::get('/enrollment/{enrollment}/grades', [EvaluationEnrollmentController::class, 'getGrades'])
        ->name('grades.index');
        Route::get('/enrollment/{id}/crediting', [EvaluationEnrollmentController::class, 'showCreditingSubjects'])
    ->name('enrollment.crediting');

        Route::post('subjectload/credit', [EvaluationEnrollmentController::class, 'storeCreditedSubjects'])
    ->name('subjectload.credit');
Route::get('/evaluation/{enrollment}/subjects', [EvaluationEnrollmentController::class, 'allSubjects'])
    ->name('evaluation.subjects.index');

Route::get('/evaluation/{enrollment}/curriculum-subjects', [EvaluationEnrollmentController::class, 'fetchCurriculumSubjects'])
    ->name('curriculum.subjects.index');
 
            
            Route::get('/faculties', [FacultyController::class, 'index'])->name('faculties.index');
            Route::post('/faculties', [FacultyController::class, 'store'])->name('faculties.store');
            Route::put('/faculties/{id}', [FacultyController::class, 'update'])->name('faculties.update');
            Route::get('/faculties/facultyload', [FacultyController::class, 'facultyLoad'])->name('faculty.load');
            Route::get('/faculties/assignfaculty', [FacultyController::class, 'assignFaculty'])->name('faculty.assign');
           Route::post('/faculties/assignfaculty', [FacultyController::class, 'addSched'])
    ->name('faculty.assign.addSched');


            Route::get('/section', [SectionController::class, 'index'])->name('sections.index');
            Route::post('/section', [SectionController::class, 'store'])->name('sections.store');
            Route::put('/section/{id}', [SectionController::class, 'update'])->name('sections.update');
            Route::get('/enrollment', [EvaluationEnrollmentController::class, 'index'])->name('enrollment.index');
            Route::get('/pending-enrollments', [EvaluationEnrollmentController::class, 'pending'])->name('pending.index');
            Route::patch('/section/{id}/toggle-status', [SectionController::class, 'toggleStatus'])
            ->name('sections.toggle-status');

            Route::get('/academic-records', [ProgramHeadAcademicRecordsController::class, 'index'])
                ->name('academic-records.index');
            Route::get('/academic-records/{enrollment}', [ProgramHeadAcademicRecordsController::class, 'show'])
                ->name('academic-records.show');

            Route::get('/reports/enrollment', [ProgramHeadReportsController::class, 'enrollment'])
                ->name('reports.enrollment');
            Route::get('/reports/grades', [ProgramHeadReportsController::class, 'grades'])
                ->name('reports.grades');
            Route::get('/reports/attendance', [ProgramHeadReportsController::class, 'attendance'])
                ->name('reports.attendance');

            Route::post('/enrollment/submit', [EvaluationEnrollmentController::class, 'submitEnrollment'])->name('enrollment.submit');
            Route::get('/evaluation/{id}/subjectload', [EvaluationEnrollmentController::class, 'showSubjectLoad'])
             ->name('evaluation.subjectload');
             Route::post('/evaluation/subjectload/store', [EvaluationEnrollmentController::class, 'storeSubjectLoad'])
            ->name('evaluation.subjectload.store');
             
            Route::get('/students/enrolled', [EnrolledStudentsController::class, 'index'])
             ->name('program-head.students.enrolled');
            
              Route::post('/check-student', [EvaluationEnrollmentController::class, 'checkStudent'])
        ->name('enrollment.checkStudent');
            Route::post('/check-email', [EvaluationEnrollmentController::class, 'checkEmail'])
        ->name('enrollment.checkEmail');
            Route::post('/check-curriculum', [EvaluationEnrollmentController::class, 'checkCurriculum'])
        ->name('enrollment.checkCurriculum');
            Route::get('students-list',[EnrolledStudentsController::class, 'students'])->name('students.list');
    });

    Route::prefix('faculty')->name('faculty.')->group(function () {
            Route::get('/dashboard', fn () => Inertia::render('Faculty/Dashboard'))->name('dashboard');
            Route::get('/grades', [GradeController::class, 'index'])->name('grades');
            Route::get('/reports/attendance', [FacultyReportsController::class, 'attendance'])->name('reports.attendance');
            Route::get('/reports/gradereport', [FacultyReportsController::class, 'grades'])->name('reports.gradereport');
             Route::get('/grades/fetch', [GradeController::class, 'fetchGrades'])->name('grades.fetch');
            Route::post('/grades', [GradeController::class, 'addGrades'])->name('grades.add'); 
            Route::get('/classes', [ClassController::class, 'index'])->name('classes');
            Route::get('/students-list', [\App\Http\Controllers\FacultyControllers\StudentsListController::class, 'index'])->name('students.list');
            Route::post('/students-list/drop', [\App\Http\Controllers\FacultyControllers\StudentsListController::class, 'dropStudent'])->name('students.drop');
            Route::get('/attendance', [AttendanceController::class, 'index'])->name('attendance');
            Route::get('/attendance/{section}', [AttendanceController::class, 'add'])
                ->name('attendance.add');
            Route::get('/attendance/{section}/records', [AttendanceController::class, 'showRecords'])
                ->name('attendance.records');
            Route::get('/attendance/{section}/subject/{schedule}', [AttendanceController::class, 'showSubject'])
                ->name('attendance.subject');
            Route::post('/attendance/{section}', [AttendanceController::class, 'store'])
                ->name('attendance.store');
// ✅ Route for Excel import
    Route::post('/import', [GradeController::class, 'insertExcel'])->name('grades.import');
    });
    

    Route::prefix('students')->name('students.')->group(function () {
    Route::get('/dashboard', fn () => Inertia::render('Students/Dashboard'))->name('dashboard');
          Route::get('/enrolled-subjects', [MyEnrolledSubController::class, 'index'])
        ->name('enrolled-subjects');
            Route::get('/grades', [MyGradesController::class, 'index'])
        ->name('grades');
            Route::get('/academic-records', [AcademicRecordsController::class, 'index'])
        ->name('academic-records');
            Route::get('/academic-records/{enrollment}', [AcademicRecordsController::class, 'show'])
        ->name('academic-records.show');
    });

    Route::prefix('judge')->name('judge.')->group(function () {
        Route::get('/dashboard', fn () => Inertia::render('Judge/Dashboard'))->name('dashboard');
    });
});

// OPTIONAL: AUTH scaffolding
require __DIR__.'/auth.php';
