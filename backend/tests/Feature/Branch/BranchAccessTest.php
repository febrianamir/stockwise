<?php

namespace Tests\Feature\Branch;

use App\Enums\AuditAction;
use App\Enums\BranchScope;
use App\Enums\MembershipRole;
use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\Company;
use App\Models\CompanyMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Members' branch access (docs/features/branch-management/prd.md BM-3 to BM-5, §11 "Access").
 */
class BranchAccessTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Company $company;

    private Branch $makassar;

    private Branch $gowa;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create();
        $this->company = Company::factory()->withOwner($this->owner)->create();
        $this->makassar = Branch::factory()->for($this->company)->create(['name' => 'Makassar Store', 'code' => 'MKS']);
        $this->gowa = Branch::factory()->for($this->company)->create(['name' => 'Gowa Store', 'code' => 'GOW']);
    }

    private function member(MembershipRole $role): CompanyMembership
    {
        return CompanyMembership::factory()->for($this->company)->role($role)->create();
    }

    private function url(CompanyMembership $membership): string
    {
        return "/api/v1/companies/{$this->company->public_id}/members/{$membership->id}/branch-access";
    }

    public function test_new_members_start_with_their_roles_default_scope(): void
    {
        $this->assertSame(BranchScope::All, $this->member(MembershipRole::Admin)->branch_scope);
        $this->assertSame(BranchScope::Selected, $this->member(MembershipRole::Manager)->branch_scope);
        $this->assertSame(BranchScope::Selected, $this->member(MembershipRole::Cashier)->branch_scope);
        $this->assertSame(BranchScope::All, $this->company->ownerMembership->branch_scope);
    }

    public function test_owner_restricts_a_member_to_selected_branches_then_grants_all(): void
    {
        $cashier = $this->member(MembershipRole::Cashier);
        Sanctum::actingAs($this->owner);

        $this->putJson($this->url($cashier), ['scope' => 'selected', 'branch_ids' => [strtoupper($this->gowa->public_id)]])
            ->assertOk()
            ->assertJsonPath('data.scope', 'selected')
            ->assertJsonPath('data.branches.*.code', ['GOW']);

        $entry = AuditLog::query()->where('action', AuditAction::BranchAccessUpdated)->sole();
        $this->assertSame($this->company->id, $entry->company_id);
        $this->assertEquals(['from' => ['scope' => 'selected', 'branches' => []], 'to' => ['scope' => 'selected', 'branches' => ['GOW']]], $entry->metadata['changes']['branch_access']);

        Sanctum::actingAs($cashier->user);
        $this->getJson("/api/v1/companies/{$this->company->public_id}/me/branches")->assertJsonPath('data.*.code', ['GOW']);

        Sanctum::actingAs($this->owner);
        $this->putJson($this->url($cashier), ['scope' => 'all'])->assertOk()->assertJsonPath('data.scope', 'all')->assertJsonPath('data.branches', []);
        $this->assertDatabaseMissing('membership_branch_access', ['membership_id' => $cashier->id]);
        $this->getJson($this->url($cashier))->assertOk()->assertJsonPath('data.scope', 'all');
    }

    public function test_an_unchanged_replacement_writes_no_audit_entry(): void
    {
        $cashier = $this->member(MembershipRole::Cashier);
        Sanctum::actingAs($this->owner);

        $this->putJson($this->url($cashier), ['scope' => 'selected', 'branch_ids' => [$this->gowa->public_id, $this->makassar->public_id]])->assertOk();
        $this->putJson($this->url($cashier), ['scope' => 'selected', 'branch_ids' => [$this->makassar->public_id, $this->gowa->public_id]])->assertOk();

        $this->assertSame(1, AuditLog::query()->where('action', AuditAction::BranchAccessUpdated)->count());
    }

    public function test_selected_needs_branches_of_this_company(): void
    {
        $cashier = $this->member(MembershipRole::Cashier);
        $foreign = Branch::factory()->for(Company::factory()->withOwner())->create();
        Sanctum::actingAs($this->owner);

        $this->putJson($this->url($cashier), ['scope' => 'selected'])->assertJsonValidationErrors('branch_ids');
        $this->putJson($this->url($cashier), ['scope' => 'selected', 'branch_ids' => []])->assertJsonValidationErrors('branch_ids');
        $this->putJson($this->url($cashier), ['scope' => 'selected', 'branch_ids' => ['not-a-ulid']])->assertJsonValidationErrors('branch_ids.0');
        $this->putJson($this->url($cashier), ['scope' => 'everything'])->assertJsonValidationErrors('scope');
        $this->putJson($this->url($cashier), ['scope' => 'selected', 'branch_ids' => [$this->gowa->public_id, $foreign->public_id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('branch_ids');

        $this->assertDatabaseMissing('membership_branch_access', ['membership_id' => $cashier->id]);
    }

    public function test_the_owner_and_yourself_cannot_be_changed(): void
    {
        $admin = $this->member(MembershipRole::Admin);
        Sanctum::actingAs($admin->user);

        $this->putJson($this->url($this->company->ownerMembership), ['scope' => 'selected', 'branch_ids' => [$this->gowa->public_id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('scope');
        $this->putJson($this->url($admin), ['scope' => 'selected', 'branch_ids' => [$this->gowa->public_id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('scope');

        $this->getJson($this->url($this->company->ownerMembership))->assertOk()->assertJsonPath('data.scope', 'all')->assertJsonPath('data.is_owner', true);
    }

    public function test_only_owners_and_admins_manage_branch_access(): void
    {
        $target = $this->member(MembershipRole::Cashier);

        foreach ([MembershipRole::Manager, MembershipRole::Cashier] as $role) {
            Sanctum::actingAs($this->member($role)->user);
            $this->getJson($this->url($target))->assertForbidden();
            $this->putJson($this->url($target), ['scope' => 'all'])->assertForbidden();
        }
    }

    public function test_memberships_of_another_company_are_not_found(): void
    {
        $foreign = CompanyMembership::factory()->for(Company::factory()->withOwner())->create();
        Sanctum::actingAs($this->owner);

        $this->getJson($this->url($foreign))->assertNotFound();
        $this->putJson($this->url($foreign), ['scope' => 'all'])->assertNotFound();
    }

    public function test_my_branches_lists_exactly_the_accessible_branches_active_first(): void
    {
        $closed = Branch::factory()->for($this->company)->inactive()->create(['name' => 'Alpha Closed', 'code' => 'ALP']);
        $manager = $this->member(MembershipRole::Manager);
        Sanctum::actingAs($this->owner);
        $this->putJson($this->url($manager), ['scope' => 'selected', 'branch_ids' => [$closed->public_id, $this->makassar->public_id]])->assertOk();

        $this->getJson("/api/v1/companies/{$this->company->public_id}/me/branches")->assertJsonPath('data.*.code', ['GOW', 'MKS', 'ALP']);

        Sanctum::actingAs($manager->user);
        $this->getJson("/api/v1/companies/{$this->company->public_id}/me/branches")->assertJsonPath('data.*.code', ['MKS', 'ALP']);

        Sanctum::actingAs($this->member(MembershipRole::Cashier)->user);
        $this->getJson("/api/v1/companies/{$this->company->public_id}/me/branches")->assertOk()->assertJsonPath('data', []);
    }

    public function test_deactivating_and_reactivating_a_member_keeps_their_branch_access(): void
    {
        $cashier = $this->member(MembershipRole::Cashier);
        Sanctum::actingAs($this->owner);
        $this->putJson($this->url($cashier), ['scope' => 'selected', 'branch_ids' => [$this->gowa->public_id]])->assertOk();

        $member = "/api/v1/companies/{$this->company->public_id}/members/{$cashier->id}";
        $this->patchJson($member, ['status' => 'inactive'])->assertOk();
        $this->patchJson($member, ['status' => 'active'])->assertOk();

        $this->getJson($this->url($cashier))->assertJsonPath('data.branches.*.code', ['GOW']);
    }

    public function test_a_role_change_keeps_branch_access_and_the_member_list_shows_the_scope(): void
    {
        $admin = $this->member(MembershipRole::Admin);
        Sanctum::actingAs($this->owner);

        $this->patchJson("/api/v1/companies/{$this->company->public_id}/members/{$admin->id}", ['role' => 'cashier'])
            ->assertOk()
            ->assertJsonPath('data.branch_scope', 'all');
    }

    public function test_ownership_transfer_leaves_the_previous_owner_with_every_branch(): void
    {
        $manager = $this->member(MembershipRole::Manager);
        Sanctum::actingAs(User::factory()->superadmin()->create());

        $this->postJson("/api/v1/admin/companies/{$this->company->public_id}/transfer-ownership", [
            'user_id' => $manager->user_id,
            'reason' => 'The founder is retiring this year.',
        ])->assertOk();

        $previous = $this->company->memberships()->where('user_id', $this->owner->id)->sole();
        $this->assertSame(MembershipRole::Admin, $previous->role);
        $this->assertSame(BranchScope::All, $previous->branch_scope);
    }
}
