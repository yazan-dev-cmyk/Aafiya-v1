<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for AAFIYA Secure Asynchronous Database Backup Export.
     */
    public function up(): void
    {
        Schema::create('backup_exports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('session_id', 255)->index();
            $table->string('status', 32)->default('pending')->index(); // pending, processing, completed, failed, expired
            $table->string('filename', 255)->nullable();
            $table->string('file_path', 512)->nullable();
            $table->string('meta_file_path', 512)->nullable();
            $table->unsignedBigInteger('file_size_bytes')->nullable();
            $table->string('sha256_hash', 64)->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamp('downloaded_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('backup_exports');
    }
};
