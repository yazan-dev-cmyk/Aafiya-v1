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
        Schema::create('package_purchase_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('request_reference', 50)->unique();
            $table->foreignUuid('booking_center_id')->constrained('booking_centers')->cascadeOnDelete();
            $table->foreignUuid('booking_package_id')->constrained('booking_packages')->restrictOnDelete();
            
            // Historical snapshot of package details at request creation time
            $table->string('package_name');
            $table->string('package_code', 100);
            $table->unsignedInteger('quota_units');
            $table->decimal('price_dzd', 10, 2);
            
            // Payment and proof details (Optional / Nullable)
            $table->string('payment_method', 50)->nullable();
            $table->string('transaction_reference', 100)->nullable();
            $table->string('receipt_document_path', 255)->nullable();
            
            // Workflow lifecycle status
            $table->string('status', 30)->default('pending')->index();
            $table->text('notes')->nullable();
            
            // Reviewer tracking and audit
            $table->foreignUuid('reviewed_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            
            // Direct link to the ledger transaction generated upon approval
            $table->foreignUuid('booking_transaction_id')->nullable()->unique()->constrained('booking_transactions')->nullOnDelete();
            
            // Creator audit tracking
            $table->foreignUuid('created_by_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            // Composite performance indexes
            $table->index(['booking_center_id', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('package_purchase_requests');
    }
};
