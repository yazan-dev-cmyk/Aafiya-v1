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
        Schema::create('patients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('mrn')->unique(); // MRN-YYYY-XXXX
            $table->string('first_name');
            $table->string('last_name');
            $table->string('gender'); // male, female
            $table->date('date_of_birth');
            $table->string('blood_group', 5)->nullable(); // A+, A-, B+, B-, AB+, AB-, O+, O-, unknown
            $table->string('phone')->index();
            $table->string('email')->nullable();
            $table->string('national_id')->nullable()->unique();
            $table->string('address')->nullable();
            $table->string('wilaya')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
