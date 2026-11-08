<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Extend assistant_payout_batch_items with returned_amount and return_count
        Schema::table('assistant_payout_batch_items', function (Blueprint $table) {
            if (!Schema::hasColumn('assistant_payout_batch_items', 'returned_amount')) {
                $table->decimal('returned_amount', 12, 2)->default(0.00)->after('net_amount');
            }
            if (!Schema::hasColumn('assistant_payout_batch_items', 'return_count')) {
                $table->unsignedInteger('return_count')->default(0)->after('returned_amount');
            }
        });

        // Extend status enum to include partially_returned and fully_returned (R-02 Option A)
        DB::statement("ALTER TABLE assistant_payout_batch_items MODIFY COLUMN status ENUM('pending', 'paid', 'failed', 'deferred', 'rejected', 'cancelled', 'partially_returned', 'fully_returned') NOT NULL DEFAULT 'pending'");

        // 2. Create payout_bounce_incidents table (DEC-08 / R-01 Option A)
        Schema::create('payout_bounce_incidents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('batch_item_id')->index();
            $table->uuid('batch_id')->index();
            $table->uuid('assistant_id')->index();
            $table->uuid('transaction_id')->nullable()->index();
            $table->decimal('returned_amount_dzd', 12, 2);
            $table->string('currency', 3)->default('DZD');
            $table->enum('incident_status', ['reported', 'verified', 'settled', 'dismissed'])->default('settled');
            $table->string('postal_reference', 100);
            $table->string('return_reason', 500);
            $table->string('idempotency_key', 191)->unique();
            $table->char('payload_hash', 64);
            $table->uuid('verified_by_id');
            $table->timestamp('verified_at')->useCurrent();
            $table->timestamps();

            $table->foreign('batch_item_id')
                ->references('id')
                ->on('assistant_payout_batch_items')
                ->onDelete('cascade');

            $table->foreign('batch_id')
                ->references('id')
                ->on('assistant_payout_batches')
                ->onDelete('cascade');

            $table->foreign('assistant_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('transaction_id')
                ->references('id')
                ->on('assistant_reward_transactions')
                ->onDelete('set null');

            $table->foreign('verified_by_id')
                ->references('id')
                ->on('users')
                ->onDelete('restrict');

            $table->unique(['batch_item_id', 'postal_reference'], 'uq_item_postal_ref');
            $table->index(['incident_status', 'created_at'], 'idx_incident_status_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payout_bounce_incidents');

        // Safe remapping before enum contraction (LOW-01)
        DB::statement("UPDATE assistant_payout_batch_items SET status = 'paid' WHERE status IN ('partially_returned', 'fully_returned')");

        DB::statement("ALTER TABLE assistant_payout_batch_items MODIFY COLUMN status ENUM('pending', 'paid', 'failed', 'deferred', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending'");

        Schema::table('assistant_payout_batch_items', function (Blueprint $table) {
            $table->dropColumn(['returned_amount', 'return_count']);
        });
    }
};
