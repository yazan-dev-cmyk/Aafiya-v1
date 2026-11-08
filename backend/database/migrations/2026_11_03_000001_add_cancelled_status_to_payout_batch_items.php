<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE assistant_payout_batch_items MODIFY COLUMN status ENUM('pending', 'paid', 'failed', 'cancelled') NOT NULL DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE assistant_payout_batch_items MODIFY COLUMN status ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'pending'");
    }
};
