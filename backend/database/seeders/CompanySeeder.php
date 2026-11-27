<?php

namespace Database\Seeders;

use App\Enums\BranchScope;
use App\Enums\BranchType;
use App\Enums\MembershipRole;
use App\Models\Company;
use App\Models\User;
use App\Services\BranchAccessService;
use App\Services\BranchService;
use App\Services\CompanyService;
use Illuminate\Database\Seeder;

/**
 * A demo company for local development: owned by test@example.com, with an Admin, a Cashier
 * restricted to one branch, and three branches. Safe to run again.
 */
class CompanySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(CompanyService $companies, BranchService $branchService, BranchAccessService $access): void
    {
        $owner = User::query()->where('email', 'test@example.com')->first();
        $superadmin = User::query()->where('is_superadmin', true)->orderBy('id')->first();

        if ($owner === null || $superadmin === null) {
            return;
        }

        $company = Company::query()->where('code', 'demo-retail')->first() ?? $companies->create($superadmin, [
            'name' => 'Demo Retail',
            'code' => 'demo-retail',
            'legal_name' => 'PT Demo Retail Indonesia',
            'email' => 'hello@demo-retail.test',
            'phone' => '+62 411 000000',
            'address' => 'Jl. Contoh No. 1, Makassar',
            'timezone' => 'Asia/Makassar',
            'currency' => 'IDR',
        ], $owner->getKey());

        $company->memberships()->firstOrCreate(['user_id' => $this->verifiedUser('demo-admin@example.com', 'Demo Admin')->getKey()], ['role' => MembershipRole::Admin, 'branch_scope' => BranchScope::All]);

        // Branches (docs/features/branch-management/prd.md): two stores and a warehouse. Playwright
        // specs rely on them.
        $branches = collect([
            ['name' => 'Makassar Store', 'code' => 'MKS', 'type' => BranchType::Store, 'address' => 'Jl. Somba Opu No. 10, Makassar'],
            ['name' => 'Gowa Store', 'code' => 'GOW', 'type' => BranchType::Store, 'address' => 'Jl. Poros Malino No. 5, Gowa'],
            ['name' => 'Central Warehouse', 'code' => 'CWH', 'type' => BranchType::Warehouse, 'address' => 'Kawasan Industri Makassar Blok A1'],
        ])->mapWithKeys(fn (array $attributes) => [
            $attributes['code'] => $company->branches()->where('code', $attributes['code'])->first() ?? $branchService->create($owner, $company, $attributes),
        ]);

        // A cashier who may only work in Gowa Store (BM-3).
        $cashier = $company->memberships()->firstOrCreate(['user_id' => $this->verifiedUser('demo-cashier@example.com', 'Demo Cashier')->getKey()], ['role' => MembershipRole::Cashier, 'branch_scope' => BranchScope::Selected]);

        if ($cashier->wasRecentlyCreated) {
            $access->replaceAccess($owner, $company, $cashier, BranchScope::Selected, [$branches['GOW']->public_id]);
        }

        $this->command?->info('Demo company ready: Demo Retail (owner test@example.com, admin demo-admin@example.com, cashier demo-cashier@example.com in Gowa Store; password "password")');
    }

    /**
     * An active, verified demo account with the password "password".
     */
    private function verifiedUser(string $email, string $name): User
    {
        $user = User::query()->firstOrCreate(['email' => $email], ['name' => $name, 'password' => 'password']);
        $user->forceFill(['email_verified_at' => $user->email_verified_at ?? now(), 'status' => 'active'])->save();

        return $user;
    }
}
