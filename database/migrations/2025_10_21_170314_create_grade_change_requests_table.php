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
        Schema::create('grade_change_requests', function (Blueprint $table) {
    $table->id();
    $table->foreignId('grade_id')->constrained('grades')->onDelete('cascade');
    $table->foreignId('faculty_id')->constrained('users')->onDelete('cascade');
    $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
    $table->decimal('old_grade', 5, 2);
    $table->decimal('new_grade', 5, 2);
    $table->string('reason');
    $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
    $table->timestamps();
});

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('grade_change_requests');
    }
};
