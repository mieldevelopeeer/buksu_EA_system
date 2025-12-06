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
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            
            // 🔹 User who performed the action
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            
            // 🔹 General context of the action (table or module)
            $table->string('action')->comment('Action performed: create, update, delete, approve, etc.');
            $table->string('module')->nullable()->comment('Module or table affected, e.g., enrollments, grades');
            
            // 🔹 Record details
            $table->unsignedBigInteger('record_id')->nullable()->comment('Primary ID of the affected record');
            $table->json('changes')->nullable()->comment('JSON of before/after values if applicable');
            
            // 🔹 Metadata
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('performed_at')->useCurrent();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
