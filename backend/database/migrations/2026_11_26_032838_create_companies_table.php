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
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->string('name', 150);
            $table->string('code', 40);
            $table->string('legal_name', 200)->nullable();
            $table->string('tax_id', 50)->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 30)->nullable();
            $table->text('address')->nullable();
            $table->string('timezone', 64);
            $table->char('currency', 3)->default('IDR');
            $table->string('status', 16)->default('active')->index();
            $table->timestamp('suspended_at')->nullable();
            $table->text('suspension_reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            // Microseconds, so optimistic concurrency (CM-11) catches two edits in the same second.
            $table->timestamps(6);

            $table->index('created_at');
        });

        DB::statement('CREATE UNIQUE INDEX companies_code_lower_unique ON companies (lower(code))');
        DB::statement('CREATE INDEX companies_name_lower_index ON companies (lower(name))');
        DB::statement("ALTER TABLE companies ADD CONSTRAINT companies_code_format CHECK (code ~ '^[a-z][a-z0-9-]{2,39}$')");
        DB::statement("ALTER TABLE companies ADD CONSTRAINT companies_status_check CHECK (status IN ('active', 'suspended'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
