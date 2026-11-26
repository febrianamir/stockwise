<?php

namespace Tests\Feature\Admin;

use App\Enums\AuditAction;
use App\Enums\CompanyStatus;
use App\Enums\MembershipRole;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\CompanyMembership;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class AdminCompanyManageTest extends TestCase
{
    use RefreshDatabase;

    private User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superadmin = User::factory()->superadmin()->create();
        Sanctum::actingAs($this->superadmin);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Toko Sejahtera',
            'code' => 'toko-sejahtera',
            'legal_name' => 'PT Sejahtera Makmur',
            'email' => 'admin@sejahtera.co.id',
            'phone' => '+62 411 000000',
            'address' => 'Jl. Example No. 1, Makassar',
            'timezone' => 'Asia/Makassar',
            'currency' => 'IDR',
        ], $overrides);
    }

    // Create

    public function test_superadmin_creates_a_company_with_its_owner(): void
    {
        $owner = User::factory()->create();

        $response = $this->postJson('/api/v1/admin/companies', [...$this->payload(), 'owner_user_id' => $owner->id]);

        $response->assertCreated()
            ->assertJsonPath('data.code', 'toko-sejahtera')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.owner.id', $owner->id)
            ->assertJsonPath('data.owner_is_active', true)
            ->assertJsonPath('data.members_count', 1)
            ->assertJsonPath('data.created_by.id', $this->superadmin->id);

        $company = Company::query()->sole();
        $this->assertSame($response->json('data.id'), $company->public_id);
        $this->assertSame(26, strlen($company->public_id));
        $this->assertSame(1, $company->memberships()->where('role', MembershipRole::Owner)->where('user_id', $owner->id)->count());
        $this->assertDatabaseHas('audit_logs', [
            'action' => AuditAction::CompanyCreated->value,
            'company_id' => $company->id,
            'actor_id' => $this->superadmin->id,
        ]);
    }

    public function test_code_is_lowercased_and_currency_uppercased(): void
    {
        $owner = User::factory()->create();

        $this->postJson('/api/v1/admin/companies', [...$this->payload(['code' => 'Toko-Baru', 'currency' => 'idr']), 'owner_user_id' => $owner->id])
            ->assertCreated()
            ->assertJsonPath('data.code', 'toko-baru')
            ->assertJsonPath('data.currency', 'IDR');
    }

    public function test_inactive_or_unverified_owner_is_rejected_and_nothing_is_persisted(): void
    {
        foreach ([User::factory()->inactive()->create(), User::factory()->unverified()->create()] as $owner) {
            $this->postJson('/api/v1/admin/companies', [...$this->payload(), 'owner_user_id' => $owner->id])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('owner_user_id');
        }

        $this->postJson('/api/v1/admin/companies', [...$this->payload(), 'owner_user_id' => 999999])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('owner_user_id');

        $this->assertDatabaseCount('companies', 0);
        $this->assertDatabaseCount('company_memberships', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_duplicate_code_in_any_case_is_rejected(): void
    {
        Company::factory()->withOwner()->create(['code' => 'toko-sejahtera']);

        $this->postJson('/api/v1/admin/companies', [...$this->payload(['code' => 'TOKO-Sejahtera']), 'owner_user_id' => User::factory()->create()->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code' => 'Another company already uses this code.']);
    }

    public function test_create_validates_field_boundaries(): void
    {
        $owner = User::factory()->create();

        $this->postJson('/api/v1/admin/companies', [
            'name' => 'A',
            'code' => '1ab',
            'email' => 'not-an-email',
            'phone' => str_repeat('1', 31),
            'address' => str_repeat('a', 501),
            'legal_name' => str_repeat('a', 201),
            'tax_id' => str_repeat('a', 51),
            'timezone' => 'Mars/Olympus',
            'currency' => 'XXX',
            'owner_user_id' => $owner->id,
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'name', 'code', 'email', 'phone', 'address', 'legal_name', 'tax_id', 'timezone', 'currency',
        ]);

        $this->postJson('/api/v1/admin/companies', [...$this->payload(['name' => str_repeat('a', 151), 'code' => 'ab']), 'owner_user_id' => $owner->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'code']);

        $this->postJson('/api/v1/admin/companies', [...$this->payload(['name' => 'AB', 'code' => 'abc']), 'owner_user_id' => $owner->id])
            ->assertCreated();
    }

    public function test_create_rolls_back_when_the_audit_write_fails(): void
    {
        $owner = User::factory()->create();
        $this->app->instance(AuditLogger::class, new class extends AuditLogger
        {
            public function record(AuditAction $action, ...$arguments): AuditLog
            {
                throw new RuntimeException('Audit storage unavailable.');
            }
        });
        $this->withoutExceptionHandling();

        try {
            $this->postJson('/api/v1/admin/companies', [...$this->payload(), 'owner_user_id' => $owner->id]);
            $this->fail('The audit failure should surface.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Audit storage unavailable.', $exception->getMessage());
        }

        $this->assertDatabaseCount('companies', 0);
        $this->assertDatabaseCount('company_memberships', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    // Edit

    public function test_edit_changes_and_audits_only_changed_fields(): void
    {
        $company = Company::factory()->withOwner()->create(['name' => 'Old Name', 'phone' => '+62 1', 'timezone' => 'Asia/Makassar']);

        $this->patchJson("/api/v1/admin/companies/{$company->public_id}", [
            'name' => 'New Name',
            'phone' => '+62 2',
            'timezone' => 'Asia/Makassar',
            'updated_at' => $company->updated_at->format('Y-m-d\TH:i:s.uP'),
        ])->assertOk()->assertJsonPath('data.name', 'New Name')->assertJsonPath('data.phone', '+62 2');

        $log = AuditLog::query()->where('action', AuditAction::CompanyUpdated)->sole();
        // jsonb doesn't keep key order, so compare without it.
        $this->assertEquals([
            'name' => ['from' => 'Old Name', 'to' => 'New Name'],
            'phone' => ['from' => '+62 1', 'to' => '+62 2'],
        ], $log->metadata['changes']);
        $this->assertSame($company->id, $log->company_id);
    }

    public function test_edit_with_no_changes_writes_nothing(): void
    {
        $company = Company::factory()->withOwner()->create(['name' => 'Same']);
        $updatedAt = $company->updated_at->format('Y-m-d\TH:i:s.uP');

        $this->patchJson("/api/v1/admin/companies/{$company->public_id}", ['name' => 'Same', 'updated_at' => $updatedAt])
            ->assertOk()
            ->assertJsonPath('data.updated_at', $updatedAt);

        $this->assertDatabaseMissing('audit_logs', ['action' => AuditAction::CompanyUpdated->value]);
    }

    public function test_code_and_status_cannot_be_edited(): void
    {
        $company = Company::factory()->withOwner()->create(['code' => 'fixed-code']);

        $this->patchJson("/api/v1/admin/companies/{$company->public_id}", [
            'code' => 'new-code',
            'status' => 'suspended',
            'updated_at' => $company->updated_at->format('Y-m-d\TH:i:s.uP'),
        ])->assertUnprocessable()->assertJsonValidationErrors(['code' => "The company code can't be changed.", 'status']);

        $this->assertSame('fixed-code', $company->fresh()->code);
        $this->assertSame(CompanyStatus::Active, $company->fresh()->status);
    }

    public function test_stale_edit_returns_409_and_changes_nothing(): void
    {
        $company = Company::factory()->withOwner()->create(['name' => 'Original']);
        $loadedAt = $company->updated_at->format('Y-m-d\TH:i:s.uP');
        $this->travel(1)->minute();
        $company->update(['phone' => '+62 999']);

        $this->patchJson("/api/v1/admin/companies/{$company->public_id}", ['name' => 'Mine', 'updated_at' => $loadedAt])
            ->assertConflict()
            ->assertJsonPath('code', 'STALE_RECORD');

        $this->assertSame('Original', $company->fresh()->name);
    }

    public function test_stale_edit_is_detected_within_the_same_second(): void
    {
        $company = Company::factory()->withOwner()->create(['name' => 'Original']);
        $loaded = $this->getJson("/api/v1/admin/companies/{$company->public_id}")->json('data.updated_at');

        $this->patchJson("/api/v1/admin/companies/{$company->public_id}", ['phone' => '+62 1', 'updated_at' => $loaded])->assertOk();
        $this->patchJson("/api/v1/admin/companies/{$company->public_id}", ['name' => 'Mine', 'updated_at' => $loaded])
            ->assertConflict()
            ->assertJsonPath('code', 'STALE_RECORD');

        $this->assertSame('Original', $company->fresh()->name);
    }

    // Suspend and reactivate

    public function test_suspend_requires_a_reason_of_10_to_500_characters(): void
    {
        $company = Company::factory()->withOwner()->create();

        $this->postJson("/api/v1/admin/companies/{$company->public_id}/suspend", [])->assertUnprocessable()->assertJsonValidationErrors('reason');
        $this->postJson("/api/v1/admin/companies/{$company->public_id}/suspend", ['reason' => 'too short'])->assertUnprocessable();
        $this->postJson("/api/v1/admin/companies/{$company->public_id}/suspend", ['reason' => str_repeat('a', 501)])->assertUnprocessable();

        $this->assertSame(CompanyStatus::Active, $company->fresh()->status);
    }

    public function test_suspend_and_reactivate_leave_memberships_untouched(): void
    {
        $company = Company::factory()->withOwner()->create();
        CompanyMembership::factory()->for($company)->create();
        $membershipsBefore = $company->memberships()->orderBy('id')->get(['id', 'user_id', 'role', 'status'])->toArray();

        $this->postJson("/api/v1/admin/companies/{$company->public_id}/suspend", ['reason' => 'Unpaid invoices for three months.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'suspended')
            ->assertJsonPath('data.suspension_reason', 'Unpaid invoices for three months.');

        $suspended = AuditLog::query()->where('action', AuditAction::CompanySuspended)->sole();
        $this->assertSame('Unpaid invoices for three months.', $suspended->metadata['reason']);

        $this->postJson("/api/v1/admin/companies/{$company->public_id}/reactivate", ['note' => 'Invoices settled.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.suspended_at', null)
            ->assertJsonPath('data.suspension_reason', null);

        $reactivated = AuditLog::query()->where('action', AuditAction::CompanyReactivated)->sole();
        $this->assertEquals(['note' => 'Invoices settled.', 'previous_reason' => 'Unpaid invoices for three months.'], $reactivated->metadata);
        $this->assertSame($membershipsBefore, $company->memberships()->orderBy('id')->get(['id', 'user_id', 'role', 'status'])->toArray());
    }

    public function test_invalid_status_transitions_return_409_without_audit(): void
    {
        $suspended = Company::factory()->withOwner()->suspended()->create();
        $active = Company::factory()->withOwner()->create();

        $this->postJson("/api/v1/admin/companies/{$suspended->public_id}/suspend", ['reason' => 'Suspending it a second time.'])
            ->assertConflict()
            ->assertJsonPath('code', 'INVALID_STATUS_TRANSITION');

        $this->postJson("/api/v1/admin/companies/{$active->public_id}/reactivate")
            ->assertConflict()
            ->assertJsonPath('code', 'INVALID_STATUS_TRANSITION');

        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_suspending_twice_records_one_change(): void
    {
        $company = Company::factory()->withOwner()->create();

        $this->postJson("/api/v1/admin/companies/{$company->public_id}/suspend", ['reason' => 'First suspension request.'])->assertOk();
        $this->postJson("/api/v1/admin/companies/{$company->public_id}/suspend", ['reason' => 'Second suspension request.'])->assertConflict();

        $this->assertSame(1, AuditLog::query()->where('action', AuditAction::CompanySuspended)->count());
        $this->assertSame('First suspension request.', $company->fresh()->suspension_reason);
    }

    // Ownership

    public function test_ownership_transfer_swaps_roles_and_is_audited(): void
    {
        $oldOwner = User::factory()->create();
        $company = Company::factory()->withOwner($oldOwner)->create();
        $member = CompanyMembership::factory()->for($company)->role(MembershipRole::Manager)->create();

        $this->postJson("/api/v1/admin/companies/{$company->public_id}/transfer-ownership", [
            'user_id' => $member->user_id,
            'reason' => 'The founder left the business.',
        ])->assertOk()->assertJsonPath('data.owner.id', $member->user_id);

        $this->assertSame(MembershipRole::Owner, $member->fresh()->role);
        $this->assertSame(MembershipRole::Admin, $company->memberships()->where('user_id', $oldOwner->id)->sole()->role);
        $this->assertSame(1, $company->memberships()->where('role', MembershipRole::Owner)->count());

        $log = AuditLog::query()->where('action', AuditAction::CompanyOwnershipTransferred)->sole();
        $this->assertSame($oldOwner->id, $log->metadata['previous_owner_id']);
        $this->assertSame($member->user_id, $log->metadata['new_owner_id']);
        $this->assertSame('The founder left the business.', $log->metadata['reason']);
    }

    public function test_ownership_transfer_rejects_ineligible_targets(): void
    {
        $owner = User::factory()->create();
        $company = Company::factory()->withOwner($owner)->create();
        $inactiveMember = CompanyMembership::factory()->for($company)->inactive()->create();
        $inactiveAccount = CompanyMembership::factory()->for($company)->for(User::factory()->inactive())->create();
        $outsider = User::factory()->create();
        $reason = 'Ownership change requested by the business.';

        foreach ([$outsider->id, $inactiveMember->user_id, $inactiveAccount->user_id, $owner->id] as $userId) {
            $this->postJson("/api/v1/admin/companies/{$company->public_id}/transfer-ownership", ['user_id' => $userId, 'reason' => $reason])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('user_id');
        }

        $this->postJson("/api/v1/admin/companies/{$company->public_id}/transfer-ownership", ['user_id' => $inactiveMember->user_id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reason');

        $this->assertSame($owner->id, $company->ownerMembership()->sole()->user_id);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    // Activity and details

    public function test_activity_lists_company_audit_entries_newest_first(): void
    {
        $owner = User::factory()->create();
        $this->postJson('/api/v1/admin/companies', [...$this->payload(), 'owner_user_id' => $owner->id])->assertCreated();
        $company = Company::query()->sole();
        $this->travel(1)->minute();
        $this->postJson("/api/v1/admin/companies/{$company->public_id}/suspend", ['reason' => 'Fraud investigation pending.'])->assertOk();

        $this->getJson("/api/v1/admin/companies/{$company->public_id}/activity")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.action', 'company.suspended')
            ->assertJsonPath('data.0.metadata.reason', 'Fraud investigation pending.')
            ->assertJsonPath('data.0.actor.id', $this->superadmin->id)
            ->assertJsonPath('data.1.action', 'company.created');
    }

    public function test_show_flags_an_inactive_owner(): void
    {
        $owner = User::factory()->create();
        $company = Company::factory()->withOwner($owner)->create();
        $owner->forceFill(['status' => 'inactive'])->save();

        $this->getJson("/api/v1/admin/companies/{$company->public_id}")
            ->assertOk()
            ->assertJsonPath('data.owner_is_active', false);
    }

    // User management integration (MB-5, CM-14)

    public function test_company_owner_cannot_be_deactivated(): void
    {
        $owner = User::factory()->create();
        Company::factory()->withOwner($owner)->create(['name' => 'Toko Sejahtera']);

        $this->postJson("/api/v1/admin/users/{$owner->id}/deactivate")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['user' => 'This user owns Toko Sejahtera. Transfer ownership before deactivating them.']);

        $this->assertTrue($owner->fresh()->isActive());
    }

    public function test_user_list_shows_company_counts_and_filters_by_membership(): void
    {
        $member = User::factory()->create(['email' => 'member@example.com']);
        $company = Company::factory()->withOwner()->create();
        CompanyMembership::factory()->for($company)->for($member)->create();
        User::factory()->create(['email' => 'loner@example.com']);

        $members = $this->getJson('/api/v1/admin/users?company=has')->assertOk()->json('data');
        $this->assertContains('member@example.com', array_column($members, 'email'));
        $this->assertNotContains('loner@example.com', array_column($members, 'email'));

        $loners = $this->getJson('/api/v1/admin/users?company=none')->json('data');
        $this->assertContains('loner@example.com', array_column($loners, 'email'));
        $this->assertNotContains('member@example.com', array_column($loners, 'email'));

        $this->getJson('/api/v1/admin/users?search=member@example.com')->assertJsonPath('data.0.companies_count', 1);
    }

    public function test_user_details_list_company_memberships(): void
    {
        $member = User::factory()->create();
        $company = Company::factory()->withOwner()->create(['name' => 'Toko Sejahtera', 'code' => 'toko-sejahtera']);
        CompanyMembership::factory()->for($company)->for($member)->role(MembershipRole::Manager)->create();

        $this->getJson("/api/v1/admin/users/{$member->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data.memberships')
            ->assertJsonPath('data.memberships.0.company.id', $company->public_id)
            ->assertJsonPath('data.memberships.0.company.code', 'toko-sejahtera')
            ->assertJsonPath('data.memberships.0.role', 'manager')
            ->assertJsonPath('data.memberships.0.is_owner', false);
    }
}
