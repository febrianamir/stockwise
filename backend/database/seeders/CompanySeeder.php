<?php

namespace Database\Seeders;

use App\Enums\MembershipRole;
use App\Models\Company;
use App\Models\User;
use App\Services\CompanyService;
use Illuminate\Database\Seeder;

/**
 * A demo company for local development: owned by test@example.com, with an Admin member so
 * ownership transfer can be tried before member management exists. Safe to run again.
 */
class CompanySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(CompanyService $companies): void
    {
        $owner = User::query()->where('email', 'test@example.com')->first();
        $superadmin = User::query()->where('is_superadmin', true)->orderBy('id')->first();

        if ($owner === null || $superadmin === null || Company::query()->where('code', 'demo-retail')->exists()) {
            return;
        }

        $company = $companies->create($superadmin, [
            'name' => 'Demo Retail',
            'code' => 'demo-retail',
            'legal_name' => 'PT Demo Retail Indonesia',
            'email' => 'hello@demo-retail.test',
            'phone' => '+62 411 000000',
            'address' => 'Jl. Contoh No. 1, Makassar',
            'timezone' => 'Asia/Makassar',
            'currency' => 'IDR',
        ], $owner->getKey());

        $admin = User::query()->firstOrCreate(
            ['email' => 'demo-admin@example.com'],
            ['name' => 'Demo Admin', 'password' => 'password'],
        );
        $admin->forceFill(['email_verified_at' => $admin->email_verified_at ?? now(), 'status' => 'active'])->save();

        $company->memberships()->firstOrCreate(['user_id' => $admin->getKey()], ['role' => MembershipRole::Admin]);

        $this->command?->info('Demo company ready: Demo Retail (owner test@example.com, admin demo-admin@example.com / password)');
    }
}
