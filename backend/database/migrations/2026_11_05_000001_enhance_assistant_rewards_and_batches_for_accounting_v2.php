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
        // 1. Enhance assistant_rewards
        Schema::table('assistant_rewards', function (Blueprint $table) {
            if (!Schema::hasColumn('assistant_rewards', 'confirmed_at')) {
                $table->timestamp('confirmed_at')->nullable()->after('amount')->index();
            }
            if (!Schema::hasColumn('assistant_rewards', 'earning_period')) {
                $table->string('earning_period', 7)->nullable()->after('confirmed_at')->index();
            }
            if (!Schema::hasColumn('assistant_rewards', 'paid_amount_dzd')) {
                $table->decimal('paid_amount_dzd', 12, 2)->default(0.00)->after('settlement_status');
            }
            if (!Schema::hasColumn('assistant_rewards', 'offset_amount_dzd')) {
                $table->decimal('offset_amount_dzd', 12, 2)->default(0.00)->after('paid_amount_dzd');
            }
        });

        // Modify settlement_status enum to accommodate batched, settled_paid, settled_offset, settled_partial, deferred
        DB::statement("ALTER TABLE assistant_rewards MODIFY COLUMN settlement_status ENUM('pending', 'batched', 'settled', 'settled_paid', 'settled_offset', 'settled_partial', 'deferred', 'voided', 'relieved') NOT NULL DEFAULT 'pending'");

        // 2. Enhance assistant_payout_batches
        Schema::table('assistant_payout_batches', function (Blueprint $table) {
            if (!Schema::hasColumn('assistant_payout_batches', 'applied_threshold_dzd')) {
                $table->decimal('applied_threshold_dzd', 12, 2)->default(5000.00)->after('status');
            }
            if (!Schema::hasColumn('assistant_payout_batches', 'payout_cycle')) {
                $table->string('payout_cycle', 7)->nullable()->after('applied_threshold_dzd')->index();
            }
        });

        // 3. Enhance assistant_payout_batch_items
        Schema::table('assistant_payout_batch_items', function (Blueprint $table) {
            if (!Schema::hasColumn('assistant_payout_batch_items', 'gross_amount')) {
                $table->decimal('gross_amount', 12, 2)->default(0.00)->after('amount');
            }
            if (!Schema::hasColumn('assistant_payout_batch_items', 'debt_offset_amount')) {
                $table->decimal('debt_offset_amount', 12, 2)->default(0.00)->after('gross_amount');
            }
            if (!Schema::hasColumn('assistant_payout_batch_items', 'net_amount')) {
                $table->decimal('net_amount', 12, 2)->default(0.00)->after('debt_offset_amount');
            }
            if (!Schema::hasColumn('assistant_payout_batch_items', 'settlement_category')) {
                $table->enum('settlement_category', [
                    'completed',
                    'partially_settled',
                    'unsettled_deferred',
                    'unsettled_rejected',
                    'unsettled_mixed',
                    'cancelled'
                ])->default('completed')->after('status');
            }
        });

        // Modify status on assistant_payout_batch_items to include deferred, rejected
        DB::statement("ALTER TABLE assistant_payout_batch_items MODIFY COLUMN status ENUM('pending', 'paid', 'failed', 'deferred', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending'");

        // Modify transaction_type on assistant_reward_transactions to include payout_transfer_reversal (DEC-08)
        DB::statement("ALTER TABLE assistant_reward_transactions MODIFY COLUMN transaction_type ENUM('reward_earned', 'cancellation_deduction', 'payout_settlement', 'departure_deficit_relief', 'correction_credit', 'correction_debit', 'payout_transfer_reversal') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Safe status remapping prior to enum contraction (LOW-01)
        DB::statement("UPDATE assistant_payout_batch_items SET status = 'failed' WHERE status IN ('deferred', 'rejected', 'partially_returned', 'fully_returned')");

        Schema::table('assistant_payout_batch_items', function (Blueprint $table) {
            $table->dropColumn(['gross_amount', 'debt_offset_amount', 'net_amount', 'settlement_category']);
        });

        DB::statement("ALTER TABLE assistant_payout_batch_items MODIFY COLUMN status ENUM('pending', 'paid', 'failed', 'cancelled') NOT NULL DEFAULT 'pending'");

        Schema::table('assistant_payout_batches', function (Blueprint $table) {
            $table->dropColumn(['applied_threshold_dzd', 'payout_cycle']);
        });

        // Safe settlement_status remapping prior to enum contraction (LOW-01)
        DB::statement("UPDATE assistant_rewards SET settlement_status = 'settled' WHERE settlement_status IN ('settled_paid', 'settled_offset', 'settled_partial')");
        DB::statement("UPDATE assistant_rewards SET settlement_status = 'pending' WHERE settlement_status IN ('batched', 'deferred')");

        DB::statement("ALTER TABLE assistant_rewards MODIFY COLUMN settlement_status ENUM('pending', 'settled', 'voided', 'relieved') NOT NULL DEFAULT 'pending'");

        Schema::table('assistant_rewards', function (Blueprint $table) {
            $table->dropColumn(['confirmed_at', 'earning_period', 'paid_amount_dzd', 'offset_amount_dzd']);
        });
    }
};

