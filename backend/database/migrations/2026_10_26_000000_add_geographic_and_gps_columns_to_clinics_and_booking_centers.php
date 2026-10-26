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
            $table->foreignId('commune_id')
                ->nullable()
                ->after('wilaya_id')
                ->constrained('communes')
                ->nullOnDelete();
            $table->decimal('latitude', 10, 8)->nullable()->after('commune_id');
            $table->decimal('longitude', 11, 8)->nullable()->after('latitude');
            $table->string('google_maps_link', 500)->nullable()->after('longitude');

            $table->index(['wilaya_id', 'commune_id']);
            $table->index(['latitude', 'longitude']);
        });

        Schema::table('booking_centers', function (Blueprint $table) {
            $table->foreignId('commune_id')
                ->nullable()
                ->after('wilaya_id')
                ->constrained('communes')
                ->nullOnDelete();
            $table->decimal('latitude', 10, 8)->nullable()->after('commune_id');
            $table->decimal('longitude', 11, 8)->nullable()->after('latitude');
            $table->string('google_maps_link', 500)->nullable()->after('longitude');

            $table->index(['wilaya_id', 'commune_id']);
            $table->index(['latitude', 'longitude']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('booking_centers', function (Blueprint $table) {
            $table->dropIndex(['latitude', 'longitude']);
            $table->dropIndex(['wilaya_id', 'commune_id']);
            $table->dropColumn(['latitude', 'longitude', 'google_maps_link']);
            $table->dropConstrainedForeignId('commune_id');
        });

        Schema::table('clinics', function (Blueprint $table) {
            $table->dropIndex(['latitude', 'longitude']);
            $table->dropIndex(['wilaya_id', 'commune_id']);
            $table->dropColumn(['latitude', 'longitude', 'google_maps_link']);
            $table->dropConstrainedForeignId('commune_id');
        });
    }
};
