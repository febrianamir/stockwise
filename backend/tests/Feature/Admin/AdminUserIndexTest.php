<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AdminUserIndexTest extends TestCase
{
    use RefreshDatabase;

    private User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superadmin = User::factory()->superadmin()->create([
            'name' => 'Platform Admin',
            'email' => 'admin@stockwise.test',
            'created_at' => now()->subYear(),
        ]);
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function adminEndpoints(): array
    {
        return [
            'list' => ['GET', '/api/v1/admin/users'],
            'stats' => ['GET', '/api/v1/admin/users/stats'],
            'show' => ['GET', '/api/v1/admin/users/1'],
            'show unknown' => ['GET', '/api/v1/admin/users/999999'],
            'create' => ['POST', '/api/v1/admin/users'],
            'deactivate' => ['POST', '/api/v1/admin/users/1/deactivate'],
            'reactivate' => ['POST', '/api/v1/admin/users/1/reactivate'],
            'superadmin' => ['PUT', '/api/v1/admin/users/1/superadmin'],
        ];
    }

    #[DataProvider('adminEndpoints')]
    public function test_guests_get_401(string $method, string $uri): void
    {
        $this->json($method, $uri)->assertUnauthorized();
    }

    #[DataProvider('adminEndpoints')]
    public function test_normal_users_get_403_without_learning_whether_users_exist(string $method, string $uri): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->json($method, $uri)->assertForbidden();
    }

    public function test_unverified_or_inactive_superadmins_get_403(): void
    {
        Sanctum::actingAs(User::factory()->superadmin()->unverified()->create());
        $this->getJson('/api/v1/admin/users')->assertForbidden();

        Sanctum::actingAs(User::factory()->superadmin()->inactive()->create());
        $this->getJson('/api/v1/admin/users')->assertForbidden();
    }

    public function test_superadmin_lists_users_with_pagination_meta(): void
    {
        User::factory()->count(30)->create();
        Sanctum::actingAs($this->superadmin);

        $this->getJson('/api/v1/admin/users?per_page=10&page=2')
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.total', 31)
            ->assertJsonStructure(['data' => [['id', 'name', 'email', 'status', 'is_superadmin', 'email_verified_at', 'last_login_at', 'created_at', 'updated_at']], 'links', 'meta'])
            ->assertJsonMissingPath('data.0.password');
    }

    public function test_search_matches_partial_name_email_case_insensitively_and_exact_id(): void
    {
        $febrian = User::factory()->create(['name' => 'Febrian Amir', 'email' => 'febrian@example.com']);
        User::factory()->create(['name' => 'Alice Johnson', 'email' => 'alice@example.com']);
        Sanctum::actingAs($this->superadmin);

        $this->getJson('/api/v1/admin/users?search=febri')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $febrian->id);
        $this->getJson('/api/v1/admin/users?search=FEBRIAN@EXAMPLE')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $febrian->id);
        $this->getJson('/api/v1/admin/users?search='.$febrian->id)->assertJsonPath('data.0.id', $febrian->id);
        $this->getJson('/api/v1/admin/users?search=nobody-matches')->assertJsonCount(0, 'data');
    }

    public function test_search_treats_wildcards_literally(): void
    {
        User::factory()->create(['name' => 'Plain Name']);
        Sanctum::actingAs($this->superadmin);

        $this->getJson('/api/v1/admin/users?search=%25')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/admin/users?search=_')->assertJsonCount(0, 'data');
    }

    public function test_filters_by_status_verification_and_registration_date(): void
    {
        $pending = User::factory()->unverified()->create(['created_at' => '2026-03-10 10:00:00']);
        $inactive = User::factory()->inactive()->create(['created_at' => '2026-03-20 23:59:00']);
        User::factory()->create(['created_at' => '2026-05-01 00:00:00']);
        Sanctum::actingAs($this->superadmin);

        $this->getJson('/api/v1/admin/users?status=pending')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $pending->id);
        $this->getJson('/api/v1/admin/users?status=inactive')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $inactive->id);
        $this->getJson('/api/v1/admin/users?verification=unverified')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $pending->id);
        $this->getJson('/api/v1/admin/users?verification=verified')->assertJsonCount(3, 'data');
        $this->getJson('/api/v1/admin/users?created_from=2026-03-01&created_to=2026-03-20')
            ->assertJsonCount(2, 'data');
    }

    public function test_sorts_by_name_registration_date_and_last_login_with_nulls_last(): void
    {
        $bob = User::factory()->create(['name' => 'Bob', 'created_at' => now()->subDays(2), 'last_login_at' => now()->subHour()]);
        $alice = User::factory()->create(['name' => 'Alice', 'created_at' => now()->subDay(), 'last_login_at' => now()->subDays(3)]);
        $this->superadmin->update(['name' => 'Zed']);
        Sanctum::actingAs($this->superadmin);

        $ids = fn (string $query): array => array_column($this->getJson('/api/v1/admin/users?'.$query)->json('data'), 'id');

        $this->assertSame([$alice->id, $bob->id, $this->superadmin->id], $ids('sort=name&direction=asc'));
        $this->assertSame([$this->superadmin->id, $bob->id, $alice->id], $ids('sort=name&direction=desc'));
        $this->assertSame([$alice->id, $bob->id, $this->superadmin->id], $ids('sort=created_at&direction=desc'));
        $this->assertSame([$this->superadmin->id, $bob->id, $alice->id], $ids('sort=created_at&direction=asc'));
        $this->assertSame([$bob->id, $alice->id, $this->superadmin->id], $ids('sort=last_login_at&direction=desc'));
        $this->assertSame([$alice->id, $bob->id, $this->superadmin->id], $ids('sort=last_login_at&direction=asc'));
    }

    public function test_invalid_query_parameters_are_rejected(): void
    {
        Sanctum::actingAs($this->superadmin);

        $this->getJson('/api/v1/admin/users?sort=password&status=deleted&per_page=1000&created_from=2026-05-01&created_to=2026-04-01')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sort', 'status', 'per_page', 'created_to']);
    }

    public function test_stats_count_users_by_status_and_verification(): void
    {
        User::factory()->count(2)->create();
        User::factory()->unverified()->count(3)->create();
        User::factory()->inactive()->create();
        Sanctum::actingAs($this->superadmin);

        $this->getJson('/api/v1/admin/users/stats')
            ->assertOk()
            ->assertExactJson(['data' => ['total' => 7, 'active' => 3, 'inactive' => 1, 'pending' => 3, 'unverified' => 3]]);
    }
}
