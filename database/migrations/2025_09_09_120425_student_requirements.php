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
        Schema::create('student_requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('requirement_id')->constrained('requirements')->onDelete('cascade');
            $table->boolean('is_submitted')->default(false);
            $table->date('submitted_at')->nullable();
            $table->string('image')->nullable(); // uploaded file path
            $table->timestamps();

            // prevent duplicate entries (1 requirement per student)
            $table->unique(['student_id', 'requirement_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_requirements');
    }
};
