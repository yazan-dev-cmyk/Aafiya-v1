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
        Schema::create('assistant_rewards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('appointment_id')->unique();
            $table->uuid('assistant_id')->index();
            $table->uuid('clinic_id')->index();
            $table->uuid('clinic_assistant_id')->index();
            $table->decimal('amount', 12, 2)->default(10.00);
            $table->enum('settlement_status', ['pending', 'settled', 'voided', 'relieved'])->default('pending');
            $table->enum('cancellation_status', ['none', 'reversed', 'deducted', 'absorbed'])->default('none');
            $table->uuid('payout_batch_item_id')->nullable()->index();
            $table->timestamps();

            $table->foreign('appointment_id')
                ->references('id')
                ->on('appointments')
                ->onDelete('cascade');

            $table->foreign('assistant_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('clinic_id')
                ->references('id')
                ->on('clinics')
                ->onDelete('cascade');

            $table->foreign('clinic_assistant_id')
                ->references('id')
                ->on('clinic_assistants')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assistant_rewards');
    }
};