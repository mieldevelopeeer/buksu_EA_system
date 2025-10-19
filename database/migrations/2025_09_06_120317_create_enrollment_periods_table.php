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
        Schema::create('enrollment_periods', function (Blueprint $table) {
            $table->id();
    $table->date('start_date')->nullable();
    $table->date('end_date')->nullable();
    $table->enum('status', ['Open','Closed'])->default('Open');
;
   
    
    $table->foreignId('school_year_id')
          ->constrained('school_year')
          ->onDelete('cascade');
     $table->foreignId('semesters_id')
          ->constrained('semesters')
          ->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enrollment_periods');
    }
};
