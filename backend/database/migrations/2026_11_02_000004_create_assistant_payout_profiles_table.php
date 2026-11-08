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
        Schema::create('assistant_payout_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('assistant_id')->index();
            $table->unsignedInteger('version')->default(1);
            $table->string('rip_number', 20);
            $table->string('cheque_image_path', 255);
            $table->enum('status', ['pending_verification', 'active', 'rejected', 'superseded'])->default('pending_verification');
            $table->uuid('verified_by_id')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->char('active_profile_assistant_id', 36)
                ->nullable()
                ->virtualAs("IF(status = 'active', assistant_id, NULL)");
            $table->timestamps();

            $table->foreign('assistant_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('verified_by_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->unique(['assistant_id', 'version'], 'uq_assistant_payout_profiles_version');
            $table->unique('active_profile_assistant_id', 'uq_assistant_single_active_rip');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assistant_payout_profiles');
    }
};