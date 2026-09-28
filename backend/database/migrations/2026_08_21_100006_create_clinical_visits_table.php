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
        Schema::create('clinical_visits', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('visit_reference')->unique(); // VIS-YYYY-XXXX
            $table->foreignUuid('patient_id')->constrained('patients')->restrictOnDelete();
            $table->foreignUuid('doctor_id')->constrained('doctors')->restrictOnDelete();
            $table->foreignUuid('clinic_id')->constrained('clinics')->restrictOnDelete();
            $table->foreignUuid('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            
            $table->date('visit_date')->index();
            $table->text('chief_complaint');
            $table->json('vital_signs_json')->nullable();
            $table->text('physical_examination')->nullable();
            $table->text('diagnosis')->nullable();
            $table->text('clinical_notes')->nullable();
            
            $table->string('status')->default('draft')->index(); // draft, finalized
            $table->timestamp('finalized_at')->nullable();
            $table->foreignUuid('finalized_by_id')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['patient_id', 'visit_date']);
            $table->index(['doctor_id', 'visit_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinical_visits');
    }
};
