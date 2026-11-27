<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations. See docs/features/branch-management/erd.md.
     */
    public function up(): void
    {
        Schema::create('membership_branch_access', function (Blueprint $table) {
            $table->foreignId('company_id');
            $table->foreignId('membership_id');
            $table->foreignId('branch_id');
            $table->foreignId('granted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->primary(['membership_id', 'branch_id']);
            $table->index(['company_id', 'branch_id']);

            // Both keys share company_id, so a row can never link a membership and a branch from
            // different companies (BM-8, WH-6), whatever the application does.
            $table->foreign(['company_id', 'membership_id'])->references(['company_id', 'id'])->on('company_memberships')->cascadeOnDelete();
            $table->foreign(['company_id', 'branch_id'])->references(['company_id', 'id'])->on('branches')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('membership_branch_access');
    }
};
