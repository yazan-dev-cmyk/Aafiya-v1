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
        $existingIndexes = array_column(Schema::getIndexes('clinic_assistants'), 'name');

        Schema::table('clinic_assistants', function (Blueprint $table) use ($existingIndexes) {
            if (!in_array('clinic_assistants_user_id_index', $existingIndexes)) {
                $table->index('user_id', 'clinic_assistants_user_id_index');
            }

            if (in_array('clinic_assistants_user_id_clinic_id_unique', $existingIndexes)) {
                $table->dropUnique('clinic_assistants_user_id_clinic_id_unique');
            }

            if (!Schema::hasColumn('clinic_assistants', 'active_membership_user_id')) {
                $table->char('active_membership_user_id', 36)
                    ->nullable()
                    ->virtualAs('IF(deleted_at IS NULL, user_id, NULL)');
                $table->unique('active_membership_user_id', 'uq_clinic_assistants_single_active');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $existingIndexes = array_column(Schema::getIndexes('clinic_assistants'), 'name');

        Schema::table('clinic_assistants', function (Blueprint $table) use ($existingIndexes) {
            if (in_array('uq_clinic_assistants_single_active', $existingIndexes)) {
                $table->dropUnique('uq_clinic_assistants_single_active');
            }
            if (Schema::hasColumn('clinic_assistants', 'active_membership_user_id')) {
                $table->dropColumn('active_membership_user_id');
            }
            if (!in_array('clinic_assistants_user_id_clinic_id_unique', $existingIndexes)) {
                $table->unique(['user_id', 'clinic_id'], 'clinic_assistants_user_id_clinic_id_unique');
            }
            if (in_array('clinic_assistants_user_id_index', $existingIndexes)) {
                $table->dropIndex('clinic_assistants_user_id_index');
            }
        });
    }
};
