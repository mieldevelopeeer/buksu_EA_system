    <?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enrollment_periods', function (Blueprint $table) {
            if (!Schema::hasColumn('enrollment_periods', 'drop_window_days')) {
                $table->unsignedInteger('drop_window_days')->default(2)->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('enrollment_periods', function (Blueprint $table) {
            if (Schema::hasColumn('enrollment_periods', 'drop_window_days')) {
                $table->dropColumn('drop_window_days');
            }
        });
    }
};
