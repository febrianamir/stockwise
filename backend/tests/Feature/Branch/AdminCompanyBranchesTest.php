<?php

namespace Tests\Feature\Branch;

use App\Models\Branch;
use App\Models\Company;
use App\Models\CompanyMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Superadmins read a company's branches through platform routes only (company-management PRD,
 * CM-12, CM-15).
 */
class AdminCompanyBranchesTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmins_list_a_companys_branches_and_see_the_count(): void
    {
        $company = Company::factory()->withOwner()->create();
        Branch::factory()->for($company)->create(['name' => 'Gowa Store']);
        Branch::factory()->for($company)->warehouse()->create(['name' => 'Central Warehouse']);
        Branch::factory()->for(Company::factory()->withOwner())->create();
        Sanctum::actingAs(User::factory()->superadmin()->create());

        $this->getJson("/api/v1/admin/companies/{$company->public_id}/branches")
            ->assertOk()
            ->assertJsonPath('data.*.name', ['Central Warehouse', 'Gowa Store'])
            ->assertJsonPath('data.0.members_count', 1);
        $this->getJson("/api/v1/admin/companies/{$company->public_id}")->assertJsonPath('data.branches_count', 2);
    }

    public function test_company_activity_names_the_branch_or_member_of_branch_entries(): void
    {
        $owner = User::factory()->create();
        $company = Company::factory()->withOwner($owner)->create();
        $cashier = CompanyMembership::factory()->for($company)->create();

        Sanctum::actingAs($owner);
        $branch = $this->postJson("/api/v1/companies/{$company->public_id}/branches", ['name' => 'Gowa Store', 'code' => 'GOW'])->assertCreated()->json('data');
        $this->putJson("/api/v1/companies/{$company->public_id}/members/{$cashier->id}/branch-access", ['scope' => 'selected', 'branch_ids' => [$branch['id']]])->assertOk();

        Sanctum::actingAs(User::factory()->superadmin()->create());
        $this->getJson("/api/v1/admin/companies/{$company->public_id}/activity")
            ->assertOk()
            ->assertJsonPath('data.0.action', 'branch_access.updated')
            ->assertJsonPath('data.0.member.id', $cashier->user_id)
            ->assertJsonPath('data.0.metadata.changes.branch_access.to', ['scope' => 'selected', 'branches' => ['GOW']])
            ->assertJsonPath('data.1.action', 'branch.created')
            ->assertJsonPath('data.1.branch', ['id' => $branch['id'], 'name' => 'Gowa Store', 'code' => 'GOW']);
    }

    public function test_everyone_else_is_forbidden_including_the_companys_owner(): void
    {
        $owner = User::factory()->create();
        $company = Company::factory()->withOwner($owner)->create();

        foreach ([$owner, User::factory()->create()] as $user) {
            Sanctum::actingAs($user);
            $this->getJson("/api/v1/admin/companies/{$company->public_id}/branches")->assertForbidden();
        }
    }
}
