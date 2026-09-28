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
        Schema::create('diagnostic_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('order_reference')->unique(); // ORD-YYYY-XXXX
            $table->foreignUuid('patient_id')->constrained('patients')->restrictOnDelete();
            $table->foreignUuid('doctor_id')->constrained('doctors')->restrictOnDelete();
            $table->foreignUuid('clinic_id')->constrained('clinics')->restrictOnDelete();
            $table->foreignUuid('clinical_visit_id')->nullable()->constrained('clinical_visits')->nullOnDelete();
            $table->foreignUuid('diagnostic_center_id')->nullable()->constrained('diagnostic_centers')->nullOnDelete();
            
            $table->string('order_type')->default('laboratory'); // laboratory, radiology
            $table->text('clinical_indication')->nullable();
            $table->string('priority')->default('routine'); // routine, urgent, stat
            $table->string('status')->default('created')->index(); // created, received, processing, resulted, finalized, cancelled
            $table->dateTime('ordered_at');

            $table->timestamps();
            $table->softDeletes();

            $table->index(['patient_id', 'ordered_at']);
            $table->index(['diagnostic_center_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('diagnostic_orders');
    }
};
