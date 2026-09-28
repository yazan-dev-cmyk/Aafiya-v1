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
        Schema::create('booking_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('booking_center_id')->constrained('booking_centers')->cascadeOnDelete();
            $table->foreignUuid('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->foreignUuid('booking_package_id')->nullable()->constrained('booking_packages')->nullOnDelete();
            
            $table->string('transaction_type'); // purchase, reservation, confirmation, refund, adjustment
            $table->integer('units'); // +100, -1, +1, etc.
            $table->unsignedInteger('balance_after');
            $table->string('reference_note')->nullable();
            
            $table->foreignUuid('created_by_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['booking_center_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_transactions');
    }
};
