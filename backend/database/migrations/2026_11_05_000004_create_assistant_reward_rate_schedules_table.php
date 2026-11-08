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
        Schema::create('assistant_reward_rate_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->decimal('rate_amount', 12, 2)->unsigned();
            $table->char('currency', 3)->default('DZD');
            $table->dateTime('effective_from');
            $table->enum('status', ['scheduled', 'active', 'superseded', 'cancelled'])->default('scheduled');
            $table->string('decision_reference', 100)->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by_id');
            $table->uuid('cancelled_by_id')->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();

            $table->foreign('created_by_id')
                ->references('id')
                ->on('users')
                ->onDelete('restrict');

            $table->foreign('cancelled_by_id')
                ->references('id')
                ->on('users')
                ->onDelete('restrict');

            $table->index(['effective_from', 'status'], 'idx_arrs_effective_status');
            $table->index('status', 'idx_arrs_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assistant_reward_rate_schedules');
    }
};