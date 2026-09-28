<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('secure_token', 64)->nullable()->unique()->after('booking_reference');
            $table->timestamp('checked_in_at')->nullable()->after('status');
            $table->foreignUuid('checked_in_by_id')->nullable()->constrained('users')->nullOnDelete()->after('checked_in_at');
        });

        // Safe Backfill: Generate unique 64-char cryptographic tokens for any pre-existing appointments
        $appointments = DB::table('appointments')->whereNull('secure_token')->get(['id']);
        foreach ($appointments as $apt) {
            DB::table('appointments')->where('id', $apt->id)->update([
                'secure_token' => Str::random(64),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['checked_in_by_id']);
            $table->dropColumn(['secure_token', 'checked_in_at', 'checked_in_by_id']);
        });
    }
};
