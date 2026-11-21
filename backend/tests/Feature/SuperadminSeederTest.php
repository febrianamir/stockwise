<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\SuperadminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class SuperadminSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'auth.superadmin.name' => 'Platform Admin',
            'auth.superadmin.email' => 'Admin@Stockwise.test',
            'auth.superadmin.password' => 'secret123',
        ]);
    }

    public function test_it_creates_a_verified_superadmin(): void
    {
        $this->seed(SuperadminSeeder::class);

        $superadmin = User::query()->sole();
        $this->assertSame('admin@stockwise.test', $superadmin->email);
        $this->assertSame('Platform Admin', $superadmin->name);
        $this->assertTrue($superadmin->is_superadmin);
        $this->assertTrue($superadmin->hasVerifiedEmail());
        $this->assertTrue(Hash::check('secret123', $superadmin->password));
    }

    public function test_superadmin_can_log_in(): void
    {
        $this->seed(SuperadminSeeder::class);

        $this->postJson('/api/v1/auth/login', ['email' => 'admin@stockwise.test', 'password' => 'secret123'])
            ->assertOk()
            ->assertJsonPath('data.email', 'admin@stockwise.test');
    }

    public function test_running_it_again_does_not_duplicate_or_reset_the_password(): void
    {
        $this->seed(SuperadminSeeder::class);
        User::query()->sole()->update(['password' => 'changed123']);

        $this->seed(SuperadminSeeder::class);

        $this->assertSame(1, User::query()->count());
        $this->assertTrue(Hash::check('changed123', User::query()->sole()->password));
    }

    public function test_it_promotes_and_verifies_an_existing_account_with_that_email(): void
    {
        User::factory()->unverified()->create(['email' => 'admin@stockwise.test']);

        $this->seed(SuperadminSeeder::class);

        $superadmin = User::query()->sole();
        $this->assertTrue($superadmin->is_superadmin);
        $this->assertTrue($superadmin->hasVerifiedEmail());
    }

    public function test_it_refuses_missing_or_weak_credentials(): void
    {
        config(['auth.superadmin.password' => 'weak']);

        $this->expectException(RuntimeException::class);

        $this->seed(SuperadminSeeder::class);
    }

    public function test_regular_users_are_not_superadmins_and_cannot_become_one_via_profile_update(): void
    {
        $user = User::factory()->create();
        $this->assertFalse($user->fresh()->is_superadmin);

        $this->actingAs($user, 'sanctum')
            ->patchJson('/api/v1/user', ['name' => 'Rina', 'is_superadmin' => true])
            ->assertOk();

        $this->assertFalse($user->fresh()->is_superadmin);
    }
}
