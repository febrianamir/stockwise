<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\VerifyEmailCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, string>
     */
    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Rina Putri',
            'email' => 'Rina@Example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ], $overrides);
    }

    public function test_user_can_register_and_receives_a_token_and_verification_code(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/v1/auth/register', $this->validPayload());

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Rina Putri')
            ->assertJsonPath('data.email', 'rina@example.com')
            ->assertJsonPath('data.email_verified_at', null)
            ->assertJsonMissingPath('data.password');

        $this->assertNotEmpty($response->json('token'));

        $user = User::query()->where('email', 'rina@example.com')->sole();
        $this->assertFalse($user->hasVerifiedEmail());
        $this->assertCount(1, $user->tokens);

        Notification::assertSentTo($user, VerifyEmailCode::class, fn (VerifyEmailCode $notification): bool => preg_match('/^\d{6}$/', $notification->code) === 1);
    }

    public function test_returned_token_authenticates_the_new_user(): void
    {
        Notification::fake();

        $token = $this->postJson('/api/v1/auth/register', $this->validPayload())->json('token');

        $this->withToken($token)
            ->getJson('/api/v1/user')
            ->assertOk()
            ->assertJsonPath('data.email', 'rina@example.com');
    }

    public function test_email_must_be_unique_case_insensitively(): void
    {
        User::factory()->create(['email' => 'rina@example.com']);

        $this->postJson('/api/v1/auth/register', $this->validPayload(['email' => 'RINA@example.com']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_password_must_be_confirmed_and_strong_enough(): void
    {
        $this->postJson('/api/v1/auth/register', $this->validPayload([
            'password' => 'short',
            'password_confirmation' => 'different',
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->postJson('/api/v1/auth/register', $this->validPayload([
            'password' => 'lettersonly',
            'password_confirmation' => 'lettersonly',
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_name_and_email_are_required(): void
    {
        $this->postJson('/api/v1/auth/register', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }
}
