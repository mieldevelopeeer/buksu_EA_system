<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB; // 👈 add this

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('year_levels', function (Blueprint $table) {
            $table->id();
            $table->enum('year_level', ['First year', 'Second year', 'Third year', 'Fourth year']);
            $table->timestamps();
        });

        // Insert default values
        DB::table('year_levels')->insert([
            ['year_level' => 'First year', 'created_at' => now(), 'updated_at' => now()],
            ['year_level' => 'Second year', 'created_at' => now(), 'updated_at' => now()],
            ['year_level' => 'Third year', 'created_at' => now(), 'updated_at' => now()],
            ['year_level' => 'Fourth year', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Fix table name here (plural)
        Schema::dropIfExists('year_levels');
    }
};
