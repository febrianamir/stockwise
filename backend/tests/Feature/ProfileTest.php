<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_view_their_profile_and_verification_status(): void
    {
        $user = User::factory()->unverified()->create(['phone' => '+62 812 3456 7890']);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/user')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.phone', '+62 812 3456 7890')
            ->assertJsonPath('data.email_verified_at', null);
    }

    public function test_user_can_update_name_and_phone(): void
    {
        $user = User::factory()->create();

        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/user', ['name' => '  Rina Putri ', 'phone' => '+62 812 3456 7890'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Rina Putri')
            ->assertJsonPath('data.phone', '+62 812 3456 7890');

        $this->assertSame('Rina Putri', $user->fresh()->name);
    }

    public function test_empty_phone_is_stored_as_null(): void
    {
        $user = User::factory()->create(['phone' => '+62 812 3456 7890']);

        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/user', ['name' => $user->name, 'phone' => ''])
            ->assertOk()
            ->assertJsonPath('data.phone', null);
    }

    public function test_profile_update_ignores_email_and_password(): void
    {
        $user = User::factory()->create(['email' => 'rina@example.com']);
        $passwordHash = $user->password;

        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/user', [
            'name' => 'Rina',
            'email' => 'attacker@example.com',
            'password' => 'hijacked123',
            'email_verified_at' => null,
        ])->assertOk();

        $user->refresh();
        $this->assertSame('rina@example.com', $user->email);
        $this->assertSame($passwordHash, $user->password);
        $this->assertTrue($user->hasVerifiedEmail());
    }

    public function test_profile_update_is_validated(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->patchJson('/api/v1/user', ['name' => '', 'phone' => 'call me'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'phone']);
    }

    public function test_profile_requires_authentication(): void
    {
        $this->patchJson('/api/v1/user', ['name' => 'Rina'])->assertUnauthorized();
    }
}
