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
        Schema::create('attendance', function (Blueprint $table) {
             $table->id();

            $table->enum('type', ['class', 'event']);
            $table->date('date');
            $table->timestamp('time_in')->nullable();
            $table->timestamp('time_out')->nullable();
            $table->enum('status', ['present', 'absent', 'late', 'excused']);
            $table->timestamps();
               // Link to the student's enrollment (so you know semester/year)
            $table->foreignId('enrollment_id')
                  ->constrained('enrollments')
                  ->onDelete('cascade');

            // Link to class schedule (specific subject session)
            $table->foreignId('class_schedule_id')
                  ->constrained('class_schedules')
                  ->onDelete('cascade');

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance');
    }
};
