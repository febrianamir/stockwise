<?php

namespace Tests\Feature\Admin;

use App\Enums\MembershipRole;
use App\Models\Company;
use App\Models\CompanyMembership;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Database guarantees that hold even when application validation is bypassed (CM-3, CM-8).
 */
class CompanyConstraintsTest extends TestCase
{
    use RefreshDatabase;

    private function assertRejected(callable $write): void
    {
        try {
            DB::transaction($write);
            $this->fail('The database should have rejected this write.');
        } catch (QueryException) {
            $this->addToAssertionCount(1);
        }
    }

    public function test_a_company_cannot_have_two_owners(): void
    {
        $company = Company::factory()->withOwner()->create();

        $this->assertRejected(fn () => CompanyMembership::factory()->for($company)->role(MembershipRole::Owner)->create());
    }

    public function test_codes_are_unique_case_insensitively(): void
    {
        Company::factory()->create(['code' => 'toko-sejahtera']);

        $this->assertRejected(fn () => DB::table('companies')->insert([
            'public_id' => strtolower((string) str()->ulid()),
            'name' => 'Duplicate',
            'code' => 'TOKO-SEJAHTERA',
            'timezone' => 'Asia/Jakarta',
        ]));
    }

    public function test_code_format_status_role_and_membership_status_are_checked(): void
    {
        $company = Company::factory()->create();

        $this->assertRejected(fn () => DB::table('companies')->where('id', $company->id)->update(['code' => '9bad']));
        $this->assertRejected(fn () => DB::table('companies')->where('id', $company->id)->update(['status' => 'closed']));
        // Raw inserts: the model's enum casts would reject these before the database sees them.
        $membership = fn (array $overrides): array => [
            'company_id' => $company->id,
            'user_id' => User::factory()->create()->id,
            'role' => 'cashier',
            'status' => 'active',
            ...$overrides,
        ];
        $this->assertRejected(fn () => DB::table('company_memberships')->insert($membership(['role' => 'god'])));
        $this->assertRejected(fn () => DB::table('company_memberships')->insert($membership(['status' => 'banned'])));
    }

    public function test_a_user_has_one_membership_per_company(): void
    {
        $user = User::factory()->create();
        $company = Company::factory()->create();
        CompanyMembership::factory()->for($company)->for($user)->create();

        $this->assertRejected(fn () => CompanyMembership::factory()->for($company)->for($user)->create());
    }

    public function test_ownership_can_move_inside_a_transaction(): void
    {
        $company = Company::factory()->withOwner()->create();
        $member = CompanyMembership::factory()->for($company)->create();

        DB::transaction(function () use ($company, $member): void {
            $company->ownerMembership()->update(['role' => MembershipRole::Admin]);
            $member->update(['role' => MembershipRole::Owner]);
        });

        $this->assertSame($member->id, $company->ownerMembership()->sole()->id);
    }
}
