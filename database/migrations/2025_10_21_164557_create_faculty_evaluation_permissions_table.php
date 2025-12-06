<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('faculty_evaluation_permissions', function (Blueprint $table) {
            $table->id();
            
            // The faculty who is granted evaluation access
            $table->unsignedBigInteger('faculty_id');
            $table->foreign('faculty_id')->references('id')->on('users')->onDelete('cascade');

            // Optional: limit by course or major
            $table->unsignedBigInteger('course_id')->nullable();
            $table->foreign('course_id')->references('id')->on('courses')->onDelete('set null');

            $table->unsignedBigInteger('major_id')->nullable();
            $table->foreign('major_id')->references('id')->on('majors')->onDelete('set null');

            // Permission flags
            $table->boolean('is_active')->default(true);
            $table->boolean('can_print_cor')->default(false);

            // When permission expires (optional)
            $table->date('granted_until')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('faculty_evaluation_permissions');
    }
};
