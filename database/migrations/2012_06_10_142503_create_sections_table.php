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
        Schema::create('sections', function (Blueprint $table) {
            $table->id();
            $table->String('section');
            $table->integer('student_limit')->default(0);
             $table->boolean('status')->default(true);
            //  $table->foreignId('classroom_id')
            //       ->constrained('classrooms')
            //       ->onDelete('cascade')
            //       ->onUpdate('cascade');
               $table->foreignId('year_level_id')
                  ->constrained('year_levels')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');
                  $table->foreignId('department_id')
                  ->constrained('departments')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sections');
    }
};
