<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enrollments', function (Blueprint $table) {
            $table->id();
                 $table->foreignId('section_id')
                ->constrained('sections')
                ->onDelete('cascade');

                $table->foreignId('year_level_id')
                ->constrained('year_levels')
                ->onDelete('cascade');
            // 🔑 Student reference
            $table->foreignId('student_id')
                ->constrained('users')
                ->onDelete('cascade');

            // 🔑 Academic info
            $table->foreignId('school_year_id')
                ->constrained('school_year')
                ->onDelete('cascade');
            $table->foreignId('semester_id')
                ->constrained('semesters')
                ->onDelete('cascade');

            // Student type & enrollment status
            $table->enum('student_type', [
                'Freshman',
                'Old',
                'Transferee',
                'Returnee',
                'Shiftee',
            ])->default('Freshman');

            $table->enum('status', ['enrolled', 'pending', 'dropped'])
                ->default('pending');

            $table->date('enrolled_at');

            // 🔑 Course & Major
            $table->foreignId('courses_id')
                ->constrained('courses')
                ->cascadeOnDelete();
            $table->foreignId('majors_id')
                ->nullable()
                ->constrained('majors')
                ->nullOnDelete();

            $table->timestamps();
        });

        // Pivot table for subjects/schedules per enrollment
        Schema::create('enrollment_subjects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')
                ->constrained('enrollments')
                ->onDelete('cascade');
            $table->foreignId('class_schedule_id')
                ->constrained('class_schedules')
                ->onDelete('cascade');
            $table->enum('status', ['enrolled', 'dropped'])->default('enrolled');
            $table->timestamp('dropped_at')->nullable();
            $table->foreignId('dropped_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('drop_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollment_subjects');
        Schema::dropIfExists('enrollments');
    }
};
