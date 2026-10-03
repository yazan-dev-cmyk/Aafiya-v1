<?php

use App\Services\LegacyWilayaMigrationService;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $service = app(LegacyWilayaMigrationService::class);
        $service->migrate();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $service = app(LegacyWilayaMigrationService::class);
        $service->rollback();
    }
};
