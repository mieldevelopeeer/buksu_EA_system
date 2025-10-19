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
        Schema::create('faculty_load', function (Blueprint $table) {
            $table->id(); // Link to faculty user
            $table->foreignId('faculty_id')   // faculty is just a user with role = faculty
                  ->constrained('users')
                  ->onDelete('cascade');

            // Course / subject assignment
            $table->foreignId('courses_id')
                  ->constrained('courses')
                  ->onDelete('cascade');

            $table->foreignId('curriculum_subject_id')
                  ->nullable()
                  ->constrained('curriculum_subject')
                  ->onDelete('cascade');

            // Semester & Academic Year
            $table->foreignId('semester_id')
                  ->nullable()
                  ->constrained('semesters')
                  ->onDelete('cascade');

            $table->foreignId('school_year_id')->constrained('school_year');

      

            // Faculty type
             $table->enum('type', ['Regular', 'Part-Time'])->default('Regular');

            // Load details
            $table->integer('official_load')->default(0);   // official teaching load
            $table->integer('total_units')->default(0);     // total units handled
            $table->integer('student_count')->default(0);   // number of students

            // Extra info
            $table->integer('units')->default(0); 


            $table->timestamps();
      
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('faculty_load');
    }
};
