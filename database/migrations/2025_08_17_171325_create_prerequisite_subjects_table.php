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
        Schema::create('prerequisite_subjects', function (Blueprint $table) {
            $table->id();
            $table->string('comment')->nullable()->after('prerequisite_subject_id');
      // The subject that requires a prerequisite
            $table->foreignId('curriculum_subject_id')
                  ->constrained('curriculum_subject') // ✅ matches your actual table
                  ->onDelete('cascade');

            // The prerequisite subject
            $table->foreignId('prerequisite_subject_id')
                  ->constrained('curriculum_subject') // ✅ same reference
                  ->onDelete('cascade');

            
    // Prevent duplicate prerequisite assignments (short index name)
    $table->unique(
        ['curriculum_subject_id', 'prerequisite_subject_id'],
        'prereq_subject_unique'
    );
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prerequisite_subjects');
    }
};
