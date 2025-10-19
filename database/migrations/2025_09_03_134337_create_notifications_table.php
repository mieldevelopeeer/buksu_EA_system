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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            
    // Who receives the notification
    $table->foreignId('user_id')
          ->constrained('users')
          ->onDelete('cascade');

    // Type of notification
    $table->string('type')->nullable(); 
    // e.g. "curriculum_update", "faculty_load", "enrollment", "general"

    // Title & Message
    $table->string('title');
    $table->text('message');

    // Optional: link to where the user should go when clicking notification
    $table->string('url')->nullable();

    // Status
    $table->boolean('is_read')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifacations');
    }
};
