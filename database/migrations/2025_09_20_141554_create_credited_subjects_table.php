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
             $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
    $table->foreignId('curriculum_subject_id')->constrained('curriculum_subject')->onDelete('cascade');
    $table->integer('credited_units')->default(0);
    $table->string('remarks')->nullable()->comment('Reason or basis of crediting');
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
