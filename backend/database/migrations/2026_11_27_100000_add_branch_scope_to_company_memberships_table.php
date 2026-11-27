<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations. See docs/features/branch-management/erd.md.
     */
    public function up(): void
    {
        Schema::table('company_memberships', function (Blueprint $table) {
            // `all`: every branch, including later ones; `selected`: only the rows in
            // membership_branch_access (BM-3). Owners have implicit access regardless (BR-3).
            $table->string('branch_scope', 16)->default('selected')->after('status');

            // Target for the composite foreign key from membership_branch_access (tenancy.md).
            $table->unique(['company_id', 'id']);
        });

        // Owners and Admins start with every branch (BM-4); everyone else starts with none.
        DB::table('company_memberships')->whereIn('role', ['owner', 'admin'])->update(['branch_scope' => 'all']);

        DB::statement("ALTER TABLE company_memberships ADD CONSTRAINT company_memberships_branch_scope_check CHECK (branch_scope IN ('all', 'selected'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE company_memberships DROP CONSTRAINT company_memberships_branch_scope_check');

        Schema::table('company_memberships', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'id']);
            $table->dropColumn('branch_scope');
        });
    }
};
