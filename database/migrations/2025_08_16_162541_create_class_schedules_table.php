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
        Schema::create('class_schedules', function (Blueprint $table) {
              // Time & day
               $table->id(); 
    $table->time('start_time');
    $table->time('end_time');
   $table->enum('schedule_day', ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']);
    $table->integer('load_hours')->nullable(); // computed from start-end, but optional

    // Links
    // Links
   $table->foreignId('curriculum_subject_id')
                ->constrained('curriculum_subject')
                ->onDelete('cascade');

    $table->foreignId('faculty_id')->nullable()   // users with role=faculty
          ->constrained('users')
          ->onDelete('cascade');

    $table->foreignId('classroom_id')->nullable()
          ->constrained('classrooms')
          ->onDelete('cascade');

    $table->foreignId('school_year_id')
          ->constrained('school_year')
          ->onDelete('cascade');

    $table->foreignId('semester_id')
          ->constrained('semesters')
          ->onDelete('cascade');

    $table->foreignId('section_id')
          ->constrained('sections')
          ->onDelete('cascade');

    $table->foreignId('courses_id')
          ->nullable()
          ->constrained('courses')
          ->cascadeOnDelete();

    // ✅ Add year_level_id
    $table->foreignId('year_level_id')
          ->constrained('year_levels')
          ->onDelete('cascade')
          ->after('courses_id'); // optional

          


     // Allow adding multiple schedules for the same subject/section
    $table->unsignedInteger('schedule_group')->default(1)
          ->comment('Groups schedules for same subject, e.g. Lec=1, Lab=2');

            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('class_schedules');
    }
};
