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
        Schema::table('booking_centers', function (Blueprint $table) {
            $table->string('verification_status', 20)->default('pending')->after('quota_balance');
            $table->timestamp('verified_at')->nullable()->after('verification_status');
            $table->foreignUuid('reviewed_by_id')->nullable()->after('verified_at')->constrained('users')->nullOnDelete();
            $table->text('rejection_reason')->nullable()->after('reviewed_by_id');
            $table->unique('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('booking_centers', function (Blueprint $table) {
            $table->dropUnique(['user_id']);
            $table->dropForeign(['reviewed_by_id']);
            $table->dropColumn([
                'verification_status',
                'verified_at',
                'reviewed_by_id',
                'rejection_reason',
            ]);
        });
    }
};
