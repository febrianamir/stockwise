<?php

namespace Tests\Feature\Branch;

use App\Enums\BranchScope;
use App\Enums\MembershipRole;
use App\Models\Branch;
use App\Models\Company;
use App\Models\CompanyMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The branch gate every branch-scoped module inherits (docs/architecture/tenancy.md, "Branch
 * context"; branch-management PRD BM-3, BM-6, BM-10). Uses test-only routes shaped like a later
 * operational module.
 */
class BranchResolverTest extends TestCase
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
        $this->makassar = Branch::factory()->for($this->company)->create(['code' => 'MKS']);
        $this->gowa = Branch::factory()->for($this->company)->create(['code' => 'GOW']);

        $probe = fn (Request $request) => [
            'company' => $request->attributes->get('company')->public_id,
            'branch' => $request->attributes->get('branch')->public_id,
        ];

        Route::middleware(['api', 'auth:sanctum', 'verified', 'company.member', 'company.branch', 'branch.active'])
            ->prefix('/api/v1/companies/{company}/branches/{branch}/test-probe')
            ->group(function () use ($probe): void {
                Route::get('/', $probe);
                Route::post('/', $probe);
            });
    }

    private function member(MembershipRole $role, BranchScope $scope = BranchScope::Selected, Branch ...$granted): CompanyMembership
    {
        $membership = CompanyMembership::factory()->for($this->company)->role($role)->create();
        $membership->forceFill(['branch_scope' => $scope])->save();

        foreach ($granted as $branch) {
            DB::table('membership_branch_access')->insert(['company_id' => $this->company->id, 'membership_id' => $membership->id, 'branch_id' => $branch->id]);
        }

        return $membership;
    }

    private function probe(User $user, Branch $branch, string $method = 'get', ?Company $company = null): TestResponse
    {
        Sanctum::actingAs($user);
        $company ??= $this->company;

        return $this->json($method, "/api/v1/companies/{$company->public_id}/branches/{$branch->public_id}/test-probe");
    }

    public function test_the_branch_is_resolved_within_the_company_and_shared_on_the_request(): void
    {
        $this->probe($this->owner, $this->makassar)
            ->assertOk()
            ->assertExactJson(['company' => $this->company->public_id, 'branch' => $this->makassar->public_id]);
    }

    public function test_a_branch_of_another_company_is_not_found_even_for_its_owner_elsewhere(): void
    {
        $otherOwner = User::factory()->create();
        $other = Company::factory()->withOwner($otherOwner)->create();
        $foreignBranch = Branch::factory()->for($other)->create();

        // A member of this company, with every branch, addressing another company's branch here.
        $this->probe($this->owner, $foreignBranch)->assertNotFound();
        // Its own owner, through the wrong company: not a member here, so 404 before the branch.
        $this->probe($otherOwner, $this->makassar)->assertNotFound();
        $this->probe($this->owner, $foreignBranch, company: $other)->assertNotFound();
    }

    public function test_selected_members_reach_only_their_granted_branches(): void
    {
        $cashier = $this->member(MembershipRole::Cashier, BranchScope::Selected, $this->gowa);

        $this->probe($cashier->user, $this->gowa)->assertOk();
        $this->probe($cashier->user, $this->makassar)
            ->assertForbidden()
            ->assertJsonPath('code', 'BRANCH_ACCESS_DENIED');
    }

    public function test_members_with_no_branches_are_denied_everywhere(): void
    {
        $manager = $this->member(MembershipRole::Manager);

        $this->probe($manager->user, $this->makassar)->assertForbidden()->assertJsonPath('code', 'BRANCH_ACCESS_DENIED');
    }

    public function test_scope_all_and_the_owner_reach_every_branch_including_new_ones(): void
    {
        $areaManager = $this->member(MembershipRole::Manager, BranchScope::All);
        // The owner has implicit access whatever is stored (BR-3).
        $this->company->ownerMembership->forceFill(['branch_scope' => BranchScope::Selected])->save();
        $later = Branch::factory()->for($this->company)->create();

        foreach ([$areaManager->user, $this->owner] as $user) {
            $this->probe($user, $later)->assertOk();
        }
    }

    public function test_an_inactive_branch_rejects_writes_but_allows_reads(): void
    {
        $closed = Branch::factory()->for($this->company)->inactive()->create();

        $this->probe($this->owner, $closed)->assertOk();
        $this->probe($this->owner, $closed, 'post')->assertForbidden()->assertJsonPath('code', 'BRANCH_INACTIVE');
        $this->probe($this->owner, $this->makassar, 'post')->assertOk();
    }

    public function test_company_suspension_overrides_branch_access(): void
    {
        $this->company->forceFill(['status' => 'suspended', 'suspended_at' => now(), 'suspension_reason' => 'Unpaid invoices for months.'])->save();

        $this->probe($this->owner, $this->makassar)->assertForbidden()->assertJsonPath('code', 'COMPANY_SUSPENDED');
    }

    public function test_revoked_access_is_denied_on_the_next_request(): void
    {
        $cashier = $this->member(MembershipRole::Cashier, BranchScope::Selected, $this->gowa);
        $this->probe($cashier->user, $this->gowa)->assertOk();

        DB::table('membership_branch_access')->where('membership_id', $cashier->id)->delete();

        $this->probe($cashier->user, $this->gowa)->assertForbidden()->assertJsonPath('code', 'BRANCH_ACCESS_DENIED');
    }

    public function test_deactivated_members_get_not_found_even_with_a_grant(): void
    {
        $cashier = $this->member(MembershipRole::Cashier, BranchScope::Selected, $this->gowa);
        $cashier->forceFill(['status' => 'inactive'])->save();

        $this->probe($cashier->user, $this->gowa)->assertNotFound();
    }
}
