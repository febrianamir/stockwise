<?php

namespace Tests\Feature\Company;

use App\Enums\AuditAction;
use App\Enums\MembershipRole;
use App\Models\Company;
use App\Models\CompanyMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * A company from its members' side (docs/features/company-workspace/prd.md, CW-1, CW-2, CW-7, CW-8).
 */
class CompanyWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create(['name' => 'Owner']);
        $this->company = Company::factory()->withOwner($this->owner)->create(['name' => 'Toko Sejahtera', 'code' => 'toko-sejahtera']);
    }

    private function member(MembershipRole $role): User
    {
        return CompanyMembership::factory()->for($this->company)->role($role)->create()->user;
    }

    public function test_my_companies_lists_active_memberships_including_suspended_companies(): void
    {
        $user = $this->member(MembershipRole::Cashier);
        $suspended = Company::factory()->withOwner()->suspended()->create(['name' => 'Another Shop']);
        CompanyMembership::factory()->for($suspended)->for($user)->role(MembershipRole::Manager)->create();
        CompanyMembership::factory()->for(Company::factory()->withOwner()->create())->for($user)->inactive()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/companies')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Another Shop')
            ->assertJsonPath('data.0.status', 'suspended')
            ->assertJsonPath('data.0.role', 'manager')
            ->assertJsonPath('data.1.id', $this->company->public_id)
            ->assertJsonPath('data.1.role', 'cashier')
            ->assertJsonPath('data.1.is_owner', false);
    }

    public function test_my_companies_requires_a_verified_login(): void
    {
        $this->getJson('/api/v1/companies')->assertUnauthorized();

        Sanctum::actingAs(User::factory()->unverified()->create());
        $this->getJson('/api/v1/companies')->assertForbidden();
    }

    public function test_every_member_can_view_the_company_with_their_permissions(): void
    {
        Sanctum::actingAs($this->member(MembershipRole::Cashier));

        $this->getJson("/api/v1/companies/{$this->company->public_id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Toko Sejahtera')
            ->assertJsonPath('data.owner.name', 'Owner')
            ->assertJsonPath('data.membership.role', 'cashier')
            ->assertJsonPath('data.membership.permissions', ['view-company', 'view-branches']);

        Sanctum::actingAs($this->owner);
        $this->getJson("/api/v1/companies/{$this->company->public_id}")
            ->assertJsonPath('data.membership.is_owner', true)
            ->assertJsonPath('data.membership.permissions', ['view-company', 'manage-company', 'manage-members', 'view-branches', 'manage-branches', 'manage-branch-access']);
    }

    public function test_non_members_get_404_and_suspended_companies_get_403(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->getJson("/api/v1/companies/{$this->company->public_id}")->assertNotFound();

        $this->company->forceFill(['status' => 'suspended', 'suspended_at' => now(), 'suspension_reason' => 'Testing suspension.'])->save();
        Sanctum::actingAs($this->owner);
        $this->getJson("/api/v1/companies/{$this->company->public_id}")->assertForbidden()->assertJsonPath('code', 'COMPANY_SUSPENDED');
    }

    public function test_owner_and_admin_can_edit_profile_and_settings(): void
    {
        foreach ([$this->owner, $this->member(MembershipRole::Admin)] as $index => $user) {
            Sanctum::actingAs($user);
            $updatedAt = $this->getJson("/api/v1/companies/{$this->company->public_id}")->json('data.updated_at');

            $this->patchJson("/api/v1/companies/{$this->company->public_id}", [
                'phone' => "+62 411 00{$index}",
                'timezone' => 'Asia/Makassar',
                'currency' => 'USD',
                'updated_at' => $updatedAt,
            ])->assertOk()->assertJsonPath('data.phone', "+62 411 00{$index}")->assertJsonPath('data.currency', 'USD');
        }

        $this->assertDatabaseHas('audit_logs', [
            'action' => AuditAction::CompanyUpdated->value,
            'company_id' => $this->company->id,
            'actor_id' => $this->owner->id,
        ]);
    }

    public function test_managers_and_cashiers_cannot_edit(): void
    {
        foreach ([MembershipRole::Manager, MembershipRole::Cashier] as $role) {
            Sanctum::actingAs($this->member($role));

            $this->patchJson("/api/v1/companies/{$this->company->public_id}", ['name' => 'Hacked', 'updated_at' => now()->toIso8601String()])
                ->assertForbidden();
        }

        $this->assertSame('Toko Sejahtera', $this->company->fresh()->name);
    }

    public function test_code_and_status_stay_platform_only_and_stale_edits_are_rejected(): void
    {
        Sanctum::actingAs($this->owner);
        $updatedAt = $this->getJson("/api/v1/companies/{$this->company->public_id}")->json('data.updated_at');

        $this->patchJson("/api/v1/companies/{$this->company->public_id}", ['code' => 'new-code', 'status' => 'suspended', 'updated_at' => $updatedAt])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code', 'status']);

        $this->patchJson("/api/v1/companies/{$this->company->public_id}", ['phone' => '+62 1', 'updated_at' => $updatedAt])->assertOk();
        $this->patchJson("/api/v1/companies/{$this->company->public_id}", ['phone' => '+62 2', 'updated_at' => $updatedAt])
            ->assertConflict()
            ->assertJsonPath('code', 'STALE_RECORD');
    }

    public function test_profile_lists_memberships_via_my_companies_for_superadmins_too(): void
    {
        $superadmin = User::factory()->superadmin()->create();
        Sanctum::actingAs($superadmin);

        $this->getJson('/api/v1/companies')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/v1/companies/{$this->company->public_id}")->assertNotFound();
    }
}
