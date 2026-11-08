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
        Schema::create('assistant_reward_balances', function (Blueprint $table) {
            $table->uuid('assistant_id')->primary();
            $table->decimal('current_balance', 12, 2)->default(0.00);
            $table->decimal('total_earned', 12, 2)->default(0.00);
            $table->decimal('total_reversed', 12, 2)->default(0.00);
            $table->decimal('total_deducted', 12, 2)->default(0.00);
            $table->decimal('total_paid', 12, 2)->default(0.00);
            $table->decimal('total_relieved', 12, 2)->default(0.00);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->foreign('assistant_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
        });

        Schema::create('assistant_reward_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('assistant_id')->index();
            $table->enum('transaction_type', [
                'reward_earned',
                'cancellation_deduction',
                'payout_settlement',
                'departure_deficit_relief',
                'correction_credit',
                'correction_debit',
            ]);
            $table->enum('direction', ['credit', 'debit']);
            $table->decimal('amount', 12, 2);
            $table->decimal('balance_before', 12, 2);
            $table->decimal('balance_after', 12, 2);
            $table->string('reference_type', 100);
            $table->string('reference_id', 100);
            $table->string('idempotency_key', 191)->unique();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('assistant_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('created_by')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->index(['reference_type', 'reference_id']);
        });

        Schema::create('platform_operational_losses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('assistant_id')->index();
            $table->uuid('appointment_id')->nullable()->index();
            $table->enum('loss_category', [
                'departure_deficit_absorption',
                'post_departure_cancellation',
                'post_departure_pre_payout_cancellation',
            ]);
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('DZD');
            $table->text('reason');
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('assistant_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('appointment_id')
                ->references('id')
                ->on('appointments')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('platform_operational_losses');
        Schema::dropIfExists('assistant_reward_transactions');
        Schema::dropIfExists('assistant_reward_balances');
    }
};