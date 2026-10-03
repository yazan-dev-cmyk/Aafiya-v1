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
        Schema::table('clinics', function (Blueprint $table) {
            $table->foreignId('wilaya_id')->nullable()->after('wilaya')->constrained('wilayas')->nullOnDelete();
        });

        Schema::table('booking_centers', function (Blueprint $table) {
            $table->foreignId('wilaya_id')->nullable()->after('wilaya')->constrained('wilayas')->nullOnDelete();
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->foreignId('wilaya_id')->nullable()->after('wilaya')->constrained('wilayas')->nullOnDelete();
        });

        Schema::table('diagnostic_centers', function (Blueprint $table) {
            $table->foreignId('wilaya_id')->nullable()->after('wilaya')->constrained('wilayas')->nullOnDelete();
        });

        Schema::table('advertisements', function (Blueprint $table) {
            $table->foreignId('target_wilaya_id')->nullable()->after('target_wilaya')->constrained('wilayas')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('advertisements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('target_wilaya_id');
        });

        Schema::table('diagnostic_centers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('wilaya_id');
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->dropConstrainedForeignId('wilaya_id');
        });

        Schema::table('booking_centers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('wilaya_id');
        });

        Schema::table('clinics', function (Blueprint $table) {
            $table->dropConstrainedForeignId('wilaya_id');
        });
    }
};
