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
        Schema::create('advertisements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('clinic_id')->nullable()->constrained('clinics')->nullOnDelete();
            $table->foreignUuid('doctor_id')->nullable()->constrained('doctors')->nullOnDelete();
            
            $table->string('title');
            $table->text('content');
            $table->string('banner_image_url', 1000)->nullable();
            $table->string('target_url', 1000)->nullable();
            
            $table->string('placement', 50)->default('home_banner')->index(); // home_banner, sidebar, search_top, category_sponsor
            $table->string('target_role', 50)->nullable()->index(); // patient, doctor, all
            $table->string('target_specialty', 100)->nullable()->index();
            $table->string('target_wilaya', 100)->nullable()->index();
            
            $table->boolean('is_welcome_offer')->default(false)->index();
            $table->string('status', 50)->default('pending_approval')->index(); // draft, pending_approval, active, paused, expired, rejected
            $table->string('rejection_reason', 500)->nullable();
            
            $table->date('start_date')->index();
            $table->date('end_date')->index();
            
            $table->unsignedBigInteger('impressions_count')->default(0);
            $table->unsignedBigInteger('clicks_count')->default(0);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'start_date', 'end_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('advertisements');
    }
};
