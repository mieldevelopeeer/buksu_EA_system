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
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->string('id_number')->unique();
              $table->enum('gender', ['Male', 'Female', 'Other']);
            $table->string('address');
            $table->date('bod');
            $table->foreignId('users_id')->constrainde()->onDelete('cascade');
            $table->foreignId('year_sections_id')->constrained()->onDelete('cascade');
            $table->foreignId('departments_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
