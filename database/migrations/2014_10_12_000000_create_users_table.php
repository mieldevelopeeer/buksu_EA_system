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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
           // Basic name info
            $table->string('fName');
            $table->string('mName')->nullable();
            $table->string('lName');
            $table->string('suffix')->nullable();

            // Identification & contact
            $table->string('id_number')->unique()->nullable();
            $table->string('contact_no')->nullable();
            $table->string('address')->nullable();
            $table->string('profession')->nullable();

            // Personal info
            $table->enum('gender', ['Male','Female','Other'])->default('Other');
            $table->date('date_of_birth')->nullable();
            $table->string('profile_picture')->nullable(); // stores image path or URL
          

            // Authentication
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('username')->unique()->nullable();
            $table->string('password')->nullable();
            $table->string('generated_password')->nullable(); // optional auto-generated password
            $table->rememberToken();

            // Roles
            $table->enum('role', ['faculty', 'program_head', 'admin', 'registrar', 'student'])->default('student');

            // Department (only for program_head/faculty/students)
            $table->foreignId('department_id')
                  ->nullable()
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
        Schema::dropIfExists('users');
    }
};
