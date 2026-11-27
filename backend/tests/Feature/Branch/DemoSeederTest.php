<?php

namespace Tests\Feature\Branch;

use App\Enums\BranchScope;
use App\Models\Company;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The local demo data the README and the Playwright specs rely on (`php artisan db:seed`).
 */
class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeding_twice_creates_the_demo_branches_and_access_once(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $company = Company::query()->where('code', 'demo-retail')->sole();
        $this->assertSame(['CWH', 'GOW', 'MKS'], $company->branches()->orderBy('code')->pluck('code')->all());

        $admin = $company->memberships()->where('user_id', User::query()->where('email', 'demo-admin@example.com')->value('id'))->sole();
        $this->assertSame(BranchScope::All, $admin->branch_scope);

        $cashier = $company->memberships()->where('user_id', User::query()->where('email', 'demo-cashier@example.com')->value('id'))->sole();
        $this->assertSame(BranchScope::Selected, $cashier->branch_scope);
        $this->assertSame(['GOW'], $cashier->branches()->pluck('code')->all());
    }
}
