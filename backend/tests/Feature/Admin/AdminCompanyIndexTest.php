<?php

namespace Tests\Feature\Admin;

use App\Enums\MembershipRole;
use App\Models\Company;
use App\Models\CompanyMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AdminCompanyIndexTest extends TestCase
{
    use RefreshDatabase;

    private const ULID = '01jdx3y5t6m8q2w4e7r9t1y3v5';

    private User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superadmin = User::factory()->superadmin()->create();
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function companyEndpoints(): array
    {
        return [
            'list' => ['GET', '/api/v1/admin/companies'],
            'stats' => ['GET', '/api/v1/admin/companies/stats'],
            'create' => ['POST', '/api/v1/admin/companies'],
            'show' => ['GET', '/api/v1/admin/companies/'.self::ULID],
            'update' => ['PATCH', '/api/v1/admin/companies/'.self::ULID],
            'suspend' => ['POST', '/api/v1/admin/companies/'.self::ULID.'/suspend'],
            'reactivate' => ['POST', '/api/v1/admin/companies/'.self::ULID.'/reactivate'],
            'transfer' => ['POST', '/api/v1/admin/companies/'.self::ULID.'/transfer-ownership'],
            'members' => ['GET', '/api/v1/admin/companies/'.self::ULID.'/members'],
            'activity' => ['GET', '/api/v1/admin/companies/'.self::ULID.'/activity'],
        ];
    }

    #[DataProvider('companyEndpoints')]
    public function test_guests_get_401(string $method, string $uri): void
    {
        $this->json($method, $uri)->assertUnauthorized();
    }

    #[DataProvider('companyEndpoints')]
    public function test_regular_users_get_403(string $method, string $uri): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->json($method, $uri)->assertForbidden();
    }

    #[DataProvider('companyEndpoints')]
    public function test_company_owners_get_403_with_no_data(string $method, string $uri): void
    {
        $owner = User::factory()->create();
        Company::factory()->withOwner($owner)->create();
        Sanctum::actingAs($owner);

        $this->json($method, $uri)->assertForbidden()->assertJsonMissingPath('data');
    }

    public function test_superadmin_lists_companies_from_all_tenants_with_owner_and_member_count(): void
    {
        $owner = User::factory()->create(['name' => 'Andi', 'email' => 'andi@example.com']);
        $company = Company::factory()->withOwner($owner)->create(['name' => 'Toko Sejahtera', 'code' => 'toko-sejahtera']);
        CompanyMembership::factory()->for($company)->create();
        CompanyMembership::factory()->for($company)->inactive()->create();
        Company::factory()->withOwner()->count(2)->create();
        Sanctum::actingAs($this->superadmin);

        $response = $this->getJson('/api/v1/admin/companies?search=toko-sejahtera')->assertOk();

        $response->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $company->public_id)
            ->assertJsonPath('data.0.code', 'toko-sejahtera')
            ->assertJsonPath('data.0.status', 'active')
            ->assertJsonPath('data.0.owner.email', 'andi@example.com')
            ->assertJsonPath('data.0.members_count', 2);

        $this->getJson('/api/v1/admin/companies')->assertJsonPath('meta.total', 3);
    }

    public function test_search_covers_name_code_legal_name_email_and_owner_email_case_insensitively(): void
    {
        $owner = User::factory()->create(['email' => 'pemilik@sejahtera.test']);
        $company = Company::factory()->withOwner($owner)->create([
            'name' => 'Toko Sejahtera',
            'code' => 'toko-sejahtera',
            'legal_name' => 'PT Makmur Abadi',
            'email' => 'kontak@sejahtera.test',
        ]);
        Company::factory()->withOwner()->create(['name' => 'Other Shop', 'code' => 'other-shop', 'legal_name' => 'PT Lain', 'email' => 'x@lain.test']);
        Sanctum::actingAs($this->superadmin);

        foreach (['SEJAHTERA', 'toko-sej', 'makmur', 'KONTAK@', 'pemilik@sejahtera'] as $term) {
            $this->getJson('/api/v1/admin/companies?search='.urlencode($term))
                ->assertJsonCount(1, 'data')
                ->assertJsonPath('data.0.id', $company->public_id);
        }

        $this->getJson('/api/v1/admin/companies?search=%25')->assertJsonCount(0, 'data');
    }

    public function test_filters_by_status_and_created_date(): void
    {
        $suspended = Company::factory()->withOwner()->suspended()->create(['created_at' => '2026-03-10 10:00:00']);
        Company::factory()->withOwner()->create(['created_at' => '2026-05-01 10:00:00']);
        Sanctum::actingAs($this->superadmin);

        $this->getJson('/api/v1/admin/companies?status=suspended')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $suspended->public_id);
        $this->getJson('/api/v1/admin/companies?created_from=2026-03-01&created_to=2026-03-31')->assertJsonCount(1, 'data');
    }

    public function test_sorts_by_name_and_created_date(): void
    {
        $beta = Company::factory()->withOwner()->create(['name' => 'beta', 'created_at' => now()->subDays(2)]);
        $alpha = Company::factory()->withOwner()->create(['name' => 'Alpha', 'created_at' => now()->subDay()]);
        Sanctum::actingAs($this->superadmin);

        $ids = fn (string $query): array => array_column($this->getJson('/api/v1/admin/companies?'.$query)->json('data'), 'id');

        $this->assertSame([$alpha->public_id, $beta->public_id], $ids('sort=name&direction=asc'));
        $this->assertSame([$alpha->public_id, $beta->public_id], $ids(''));
        $this->assertSame([$beta->public_id, $alpha->public_id], $ids('sort=created_at&direction=asc'));
    }

    public function test_invalid_list_parameters_are_rejected(): void
    {
        Sanctum::actingAs($this->superadmin);

        $this->getJson('/api/v1/admin/companies?sort=code&status=closed&per_page=500')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sort', 'status', 'per_page']);
    }

    public function test_stats_count_companies_by_status(): void
    {
        Company::factory()->withOwner()->count(2)->create();
        Company::factory()->withOwner()->suspended()->create();
        Sanctum::actingAs($this->superadmin);

        $this->getJson('/api/v1/admin/companies/stats')
            ->assertOk()
            ->assertExactJson(['data' => ['total' => 3, 'active' => 2, 'suspended' => 1]]);
    }

    public function test_members_are_listed_owner_first_with_account_status(): void
    {
        $owner = User::factory()->create(['name' => 'Owner']);
        $company = Company::factory()->withOwner($owner)->create();
        $this->travel(1)->minute();
        $cashier = CompanyMembership::factory()->for($company)->for(User::factory()->inactive())->create();
        Sanctum::actingAs($this->superadmin);

        $this->getJson("/api/v1/admin/companies/{$company->public_id}/members")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.is_owner', true)
            ->assertJsonPath('data.0.role', MembershipRole::Owner->value)
            ->assertJsonPath('data.0.user.name', 'Owner')
            ->assertJsonPath('data.1.id', $cashier->id)
            ->assertJsonPath('data.1.user.status', 'inactive');
    }

    public function test_members_can_be_searched_and_filtered_to_eligible_owners(): void
    {
        $company = Company::factory()->withOwner()->create();
        $eligible = CompanyMembership::factory()->for($company)->for(User::factory()->create(['name' => 'Rina Putri']))->create();
        CompanyMembership::factory()->for($company)->for(User::factory()->create(['name' => 'Rina Inactive']))->inactive()->create();
        CompanyMembership::factory()->for($company)->for(User::factory()->inactive()->create(['name' => 'Rina Deactivated']))->create();
        CompanyMembership::factory()->for($company)->for(User::factory()->create(['name' => 'Budi']))->create();
        Sanctum::actingAs($this->superadmin);

        $this->getJson("/api/v1/admin/companies/{$company->public_id}/members?search=rina")->assertJsonCount(3, 'data');
        $this->getJson("/api/v1/admin/companies/{$company->public_id}/members?search=rina&eligible_owner=1")
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $eligible->id);
        $this->getJson("/api/v1/admin/companies/{$company->public_id}/members?eligible_owner=1")->assertJsonCount(2, 'data');
    }

    public function test_unknown_company_returns_404_for_superadmin(): void
    {
        Sanctum::actingAs($this->superadmin);

        $this->getJson('/api/v1/admin/companies/'.self::ULID)->assertNotFound();
    }
}
