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
        Schema::create('assistant_program_lifecycle_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('state', ['active', 'suspended', 'terminated']);
            $table->dateTime('effective_at');
            $table->dateTime('notice_deadline_at')->nullable();
            $table->text('reason');
            $table->string('decision_reference', 100)->nullable();
            $table->uuid('authorized_by_id');
            $table->timestamps();

            $table->foreign('authorized_by_id')
                ->references('id')
                ->on('users')
                ->onDelete('restrict');

            $table->index(['effective_at', 'state'], 'idx_aple_effective_state');
            $table->index('created_at', 'idx_aple_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assistant_program_lifecycle_events');
    }
};