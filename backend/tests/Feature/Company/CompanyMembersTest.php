<?php

namespace Tests\Feature\Company;

use App\Enums\AuditAction;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\CompanyMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Member management inside a company (docs/features/company-workspace/prd.md, CW-3 to CW-6).
 */
class CompanyMembersTest extends TestCase
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
        $this->base = "/api/v1/companies/{$this->company->public_id}/members";
    }

    private function member(MembershipRole $role, ?User $user = null): CompanyMembership
    {
        return CompanyMembership::factory()->for($this->company)->for($user ?? User::factory()->create())->role($role)->create();
    }

    public function test_every_member_can_list_members_owner_first(): void
    {
        $cashier = $this->member(MembershipRole::Cashier);
        Sanctum::actingAs($cashier->user);

        $this->getJson($this->base)
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.is_owner', true)
            ->assertJsonPath('data.1.id', $cashier->id);
    }

    public function test_owner_and_admin_add_existing_active_users(): void
    {
        $admin = $this->member(MembershipRole::Admin);
        $first = User::factory()->create(['email' => 'first@example.com']);
        $second = User::factory()->create(['email' => 'second@example.com']);

        Sanctum::actingAs($this->owner);
        $this->postJson($this->base, ['email' => 'FIRST@example.com', 'role' => 'cashier'])
            ->assertCreated()
            ->assertJsonPath('data.user.id', $first->id)
            ->assertJsonPath('data.role', 'cashier')
            ->assertJsonPath('data.status', 'active');

        Sanctum::actingAs($admin->user);
        $this->postJson($this->base, ['email' => 'second@example.com', 'role' => 'admin'])->assertCreated();

        $this->assertSame(MembershipRole::Admin, $this->company->memberships()->where('user_id', $second->id)->sole()->role);
        $this->assertSame(2, AuditLog::query()->where('action', AuditAction::CompanyMemberAdded)->where('company_id', $this->company->id)->count());
    }

    public function test_managers_and_cashiers_cannot_manage_members(): void
    {
        $target = $this->member(MembershipRole::Cashier);
        User::factory()->create(['email' => 'new@example.com']);

        foreach ([MembershipRole::Manager, MembershipRole::Cashier] as $role) {
            Sanctum::actingAs($this->member($role)->user);

            $this->postJson($this->base, ['email' => 'new@example.com', 'role' => 'cashier'])->assertForbidden();
            $this->patchJson("{$this->base}/{$target->id}", ['role' => 'admin'])->assertForbidden();
        }

        $this->assertSame(MembershipRole::Cashier, $target->fresh()->role);
    }

    public function test_only_active_verified_users_who_are_not_members_can_be_added(): void
    {
        User::factory()->inactive()->create(['email' => 'inactive@example.com']);
        User::factory()->unverified()->create(['email' => 'pending@example.com']);
        $existing = $this->member(MembershipRole::Cashier);
        $deactivated = $this->member(MembershipRole::Cashier);
        $deactivated->update(['status' => MembershipStatus::Inactive]);
        Sanctum::actingAs($this->owner);

        foreach (['nobody@example.com', 'inactive@example.com', 'pending@example.com'] as $email) {
            $this->postJson($this->base, ['email' => $email, 'role' => 'cashier'])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['email' => 'No active Stockwise account uses this email. Ask them to register and verify their email first.']);
        }

        $this->postJson($this->base, ['email' => $existing->user->email, 'role' => 'cashier'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'This user is already a member of this company.']);

        $this->postJson($this->base, ['email' => $deactivated->user->email, 'role' => 'cashier'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'This user is a deactivated member. Reactivate them from the member list instead.']);
    }

    public function test_the_owner_role_cannot_be_assigned(): void
    {
        $member = $this->member(MembershipRole::Cashier);
        User::factory()->create(['email' => 'new@example.com']);
        Sanctum::actingAs($this->owner);

        $this->postJson($this->base, ['email' => 'new@example.com', 'role' => 'owner'])->assertUnprocessable()->assertJsonValidationErrors('role');
        $this->patchJson("{$this->base}/{$member->id}", ['role' => 'owner'])->assertUnprocessable()->assertJsonValidationErrors('role');
    }

    public function test_change_role_and_deactivate_then_reactivate(): void
    {
        $member = $this->member(MembershipRole::Cashier);
        Sanctum::actingAs($this->owner);

        $this->patchJson("{$this->base}/{$member->id}", ['role' => 'manager'])->assertOk()->assertJsonPath('data.role', 'manager');
        $this->patchJson("{$this->base}/{$member->id}", ['status' => 'inactive'])->assertOk()->assertJsonPath('data.status', 'inactive');

        // A deactivated member loses access on the next request (MB-4).
        Sanctum::actingAs($member->user);
        $this->getJson("/api/v1/companies/{$this->company->public_id}")->assertNotFound();
        $this->getJson('/api/v1/companies')->assertJsonCount(0, 'data');

        Sanctum::actingAs($this->owner);
        $this->patchJson("{$this->base}/{$member->id}", ['status' => 'active'])->assertOk()->assertJsonPath('data.status', 'active');

        $actions = AuditLog::query()->where('company_id', $this->company->id)->orderBy('id')->pluck('action')->map->value->all();
        $this->assertSame(['company.member_role_changed', 'company.member_deactivated', 'company.member_reactivated'], $actions);

        // The platform activity names the member each entry is about.
        Sanctum::actingAs(User::factory()->superadmin()->create());
        $this->getJson("/api/v1/admin/companies/{$this->company->public_id}/activity")
            ->assertJsonPath('data.0.action', 'company.member_reactivated')
            ->assertJsonPath('data.0.member.id', $member->user_id)
            ->assertJsonPath('data.0.member.name', $member->user->name);
    }

    public function test_the_owner_and_yourself_cannot_be_changed(): void
    {
        $admin = $this->member(MembershipRole::Admin);
        $ownerMembership = $this->company->ownerMembership()->sole();
        Sanctum::actingAs($admin->user);

        $this->patchJson("{$this->base}/{$ownerMembership->id}", ['status' => 'inactive'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('membership');
        $this->patchJson("{$this->base}/{$admin->id}", ['role' => 'cashier'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['membership' => "You can't change your own membership."]);

        $this->assertSame(MembershipRole::Owner, $ownerMembership->fresh()->role);
        $this->assertSame(MembershipRole::Admin, $admin->fresh()->role);
    }

    public function test_memberships_from_another_company_are_not_found(): void
    {
        $other = CompanyMembership::factory()->for(Company::factory()->withOwner())->create();
        Sanctum::actingAs($this->owner);

        $this->patchJson("{$this->base}/{$other->id}", ['role' => 'admin'])->assertNotFound();
        $this->assertSame(MembershipRole::Cashier, $other->fresh()->role);
    }

    public function test_update_needs_a_role_or_status(): void
    {
        $member = $this->member(MembershipRole::Cashier);
        Sanctum::actingAs($this->owner);

        $this->patchJson("{$this->base}/{$member->id}", [])->assertUnprocessable()->assertJsonValidationErrors(['role', 'status']);
    }
}
