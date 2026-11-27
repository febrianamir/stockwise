<?php

namespace Tests\Feature\Branch;

use App\Models\Branch;
use App\Models\Company;
use App\Models\CompanyMembership;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Database guarantees for branches that hold even when application validation is bypassed
 * (branch-management ERD; BR-1, BR-2, BM-8, AC-07).
 */
class BranchConstraintsTest extends TestCase
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

    /**
     * @return array<string, mixed>
     */
    private function row(Company $company, array $overrides = []): array
    {
        return [
            'public_id' => strtolower((string) str()->ulid()),
            'company_id' => $company->id,
            'name' => 'Raw Branch '.str()->random(6),
            'code' => 'RAW-'.strtoupper(str()->random(4)),
            ...$overrides,
        ];
    }

    public function test_an_access_row_cannot_link_a_membership_and_a_branch_of_different_companies(): void
    {
        $companyA = Company::factory()->withOwner()->create();
        $companyB = Company::factory()->withOwner()->create();
        $membershipA = CompanyMembership::factory()->for($companyA)->create();
        $branchB = Branch::factory()->for($companyB)->create();

        foreach ([$companyA, $companyB] as $company) {
            $this->assertRejected(fn () => DB::table('membership_branch_access')->insert([
                'company_id' => $company->id,
                'membership_id' => $membershipA->id,
                'branch_id' => $branchB->id,
            ]));
        }
    }

    public function test_codes_and_names_are_unique_per_company(): void
    {
        $company = Company::factory()->create();
        Branch::factory()->for($company)->create(['code' => 'MKS', 'name' => 'Makassar Store']);

        $this->assertRejected(fn () => DB::table('branches')->insert($this->row($company, ['code' => 'MKS'])));
        $this->assertRejected(fn () => DB::table('branches')->insert($this->row($company, ['name' => 'MAKASSAR STORE'])));

        DB::table('branches')->insert($this->row(Company::factory()->create(), ['code' => 'MKS', 'name' => 'Makassar Store']));
        $this->assertSame(2, Branch::query()->where('code', 'MKS')->count());
    }

    public function test_code_format_type_status_and_scope_are_checked(): void
    {
        $company = Company::factory()->create();

        $this->assertRejected(fn () => DB::table('branches')->insert($this->row($company, ['code' => 'mks'])));
        $this->assertRejected(fn () => DB::table('branches')->insert($this->row($company, ['code' => '-MKS'])));
        $this->assertRejected(fn () => DB::table('branches')->insert($this->row($company, ['type' => 'kiosk'])));
        $this->assertRejected(fn () => DB::table('branches')->insert($this->row($company, ['status' => 'closed'])));

        $membership = CompanyMembership::factory()->for($company)->create();
        $this->assertRejected(fn () => DB::table('company_memberships')->where('id', $membership->id)->update(['branch_scope' => 'some']));
    }
}
