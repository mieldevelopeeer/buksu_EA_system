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
        Schema::create('grades', function (Blueprint $table) {
            $table->id();

            // 🔗 Enrollment (student + semester + year + course)
            $table->foreignId('enrollment_id')
                ->constrained('enrollments')
                ->onDelete('cascade');

            // 🔗 Specific subject (class schedule)
            $table->foreignId('class_schedule_id')
                ->constrained('class_schedules')
                ->onDelete('cascade');

            // 🔗 Faculty who encoded the grade
            $table->foreignId('faculty_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // 🧮 Grades
            $table->decimal('midterm', 5, 2)->nullable();
            $table->decimal('final', 5, 2)->nullable();

            // 🏷️ Individual workflow statuses
            $table->enum('midterm_status', ['draft', 'submitted', 'confirmed'])
                  ->default('draft');
            $table->enum('final_status', ['draft', 'submitted', 'confirmed'])
                  ->default('draft');

            // 🗒️ Remarks (overall, optional)
            $table->enum('remarks', ['Passed', 'Failed', 'Incomplete', 'Dropped'])->nullable();

            // 🧾 Registrar confirmation
            $table->foreignId('confirmed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('confirmed_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grades');
    }
};
