<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations. See docs/features/company-management/erd.md.
     */
    public function up(): void
    {
        Schema::create('company_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->index()->constrained()->cascadeOnDelete();
            $table->string('role', 16);
            $table->string('status', 16)->default('active');
            $table->timestamps();

            $table->unique(['company_id', 'user_id']);
        });

        // At most one owner per company (CM-3); "at least one" holds because ownership only moves.
        DB::statement("CREATE UNIQUE INDEX company_memberships_one_owner ON company_memberships (company_id) WHERE role = 'owner'");
        DB::statement("ALTER TABLE company_memberships ADD CONSTRAINT company_memberships_role_check CHECK (role IN ('owner', 'admin', 'manager', 'cashier'))");
        DB::statement("ALTER TABLE company_memberships ADD CONSTRAINT company_memberships_status_check CHECK (status IN ('active', 'inactive'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company_memberships');
    }
};
