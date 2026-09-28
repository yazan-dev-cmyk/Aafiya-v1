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
        Schema::create('laboratory_samples', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('diagnostic_order_id')->constrained('diagnostic_orders')->cascadeOnDelete();
            $table->string('sample_barcode')->unique(); // SMP-YYYY-XXXX
            $table->string('sample_type'); // blood, urine, tissue, swab, csf
            $table->dateTime('collected_at')->nullable();
            $table->foreignUuid('collected_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('received_at')->nullable();
            $table->foreignUuid('received_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('pending_collection')->index(); // pending_collection, collected, received, rejected, processed
            $table->string('rejection_reason')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('laboratory_samples');
    }
};
