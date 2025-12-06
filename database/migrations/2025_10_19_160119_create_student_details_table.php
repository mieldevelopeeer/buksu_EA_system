<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('student_details', function (Blueprint $table) {
            $table->id();

            // Link to users table (role = student)
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // --- A. GENERAL INFORMATION ---
            $table->string('campus')->nullable();

            $table->date('birth_date')->nullable();
            $table->string('place_of_birth')->nullable();
            $table->decimal('height_ft', 4, 2)->nullable();
            $table->decimal('weight_kg', 5, 2)->nullable();
            $table->string('contact_number', 20)->nullable();
            $table->string('email_address')->nullable();
            $table->string('exam_result')->nullable();

            // --- B. ADDRESSES AND CONTACTS ---
            $table->string('current_address_street')->nullable();
            $table->string('current_address_barangay')->nullable();
            $table->string('current_address_municipality')->nullable();
            $table->string('current_address_province')->nullable();

            $table->string('home_address_street')->nullable();
            $table->string('home_address_barangay')->nullable();
            $table->string('home_address_municipality')->nullable();
            $table->string('home_address_province')->nullable();

            // --- FAMILY / GUARDIAN INFO ---
            $table->string('father_name')->nullable();
            $table->string('father_contact')->nullable();
            $table->string('father_occupation')->nullable();

            $table->string('mother_maiden_name')->nullable();
            $table->string('mother_contact')->nullable();
            $table->string('mother_occupation')->nullable();

            $table->string('guardian_name')->nullable();
            $table->string('guardian_contact')->nullable();
            $table->string('guardian_occupation')->nullable();

            // --- C. EDUCATIONAL BACKGROUND ---
            $table->string('last_school_attended')->nullable();
            $table->string('last_school_name')->nullable();
            $table->year('last_school_year_graduated')->nullable();

            $table->string('college_name')->nullable();
            $table->year('college_year_graduated')->nullable();

            $table->string('senior_high_school_name')->nullable();
            $table->year('senior_high_school_year_graduated')->nullable();

            $table->string('junior_high_school_name')->nullable();
            $table->year('junior_high_school_year_graduated')->nullable();

            $table->string('elementary_school_name')->nullable();
            $table->year('elementary_school_year_graduated')->nullable();

            // --- D. SYSTEM FIELDS ---
            $table->enum('admission_type', [
                'Freshman',
                'Continuing',
                'Transferee',
                'Returnee',
                'Shiftee'
            ])->default('Freshman');

            $table->enum('transfer_status', [
                'None',
                'Pending',
                'Transferred',
                'Unenrolled'
            ])->default('None');

            // 👇 NEW FIELD: Student academic standing
            $table->enum('student_status', [
                'Regular',
                'Irregular'
            ])->default('Regular');

            // Link to department (null for non-students)
            $table->foreignId('department_id')
                ->nullable()
                ->constrained('departments')
                ->nullOnDelete();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_details');
    }
};
