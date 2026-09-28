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
        Schema::create('diagnostic_staff', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('diagnostic_center_id')->constrained('diagnostic_centers')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role_type')->default('assistant'); // assistant, technician, validator
            $table->boolean('is_active')->default(true);
            $table->foreignUuid('created_by_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['diagnostic_center_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('diagnostic_staff');
    }
};
