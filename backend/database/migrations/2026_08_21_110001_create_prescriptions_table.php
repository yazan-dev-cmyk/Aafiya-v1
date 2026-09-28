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
        Schema::create('prescriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('prescription_reference')->unique(); // RX-YYYY-XXXX
            $table->string('secure_token', 64)->unique(); // Opaque QR verification token
            $table->foreignUuid('patient_id')->constrained('patients')->restrictOnDelete();
            $table->foreignUuid('doctor_id')->constrained('doctors')->restrictOnDelete();
            $table->foreignUuid('clinic_id')->constrained('clinics')->restrictOnDelete();
            $table->foreignUuid('clinical_visit_id')->nullable()->constrained('clinical_visits')->nullOnDelete();
            
            $table->date('issue_date')->index();
            $table->date('expiry_date')->index();
            $table->string('status')->default('active')->index(); // draft, active, expired, voided
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['patient_id', 'issue_date']);
            $table->index(['doctor_id', 'issue_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prescriptions');
    }
};
