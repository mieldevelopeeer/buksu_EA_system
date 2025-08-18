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
    $table->foreignId('enrollment_id')->constrained()->onDelete('cascade');
    $table->foreignId('subject_id')->constrained()->onDelete('cascade');
    $table->decimal('grade', 5, 2)->nullable(); // nullable until submitted
    $table->enum('status', ['draft', 'submitted', 'confirmed'])->default('draft');
    // Registrar confirmation tracking
    $table->foreignId('confirmed_by')->nullable()->constrained('users')->onDelete('set null');
    $table->timestamp('confirmed_at')->nullable();

    $table->timestamps();
});

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('grades');
    }
};
