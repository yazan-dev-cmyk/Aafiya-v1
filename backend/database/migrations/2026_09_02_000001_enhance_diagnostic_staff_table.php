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
        Schema::table('diagnostic_staff', function (Blueprint $table) {
            $table->softDeletes();
            $table->json('permissions_json')->nullable()->after('role_type');
            $table->index('diagnostic_center_id');
            $table->dropUnique('diagnostic_staff_diagnostic_center_id_user_id_unique');
            $table->unique('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('diagnostic_staff', function (Blueprint $table) {
            $table->dropUnique(['user_id']);
            $table->unique(['diagnostic_center_id', 'user_id']);
            $table->dropIndex(['diagnostic_center_id']);
            $table->dropColumn('permissions_json');
            $table->dropSoftDeletes();
        });
    }
};
