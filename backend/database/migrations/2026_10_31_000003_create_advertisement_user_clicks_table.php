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
        Schema::create('advertisement_user_clicks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('advertisement_id')->constrained('advertisements')->cascadeOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->char('guest_fingerprint', 64)->nullable();
            $table->string('ip_address', 45);
            $table->string('user_agent', 500)->nullable();
            $table->dateTime('clicked_at');
            $table->timestamps();

            $table->index(['advertisement_id', 'user_id', 'clicked_at'], 'idx_auth_click');
            $table->index(['advertisement_id', 'guest_fingerprint', 'clicked_at'], 'idx_guest_click');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('advertisement_user_clicks');
    }
};
