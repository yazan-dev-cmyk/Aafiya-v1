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
        Schema::create('scoped_permission_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->string('scope_type', 50)->index(); // 'clinic', 'diagnostic_center', 'platform'
            $table->string('scope_id', 100)->index(); // clinic UUID, diagnostic_center UUID, or 'global'
            $table->foreignUuid('granted_by_id')->constrained('users');
            $table->boolean('is_active')->default(true)->index();
            $table->foreignUuid('revoked_by_id')->nullable()->constrained('users');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            // Composite indexes for sub-millisecond query evaluation
            $table->index(['user_id', 'scope_type', 'scope_id', 'is_active'], 'idx_user_scope_active');
            $table->index(['permission_id', 'scope_type', 'scope_id'], 'idx_perm_scope');
            $table->index(['user_id', 'permission_id', 'scope_type', 'scope_id'], 'idx_user_perm_scope');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scoped_permission_assignments');
    }
};
