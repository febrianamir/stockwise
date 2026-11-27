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
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Branch CRUD and status inside a company (docs/features/branch-management/prd.md §6, §11).
 */
class BranchManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Company $company;

    private string $base;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create();
        $this->company = Company::factory()->withOwner($this->owner)->create();
        $this->base = "/api/v1/companies/{$this->company->public_id}/branches";
    }

    private function member(MembershipRole $role, ?BranchScope $scope = null, Branch ...$granted): CompanyMembership
    {
        $membership = CompanyMembership::factory()->for($this->company)->role($role)->create();

        if ($scope !== null) {
            $membership->forceFill(['branch_scope' => $scope])->save();
        }

        foreach ($granted as $branch) {
            DB::table('membership_branch_access')->insert(['company_id' => $this->company->id, 'membership_id' => $membership->id, 'branch_id' => $branch->id]);
        }

        return $membership;
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'name' => 'Makassar Store',
            'code' => 'mks',
            'type' => 'store',
            'address' => 'Jl. Somba Opu No. 10',
            'phone' => '+62 411 123456',
            ...$overrides,
        ];
    }

    public function test_owner_creates_an_active_branch_in_the_route_company(): void
    {
        $other = Company::factory()->withOwner()->create();
        Sanctum::actingAs($this->owner);

        $response = $this->postJson($this->base, $this->payload(['company_id' => $other->id]))
            ->assertCreated()
            ->assertJsonPath('data.code', 'MKS')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.type', 'store')
            ->assertJsonPath('data.timezone', null)
            ->assertJsonPath('data.members_count', 1);

        $branch = Branch::query()->where('public_id', $response->json('data.id'))->firstOrFail();
        $this->assertSame($this->company->id, $branch->company_id);
        $this->assertSame($this->owner->id, $branch->created_by);
        $this->assertDatabaseHas('audit_logs', [
            'action' => AuditAction::BranchCreated->value,
            'subject_id' => $branch->id,
            'company_id' => $this->company->id,
            'actor_id' => $this->owner->id,
        ]);
    }

    public function test_codes_and_names_are_unique_within_a_company_only(): void
    {
        Branch::factory()->for($this->company)->create(['code' => 'MKS', 'name' => 'Makassar Store']);
        Sanctum::actingAs($this->owner);

        $this->postJson($this->base, $this->payload(['name' => 'Other']))->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->postJson($this->base, $this->payload(['code' => 'MKS2', 'name' => 'makassar store']))->assertUnprocessable()->assertJsonValidationErrors('name');

        $otherOwner = User::factory()->create();
        $other = Company::factory()->withOwner($otherOwner)->create();
        Sanctum::actingAs($otherOwner);
        $this->postJson("/api/v1/companies/{$other->public_id}/branches", $this->payload())->assertCreated();
    }

    public function test_create_validates_code_format_type_and_timezone(): void
    {
        Sanctum::actingAs($this->owner);

        $this->postJson($this->base, $this->payload(['code' => 'M', 'type' => 'kiosk', 'timezone' => 'Mars/Olympus']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code', 'type', 'timezone']);
        $this->postJson($this->base, $this->payload(['code' => '-MKS']))->assertJsonValidationErrors('code');
        $this->postJson($this->base, $this->payload(['code' => 'MK S']))->assertJsonValidationErrors('code');
    }

    public function test_type_defaults_to_store_and_warehouses_can_be_created(): void
    {
        Sanctum::actingAs($this->owner);

        $this->postJson($this->base, $this->payload(['type' => null, 'code' => 'A1', 'name' => 'A']))->assertUnprocessable();
        $payload = $this->payload(['code' => 'B1', 'name' => 'Bone Store']);
        unset($payload['type']);
        $this->postJson($this->base, $payload)->assertCreated()->assertJsonPath('data.type', 'store');
        $this->postJson($this->base, $this->payload(['code' => 'CWH', 'name' => 'Central Warehouse', 'type' => 'warehouse', 'timezone' => 'Asia/Jakarta']))
            ->assertCreated()
            ->assertJsonPath('data.type', 'warehouse')
            ->assertJsonPath('data.timezone', 'Asia/Jakarta');
    }

    public function test_only_owners_and_admins_manage_branches(): void
    {
        $branch = Branch::factory()->for($this->company)->create();
        $manager = $this->member(MembershipRole::Manager, BranchScope::All);
        $cashier = $this->member(MembershipRole::Cashier, BranchScope::Selected, $branch);

        foreach ([$manager->user, $cashier->user] as $user) {
            Sanctum::actingAs($user);
            $this->postJson($this->base, $this->payload())->assertForbidden();
            $this->patchJson("{$this->base}/{$branch->public_id}", ['name' => 'New', 'updated_at' => $branch->updated_at->format('Y-m-d\TH:i:s.uP')])->assertForbidden();
            $this->postJson("{$this->base}/{$branch->public_id}/deactivate", ['reason' => 'Closing this store.'])->assertForbidden();
            $this->getJson("{$this->base}/{$branch->public_id}")->assertOk();
        }

        Sanctum::actingAs($this->member(MembershipRole::Admin)->user);
        $this->postJson($this->base, $this->payload())->assertCreated();
    }

    public function test_non_members_and_superadmins_get_not_found(): void
    {
        $branch = Branch::factory()->for($this->company)->create();

        foreach ([User::factory()->create(), User::factory()->superadmin()->create()] as $user) {
            Sanctum::actingAs($user);
            $this->getJson($this->base)->assertNotFound();
            $this->getJson("{$this->base}/{$branch->public_id}")->assertNotFound();
            $this->postJson($this->base, $this->payload())->assertNotFound();
        }
    }

    public function test_the_list_shows_only_accessible_branches_with_search_filters_and_counts(): void
    {
        $makassar = Branch::factory()->for($this->company)->create(['name' => 'Makassar Store', 'code' => 'MKS']);
        $gowa = Branch::factory()->for($this->company)->create(['name' => 'Gowa Store', 'code' => 'GOW']);
        $warehouse = Branch::factory()->for($this->company)->warehouse()->inactive()->create(['name' => 'Central Warehouse', 'code' => 'CWH']);
        Branch::factory()->for(Company::factory()->withOwner())->create(['name' => 'Elsewhere Store']);
        $cashier = $this->member(MembershipRole::Cashier, BranchScope::Selected, $gowa);
        $this->member(MembershipRole::Admin);

        Sanctum::actingAs($this->owner);
        $this->getJson($this->base)
            ->assertOk()
            ->assertJsonPath('data.*.code', ['CWH', 'GOW', 'MKS'])
            // Owner + Admin (scope all) everywhere, plus the cashier in Gowa.
            ->assertJsonPath('data.*.members_count', [2, 3, 2]);
        $this->getJson("{$this->base}?search=mks")->assertJsonPath('data.*.id', [$makassar->public_id]);
        $this->getJson("{$this->base}?type=warehouse")->assertJsonPath('data.*.id', [$warehouse->public_id]);
        $this->getJson("{$this->base}?status=active&sort=code&direction=desc")->assertJsonPath('data.*.code', ['MKS', 'GOW']);
        $this->getJson("{$this->base}?sort=owner")->assertUnprocessable();

        Sanctum::actingAs($cashier->user);
        $this->getJson($this->base)->assertOk()->assertJsonPath('data.*.id', [$gowa->public_id]);
        $this->getJson("{$this->base}/{$makassar->public_id}")->assertForbidden()->assertJsonPath('code', 'BRANCH_ACCESS_DENIED');
    }

    public function test_a_restricted_admin_cannot_manage_branches_outside_their_access(): void
    {
        $makassar = Branch::factory()->for($this->company)->create();
        $gowa = Branch::factory()->for($this->company)->create();
        $admin = $this->member(MembershipRole::Admin, BranchScope::Selected, $gowa);
        Sanctum::actingAs($admin->user);

        $this->postJson("{$this->base}/{$makassar->public_id}/deactivate", ['reason' => 'Closing this store.'])
            ->assertForbidden()
            ->assertJsonPath('code', 'BRANCH_ACCESS_DENIED');
        $this->postJson("{$this->base}/{$gowa->public_id}/deactivate", ['reason' => 'Closing this store.'])->assertOk();
    }

    public function test_edit_changes_profile_fields_and_audits_only_changes(): void
    {
        $branch = Branch::factory()->for($this->company)->create(['name' => 'Old Name', 'code' => 'OLD']);
        Sanctum::actingAs($this->owner);
        $url = "{$this->base}/{$branch->public_id}";

        $this->patchJson($url, ['name' => 'New Name', 'type' => 'warehouse', 'timezone' => 'Asia/Jayapura', 'updated_at' => $branch->updated_at->format('Y-m-d\TH:i:s.uP')])
            ->assertOk()
            ->assertJsonPath('data.name', 'New Name')
            ->assertJsonPath('data.type', 'warehouse')
            ->assertJsonPath('data.code', 'OLD');

        $entry = AuditLog::query()->where('action', AuditAction::BranchUpdated)->sole();
        $this->assertEquals(['from' => 'Old Name', 'to' => 'New Name'], $entry->metadata['changes']['name']);
        $this->assertEquals(['from' => 'store', 'to' => 'warehouse'], $entry->metadata['changes']['type']);

        $fresh = $branch->fresh();
        $this->patchJson($url, ['name' => 'New Name', 'updated_at' => $fresh->updated_at->format('Y-m-d\TH:i:s.uP')])->assertOk();
        $this->assertSame(1, AuditLog::query()->where('action', AuditAction::BranchUpdated)->count());
    }

    public function test_code_and_status_cannot_be_edited_and_stale_edits_conflict(): void
    {
        $branch = Branch::factory()->for($this->company)->create(['code' => 'MKS']);
        Sanctum::actingAs($this->owner);
        $url = "{$this->base}/{$branch->public_id}";
        $loaded = $branch->updated_at->format('Y-m-d\TH:i:s.uP');

        $this->patchJson($url, ['code' => 'NEW', 'status' => 'inactive', 'updated_at' => $loaded])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code', 'status']);
        $this->patchJson($url, ['name' => 'Missing Version'])->assertJsonValidationErrors('updated_at');

        $this->patchJson($url, ['name' => 'First Edit', 'updated_at' => $loaded])->assertOk();
        $this->patchJson($url, ['name' => 'Second Edit', 'updated_at' => $loaded])
            ->assertConflict()
            ->assertJsonPath('code', 'STALE_RECORD');

        $this->assertSame('MKS', $branch->fresh()->code);
        $this->assertSame('First Edit', $branch->fresh()->name);
    }

    public function test_deactivate_and_reactivate_keep_access_and_audit_once(): void
    {
        $branch = Branch::factory()->for($this->company)->create();
        $cashier = $this->member(MembershipRole::Cashier, BranchScope::Selected, $branch);
        Sanctum::actingAs($this->owner);
        $url = "{$this->base}/{$branch->public_id}";

        $this->postJson("{$url}/deactivate", ['reason' => 'short'])->assertJsonValidationErrors('reason');
        $this->postJson("{$url}/deactivate", ['reason' => 'Closed for renovation.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'inactive')
            ->assertJsonPath('data.deactivation_reason', 'Closed for renovation.');
        $this->postJson("{$url}/deactivate", ['reason' => 'Closed for renovation.'])
            ->assertConflict()
            ->assertJsonPath('code', 'INVALID_STATUS_TRANSITION');
        $this->assertSame(1, AuditLog::query()->where('action', AuditAction::BranchDeactivated)->count());

        // Management routes still work on an inactive branch, so it can be viewed and reactivated.
        $this->getJson($url)->assertOk();
        $this->postJson("{$url}/reactivate")->assertOk()->assertJsonPath('data.status', 'active')->assertJsonPath('data.deactivation_reason', null);
        $this->postJson("{$url}/reactivate")->assertConflict();
        $this->assertSame(1, AuditLog::query()->where('action', AuditAction::BranchReactivated)->count());

        $this->assertDatabaseHas('membership_branch_access', ['membership_id' => $cashier->id, 'branch_id' => $branch->id]);
    }

    public function test_branch_members_lists_everyone_who_can_work_there(): void
    {
        $branch = Branch::factory()->for($this->company)->create();
        $admin = $this->member(MembershipRole::Admin);
        $cashier = $this->member(MembershipRole::Cashier, BranchScope::Selected, $branch);
        $this->member(MembershipRole::Cashier);
        $this->member(MembershipRole::Manager, BranchScope::Selected, $branch)->forceFill(['status' => 'inactive'])->save();
        Sanctum::actingAs($cashier->user);

        $this->getJson("{$this->base}/{$branch->public_id}/members")
            ->assertOk()
            ->assertJsonPath('data.0.is_owner', true)
            ->assertJsonPath('data.*.id', [$this->company->ownerMembership->id, $admin->id, $cashier->id])
            ->assertJsonPath('data.*.branch_scope', ['all', 'all', 'selected']);
    }
}
