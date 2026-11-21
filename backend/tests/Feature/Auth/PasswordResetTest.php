<?php

namespace Tests\Feature\Auth;

use App\Models\OneTimeCode;
use App\Models\User;
use App\Notifications\ResetPasswordCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_emails_a_code_to_known_accounts(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'rina@example.com']);

        $this->postJson('/api/v1/auth/password/forgot', ['email' => 'RINA@example.com'])
            ->assertAccepted()
            ->assertJson(['message' => "If an account exists for that email, we've sent a code."]);

        Notification::assertSentTo($user, ResetPasswordCode::class);
    }

    public function test_forgot_password_answers_the_same_for_unknown_emails(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/auth/password/forgot', ['email' => 'nobody@example.com'])
            ->assertAccepted()
            ->assertJson(['message' => "If an account exists for that email, we've sent a code."]);

        Notification::assertNothingSent();
    }

    public function test_forgot_password_cooldown_is_silent(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'rina@example.com']);
        OneTimeCode::factory()->for($user)->passwordReset()->create();

        $this->postJson('/api/v1/auth/password/forgot', ['email' => 'rina@example.com'])->assertAccepted();

        Notification::assertNothingSent();
    }

    public function test_user_can_reset_password_with_the_code(): void
    {
        $user = User::factory()->unverified()->create(['email' => 'rina@example.com']);
        $user->createToken('web');
        $user->createToken('other-device');
        OneTimeCode::factory()->for($user)->passwordReset()->withCode('123456')->create();

        $this->postJson('/api/v1/auth/password/reset', [
            'email' => 'rina@example.com',
            'code' => '123456',
            'password' => 'newsecret123',
            'password_confirmation' => 'newsecret123',
        ])->assertNoContent();

        $user->refresh();
        $this->assertTrue(Hash::check('newsecret123', $user->password));
        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertCount(0, $user->tokens);
        $this->assertNotNull(OneTimeCode::query()->sole()->consumed_at);

        $this->postJson('/api/v1/auth/login', ['email' => 'rina@example.com', 'password' => 'newsecret123'])->assertOk();
    }

    public function test_wrong_code_and_unknown_email_get_the_same_error(): void
    {
        $user = User::factory()->create(['email' => 'rina@example.com']);
        OneTimeCode::factory()->for($user)->passwordReset()->withCode('123456')->create();

        $payload = ['code' => '654321', 'password' => 'newsecret123', 'password_confirmation' => 'newsecret123'];

        $wrongCode = $this->postJson('/api/v1/auth/password/reset', [...$payload, 'email' => 'rina@example.com']);
        $unknownEmail = $this->postJson('/api/v1/auth/password/reset', [...$payload, 'email' => 'nobody@example.com']);

        $wrongCode->assertUnprocessable()->assertJsonValidationErrors(['code' => 'The code is invalid or has expired.']);
        $unknownEmail->assertUnprocessable()->assertJsonValidationErrors(['code' => 'The code is invalid or has expired.']);
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_email_verification_code_cannot_reset_the_password(): void
    {
        $user = User::factory()->create(['email' => 'rina@example.com']);
        OneTimeCode::factory()->for($user)->withCode('123456')->create();

        $this->postJson('/api/v1/auth/password/reset', [
            'email' => 'rina@example.com',
            'code' => '123456',
            'password' => 'newsecret123',
            'password_confirmation' => 'newsecret123',
        ])->assertUnprocessable();
    }

    public function test_new_password_must_be_valid(): void
    {
        $user = User::factory()->create(['email' => 'rina@example.com']);
        OneTimeCode::factory()->for($user)->passwordReset()->withCode('123456')->create();

        $this->postJson('/api/v1/auth/password/reset', [
            'email' => 'rina@example.com',
            'code' => '123456',
            'password' => 'short',
            'password_confirmation' => 'short',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->assertNull(OneTimeCode::query()->sole()->consumed_at);
    }

    public function test_forgot_password_is_rate_limited(): void
    {
        Notification::fake();

        for ($attempt = 0; $attempt < 3; $attempt++) {
            $this->postJson('/api/v1/auth/password/forgot', ['email' => 'rina@example.com'])->assertAccepted();
        }

        $this->postJson('/api/v1/auth/password/forgot', ['email' => 'rina@example.com'])->assertTooManyRequests();
    }
}
