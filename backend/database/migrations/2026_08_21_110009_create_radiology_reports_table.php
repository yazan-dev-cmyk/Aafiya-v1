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
        Schema::create('radiology_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('diagnostic_order_id')->constrained('diagnostic_orders')->cascadeOnDelete();
            $table->string('modality'); // X-Ray, CT, MRI, Ultrasound, Mammography
            $table->string('study_instance_uid')->nullable();
            $table->json('image_urls_json')->nullable();
            $table->text('findings')->nullable();
            $table->text('impression')->nullable();
            $table->text('recommendations')->nullable();
            $table->string('status')->default('draft')->index(); // draft, preliminary, finalized
            $table->foreignUuid('reported_by_id')->nullable()->constrained('users')->nullOnDelete(); // Radiologist Doctor/Manager
            $table->dateTime('reported_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('radiology_reports');
    }
};
