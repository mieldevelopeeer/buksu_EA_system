<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Requirement;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RequirementsController extends Controller
{
    public function index()
    {
        $enumValues = \DB::select("SHOW COLUMNS FROM requirements LIKE 'required_for'");
    preg_match("/^enum\('(.*)'\)$/", $enumValues[0]->Type, $matches);
    $requiredForOptions = explode("','", $matches[1]);

        $requirements = Requirement::all();
        return Inertia::render('Registrar/Enrollment/Requirements', [
            'requirements' => $requirements,
             'requiredForOptions' => $requiredForOptions,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'description'  => 'nullable|string',
            'required_for' => 'required|string', // Example: "Freshmen", "Transferee", etc.
        ]);

        Requirement::create($validated);

        return redirect()->back()->with('success', 'Requirement added successfully!');
    }


    public function update(Request $request, $id)
    {
        $requirement = Requirement::findOrFail($id);

        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'description'  => 'nullable|string',
            'required_for' => 'required|string',
            'status'       => 'boolean',
        ]);

        $requirement->update($validated);

        return redirect()->back()->with('success', 'Requirement updated successfully!');
    }

   


//     // Example inside your controller
// public function getRequired_for()
// {
//   $enumValues = \DB::select("SHOW COLUMNS FROM requirements LIKE 'required_for'");
//     preg_match("/^enum\('(.*)'\)$/", $enumValues[0]->Type, $matches);
//     $requiredForOptions = explode("','", $matches[1]);

//     return Inertia::render('Registrar/Enrollment/Requirements', [
//         'requiredForOptions' => $requiredForOptions,
//     ]);

}

