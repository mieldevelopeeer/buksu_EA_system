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
            $table->id();
               $table->string('schedule_time');
                  $table->string('schedule_day');
            $table->foreignId('subject_id')->constrained();
            $table->foreignId('faculty_id')->constrained('faculty');
            $table->foreignId('classroom_id')->constrained();
            $table->foreignId('school_year_id')->constrained('school_year');
            $table->foreignId('semesters_id')->constrained();
            $table->foreignId('sections_id')->constrained('sections');
         
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
