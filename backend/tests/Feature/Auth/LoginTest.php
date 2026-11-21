<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_log_in_with_case_insensitive_email(): void
    {
        $user = User::factory()->create(['email' => 'rina@example.com']);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'RINA@example.com',
            'password' => 'password',
        ]);

        $response->assertOk()->assertJsonPath('data.id', $user->id);
        $this->assertNotEmpty($response->json('token'));
        $this->assertCount(1, $user->tokens);
    }

    public function test_unverified_user_can_log_in(): void
    {
        User::factory()->unverified()->create(['email' => 'rina@example.com']);

        $this->postJson('/api/v1/auth/login', ['email' => 'rina@example.com', 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('data.email_verified_at', null);
    }

    public function test_wrong_password_and_unknown_email_get_the_same_error(): void
    {
        User::factory()->create(['email' => 'rina@example.com']);

        $wrongPassword = $this->postJson('/api/v1/auth/login', ['email' => 'rina@example.com', 'password' => 'wrong-password']);
        $unknownEmail = $this->postJson('/api/v1/auth/login', ['email' => 'nobody@example.com', 'password' => 'password']);

        $wrongPassword->assertUnprocessable()->assertJsonValidationErrors('email');
        $unknownEmail->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->assertSame($wrongPassword->json('errors.email'), $unknownEmail->json('errors.email'));
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_login_is_rate_limited(): void
    {
        User::factory()->create(['email' => 'rina@example.com']);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'rina@example.com', 'password' => 'wrong-password'])
                ->assertUnprocessable();
        }

        $this->postJson('/api/v1/auth/login', ['email' => 'rina@example.com', 'password' => 'password'])
            ->assertTooManyRequests()
            ->assertHeader('Retry-After')
            ->assertJsonStructure(['message', 'retry_after']);
    }

    public function test_logout_revokes_only_the_current_token(): void
    {
        $user = User::factory()->create();
        $currentToken = $user->createToken('web')->plainTextToken;
        $otherToken = $user->createToken('other-device')->plainTextToken;

        $this->withToken($currentToken)->postJson('/api/v1/auth/logout')->assertNoContent();

        $this->assertCount(1, $user->fresh()->tokens);

        $this->app['auth']->forgetGuards();
        $this->withToken($currentToken)->getJson('/api/v1/user')->assertUnauthorized();

        $this->app['auth']->forgetGuards();
        $this->withToken($otherToken)->getJson('/api/v1/user')->assertOk();
    }

    public function test_logout_requires_authentication(): void
    {
        $this->postJson('/api/v1/auth/logout')->assertUnauthorized();
    }
}
