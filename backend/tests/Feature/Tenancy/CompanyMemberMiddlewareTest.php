<?php

namespace Tests\Feature\Tenancy;

use App\Models\Company;
use App\Models\CompanyMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * The tenant gate every company-scoped module inherits (docs/architecture/tenancy.md, CM-5, CM-6, CM-15).
 */
class CompanyMemberMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware(['api', 'auth:sanctum', 'verified', 'company.member'])
            ->get('/api/v1/companies/{company}/test-probe/{item}', fn (Request $request, string $item) => [
                'company' => $request->attributes->get('company')->public_id,
                'role' => $request->attributes->get('membership')->role->value,
                'item' => $item,
            ]);
    }

    private function probe(string $token, Company $company): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($token)->getJson("/api/v1/companies/{$company->public_id}/test-probe/abc");
    }

    public function test_active_members_reach_company_routes_with_the_company_resolved(): void
    {
        $owner = User::factory()->create();
        $company = Company::factory()->withOwner($owner)->create();

        $this->probe($owner->createToken('web')->plainTextToken, $company)
            ->assertOk()
            ->assertExactJson(['company' => $company->public_id, 'role' => 'owner', 'item' => 'abc']);
    }

    public function test_members_of_a_suspended_company_get_403_company_suspended(): void
    {
        $owner = User::factory()->create();
        $company = Company::factory()->withOwner($owner)->suspended()->create();
        $cashier = CompanyMembership::factory()->for($company)->create();

        foreach ([$owner, $cashier->user] as $user) {
            $this->probe($user->createToken('web')->plainTextToken, $company)
                ->assertForbidden()
                ->assertJsonPath('code', 'COMPANY_SUSPENDED');
        }
    }

    public function test_non_members_inactive_members_and_superadmins_get_404(): void
    {
        $company = Company::factory()->withOwner()->create();
        $inactive = CompanyMembership::factory()->for($company)->inactive()->create();

        foreach ([User::factory()->create(), $inactive->user, User::factory()->superadmin()->create()] as $user) {
            $this->probe($user->createToken('web')->plainTextToken, $company)->assertNotFound();
        }

        $this->app['auth']->forgetGuards();
        $this->withToken(User::factory()->create()->createToken('web')->plainTextToken)
            ->getJson('/api/v1/companies/01jdx3y5t6m8q2w4e7r9t1y3v5/test-probe/abc')
            ->assertNotFound();
    }

    public function test_suspending_one_company_does_not_affect_the_users_other_companies(): void
    {
        $user = User::factory()->create();
        $companyA = Company::factory()->withOwner($user)->create();
        $companyB = Company::factory()->withOwner()->create();
        CompanyMembership::factory()->for($companyB)->for($user)->create();
        $token = $user->createToken('web')->plainTextToken;

        $companyA->forceFill(['status' => 'suspended', 'suspended_at' => now(), 'suspension_reason' => 'Testing isolation.'])->save();

        $this->probe($token, $companyA)->assertForbidden()->assertJsonPath('code', 'COMPANY_SUSPENDED');
        $this->probe($token, $companyB)->assertOk()->assertJsonPath('role', 'cashier');

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/user')->assertOk();
    }

    public function test_guests_and_unverified_users_are_stopped_before_the_tenant_check(): void
    {
        $company = Company::factory()->withOwner()->create();
        $unverified = User::factory()->unverified()->create();
        CompanyMembership::factory()->for($company)->for($unverified)->create();

        $this->getJson("/api/v1/companies/{$company->public_id}/test-probe/abc")->assertUnauthorized();
        $this->probe($unverified->createToken('web')->plainTextToken, $company)->assertForbidden()->assertJsonMissingPath('code');
    }
}
