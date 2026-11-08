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
        Schema::table('assistant_rewards', function (Blueprint $table) {
            $table->uuid('rate_schedule_id')->nullable()->after('amount')->index();

            $table->foreign('rate_schedule_id')
                ->references('id')
                ->on('assistant_reward_rate_schedules')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assistant_rewards', function (Blueprint $table) {
            $table->dropForeign(['rate_schedule_id']);
            $table->dropColumn('rate_schedule_id');
        });
    }
};