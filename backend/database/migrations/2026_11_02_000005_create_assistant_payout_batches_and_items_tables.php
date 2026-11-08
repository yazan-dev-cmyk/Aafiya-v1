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
        Schema::create('assistant_payout_batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('batch_number', 50)->unique();
            $table->date('period_start');
            $table->date('period_end');
            $table->enum('status', ['pending', 'approved', 'processing', 'completed', 'cancelled'])->default('pending');
            $table->unsignedInteger('total_recipients')->default(0);
            $table->decimal('total_amount', 14, 2)->default(0.00);
            $table->uuid('generated_by_id')->nullable();
            $table->uuid('confirmed_by_id')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->foreign('generated_by_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->foreign('confirmed_by_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
        });

        Schema::create('assistant_payout_batch_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('batch_id')->index();
            $table->uuid('assistant_id')->index();
            $table->uuid('payout_profile_id');
            $table->decimal('amount', 12, 2);
            $table->enum('status', ['pending', 'paid', 'failed'])->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->string('transfer_reference', 100)->nullable();
            $table->timestamp('transferred_at')->nullable();
            $table->timestamps();

            $table->foreign('batch_id')
                ->references('id')
                ->on('assistant_payout_batches')
                ->onDelete('cascade');

            $table->foreign('assistant_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('payout_profile_id')
                ->references('id')
                ->on('assistant_payout_profiles')
                ->onDelete('restrict');

            $table->unique(['batch_id', 'assistant_id'], 'uq_batch_item_assistant');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assistant_payout_batch_items');
        Schema::dropIfExists('assistant_payout_batches');
    }
};