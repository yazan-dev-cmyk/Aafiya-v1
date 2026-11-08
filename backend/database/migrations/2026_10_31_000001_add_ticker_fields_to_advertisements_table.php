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
        Schema::table('advertisements', function (Blueprint $table) {
            $table->unsignedBigInteger('ticker_clicks_count')->default(0)->after('clicks_count');
            $table->dateTime('starts_at')->nullable()->after('start_date');
            $table->dateTime('ends_at')->nullable()->after('end_date');
            $table->integer('priority')->default(0)->after('is_welcome_offer');

            $table->index(['status', 'priority', 'starts_at', 'ends_at'], 'idx_ads_ticker_eligibility');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('advertisements', function (Blueprint $table) {
            $table->dropIndex('idx_ads_ticker_eligibility');
            $table->dropColumn([
                'ticker_clicks_count',
                'starts_at',
                'ends_at',
                'priority',
            ]);
        });
    }
};
