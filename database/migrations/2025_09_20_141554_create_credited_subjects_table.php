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
        Schema::create('credited_subjects', function (Blueprint $table) {
            $table->id();

            // ✅ The student who owns the credited record
            $table->foreignId('student_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            // ✅ The subject in the *current curriculum* that is being credited
            $table->foreignId('curriculum_subject_id')
                  ->constrained('curriculum_subject')
                  ->onDelete('cascade');

            // ✅ The equivalent subject (from old course or school)
            $table->foreignId('equivalent_subject_id')
                  ->nullable()
                  ->constrained('subjects')
                  ->onDelete('set null');

            // ✅ Number of units credited
            $table->integer('credited_units')->default(0);

            // ✅ Optional grade if applicable
            $table->string('grade')->nullable();

            // ✅ Remarks (e.g., "Credited from BSIT 2023 curriculum")
            $table->string('remarks')->nullable()->comment('Reason or basis of crediting');

            // ✅ Reference to who approved the credit (registrar or program head)
            $table->foreignId('approved_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');

            // ✅ Date of crediting
            $table->date('credited_date')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('credited_subjects');
    }
};
