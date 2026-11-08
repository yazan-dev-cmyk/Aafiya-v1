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
        Schema::create('assistant_unabsorbed_debts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('assistant_id')->index();
            $table->uuid('transaction_id')->index();
            $table->decimal('initial_debt_dzd', 12, 2);
            $table->decimal('settled_offset_dzd', 12, 2)->default(0.00);
            $table->decimal('remaining_debt_dzd', 12, 2);
            $table->enum('debt_status', ['open', 'partially_settled', 'fully_settled', 'written_off'])->default('open');
            $table->string('genesis_reason', 255);
            $table->timestamps();

            $table->foreign('assistant_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('transaction_id')
                ->references('id')
                ->on('assistant_reward_transactions')
                ->onDelete('cascade');

            $table->index(['assistant_id', 'debt_status', 'created_at'], 'idx_asst_debt_status_created');
        });

        Schema::create('assistant_reward_allocations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('reward_id')->index();
            $table->uuid('batch_item_id')->nullable()->index();
            $table->uuid('debt_id')->nullable()->index();
            $table->uuid('debt_transaction_id')->nullable()->index();
            $table->enum('allocation_type', [
                'cash_wire',
                'debt_offset',
                'reversal_clawback',
                'platform_loss_absorption',
                'void_adjudication'
            ]);
            $table->decimal('amount', 12, 2);
            $table->string('idempotency_key', 191)->unique();
            $table->uuid('actor_id')->nullable();
            $table->string('system_actor', 100)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('reward_id')
                ->references('id')
                ->on('assistant_rewards')
                ->onDelete('cascade');

            $table->foreign('batch_item_id')
                ->references('id')
                ->on('assistant_payout_batch_items')
                ->onDelete('set null');

            $table->foreign('debt_id')
                ->references('id')
                ->on('assistant_unabsorbed_debts')
                ->onDelete('set null');

            $table->foreign('debt_transaction_id')
                ->references('id')
                ->on('assistant_reward_transactions')
                ->onDelete('set null');

            $table->foreign('actor_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->index(['reward_id', 'allocation_type'], 'idx_alloc_reward_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assistant_reward_allocations');
        Schema::dropIfExists('assistant_unabsorbed_debts');
    }
};
