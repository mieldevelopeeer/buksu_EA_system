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
    $table->Integer('lab_unit');
    $table->foreignId('school_year_id')->constrained('school_year')->onDelete('cascade');
      $table->foreignId('year_level_id')->constrained('year_level')->onUpdate('cascade');
    
    $table->foreignId('curricula_id')->constrained('curricula')->onDelete('cascade');
    $table->foreignId('subject_id')->constrained()->onDelete('cascade');
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
