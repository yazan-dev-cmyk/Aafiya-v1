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
        Schema::create('advertisement_placements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('advertisement_id')->constrained('advertisements')->cascadeOnDelete();
            $table->string('destination', 50);
            $table->string('audience', 50);
            $table->timestamps();

            $table->unique(['advertisement_id', 'destination', 'audience'], 'uniq_ad_dest_audience');
            $table->index(['destination', 'audience', 'advertisement_id'], 'idx_dest_audience_lookup');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('advertisement_placements');
    }
};
