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
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('code', 20);
            $table->string('type', 16)->default('store');
            $table->text('address')->nullable();
            $table->string('phone', 30)->nullable();
            // Null inherits the company's timezone (BM-9).
            $table->string('timezone', 64)->nullable();
            $table->string('status', 16)->default('active');
            $table->timestamp('deactivated_at')->nullable();
            $table->text('deactivation_reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            // Microseconds, so optimistic concurrency catches two edits in the same second.
            $table->timestamps(6);

            // Target for composite foreign keys from branch-scoped tables (tenancy.md).
            $table->unique(['company_id', 'id']);
            // Codes are stored uppercase (BR-2), so a plain composite index is case-insensitive.
            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'status']);
        });

        DB::statement('CREATE UNIQUE INDEX branches_company_name_lower_unique ON branches (company_id, lower(name))');
        DB::statement("ALTER TABLE branches ADD CONSTRAINT branches_code_format CHECK (code ~ '^[A-Z0-9][A-Z0-9-]{1,19}$')");
        DB::statement("ALTER TABLE branches ADD CONSTRAINT branches_type_check CHECK (type IN ('store', 'warehouse'))");
        DB::statement("ALTER TABLE branches ADD CONSTRAINT branches_status_check CHECK (status IN ('active', 'inactive'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('branches');
    }
};
