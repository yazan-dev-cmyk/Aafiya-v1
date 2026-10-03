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
        Schema::table('doctors', function (Blueprint $table) {
            $table->foreignId('specialty_id')
                ->nullable()
                ->after('specialty')
                ->constrained('medical_specialties')
                ->onDelete('restrict');

            $table->index('specialty_id', 'idx_doctors_specialty_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->dropForeign(['specialty_id']);
            $table->dropIndex('idx_doctors_specialty_id');
            $table->dropColumn('specialty_id');
        });
    }
};
