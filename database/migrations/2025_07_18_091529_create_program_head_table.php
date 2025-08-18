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
        Schema::create('program_head', function (Blueprint $table) {
            $table->id();
            $table->string('id_number')->unique();
            $table->string('contact_no');
             $table->string('suffix')->nullable();
            $table->foreignId('users_id')
                  ->constrained('users')    
                  ->onDelete('cascade');
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
        Schema::dropIfExists('program_head');
        
    }
};
