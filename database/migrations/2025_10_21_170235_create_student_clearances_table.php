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
       Schema::create('student_clearances', function (Blueprint $table) {
    $table->id();
    $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
    $table->boolean('library_clearance')->default(false);
    $table->boolean('accounting_clearance')->default(false);
    $table->boolean('guidance_clearance')->default(false);
    $table->boolean('registrar_clearance')->default(false);
    $table->boolean('dean_clearance')->default(false);
    $table->enum('overall_status', ['pending', 'cleared'])->default('pending');
    $table->timestamps();
});

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_clearances');
    }
};
