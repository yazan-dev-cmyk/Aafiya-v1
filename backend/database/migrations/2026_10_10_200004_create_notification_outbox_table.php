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
        Schema::create('notification_outbox', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // Condition A1: nullOnDelete to preserve audit dispatch trail if appointment is purged
            $table->foreignUuid('appointment_id')
                ->nullable()
                ->constrained('appointments')
                ->nullOnDelete();
            $table->string('recipient_phone', 50);
            $table->string('recipient_type', 30)->default('patient');
            $table->string('channel', 20)->default('in_app');
            $table->string('template', 50);
            $table->json('payload');
            // Idempotency rule: reschedule_notice_{template_key}_{appointment_id}_{target_date}_{target_slot}
            $table->string('idempotency_key', 191)->unique();
            $table->string('status', 20)->default('pending');
            $table->unsignedTinyInteger('retry_count')->default(0);
            $table->text('last_error')->nullable();
            // DEC-GAP-04: acknowledged_at represents recipient in-app acknowledgment/read, NOT carrier SMS DLR delivery
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at'], 'idx_outbox_status_created');
            $table->index('appointment_id', 'idx_outbox_appt');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_outbox');
    }
};
