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
        Schema::create('student_transfers', function (Blueprint $table) {
            $table->id();

            // --- Student reference ---
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // --- Department movement ---
            $table->foreignId('from_department_id')
                ->nullable()
                ->constrained('departments')
                ->nullOnDelete();

            $table->foreignId('to_department_id')
                ->nullable()
                ->constrained('departments')
                ->nullOnDelete();

            // --- Type of transfer ---
            $table->enum('transfer_type', ['Internal', 'External'])->default('Internal');
            // Internal = shifting within the university
            // External = transferee from other school

            // --- Academic info for external transferees ---
            $table->string('previous_school_name')->nullable();
            $table->string('previous_course')->nullable();
            $table->string('new_course')->nullable();

            // --- Transfer reason and remarks ---
            $table->text('reason')->nullable();
            $table->text('remarks')->nullable();

            // --- Transfer process workflow ---
            $table->enum('status', ['Pending', 'Approved', 'Completed', 'Cancelled'])->default('Pending');

            // The Program Head / Registrar who processed or approved
            $table->foreignId('processed_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('approved_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_transfers');
    }
};
