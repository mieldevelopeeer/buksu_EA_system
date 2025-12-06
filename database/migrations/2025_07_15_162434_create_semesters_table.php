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
        Schema::create('semesters', function (Blueprint $table) {
            $table->id();
            $table->String('semester');
            $table->boolean('is_active')->default(false);
           $table->foreignId('school_year_id')
    ->nullable()
    ->constrained('school_year') // singular table name
    ->onDelete('cascade');
      $table->enum('status', ['first_second_only', 'summer_only', 'all'])
              ->default('all')
              ->comment('Specifies which semesters are present for a curriculum year level');

            $table->timestamps();
        });
    }
 
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('semesters');
    }
};  
    