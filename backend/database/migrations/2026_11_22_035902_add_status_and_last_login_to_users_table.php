<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('status', 16)->default('pending')->after('is_superadmin')->index();
            $table->timestamp('last_login_at')->nullable()->after('status')->index();
            $table->index('created_at');
        });

        DB::table('users')->whereNotNull('email_verified_at')->update(['status' => 'active']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
            $table->dropIndex(['last_login_at']);
            $table->dropIndex(['status']);
            $table->dropColumn(['status', 'last_login_at']);
        });
    }
};
