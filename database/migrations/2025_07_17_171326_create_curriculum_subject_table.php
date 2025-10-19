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
       Schema::create('curriculum_subject', function (Blueprint $table) {
    $table->id();
    $table->Integer('lec_unit');
    $table->integer('lab_unit')->default(0);
    $table->foreignId('semesters_id')->constrained('semesters')->onDelete('cascade');
    $table->foreignId('year_level_id')->constrained('year_levels')->onUpdate('cascade');
    $table->foreignId('curricula_id')->constrained('curricula')->onDelete('cascade');
    $table->foreignId('subject_id')->constrained()->onDelete('cascade');
    $table->enum('type', ['Old', 'New'])->default('Old');
    $table->timestamps();
});

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('curriculum_subject');
    }
};
