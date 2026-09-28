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
        Schema::create('doctors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('specialty');
            $table->string('license_number')->unique();
            $table->text('bio')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        // Add foreign key constraint to clinics table
        Schema::table('clinics', function (Blueprint $table) {
            $table->foreign('director_doctor_id')
                ->references('id')
                ->on('doctors')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->dropForeign(['director_doctor_id']);
        });

        Schema::dropIfExists('doctors');
    }
};
