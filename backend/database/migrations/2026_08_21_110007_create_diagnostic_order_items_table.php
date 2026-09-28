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
        Schema::create('diagnostic_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('diagnostic_order_id')->constrained('diagnostic_orders')->cascadeOnDelete();
            $table->string('test_name');
            $table->string('test_code')->nullable();
            $table->string('status')->default('pending')->index(); // pending, collected, processing, resulted, finalized, cancelled
            $table->text('result_value')->nullable();
            $table->string('reference_range')->nullable();
            $table->string('unit')->nullable();
            $table->string('interpretation')->nullable(); // normal, abnormal, critical
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('diagnostic_order_items');
    }
};
