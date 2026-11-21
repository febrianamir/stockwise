<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_change_password_and_other_devices_are_logged_out(): void
    {
        $user = User::factory()->create();
        $currentToken = $user->createToken('web')->plainTextToken;
        $otherToken = $user->createToken('other-device')->plainTextToken;

        $this->withToken($currentToken)->putJson('/api/v1/user/password', [
            'current_password' => 'password',
            'password' => 'newsecret123',
            'password_confirmation' => 'newsecret123',
        ])->assertNoContent();

        $this->assertTrue(Hash::check('newsecret123', $user->fresh()->password));

        $this->app['auth']->forgetGuards();
        $this->withToken($currentToken)->getJson('/api/v1/user')->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withToken($otherToken)->getJson('/api/v1/user')->assertUnauthorized();
    }

    public function test_current_password_must_be_correct(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('web')->plainTextToken;

        $this->withToken($token)->putJson('/api/v1/user/password', [
            'current_password' => 'wrong-password',
            'password' => 'newsecret123',
            'password_confirmation' => 'newsecret123',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password' => 'The current password is incorrect.']);

        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_new_password_must_be_confirmed_strong_and_different(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('web')->plainTextToken;

        $this->withToken($token)->putJson('/api/v1/user/password', [
            'current_password' => 'password',
            'password' => 'newsecret123',
            'password_confirmation' => 'mismatch123',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->withToken($token)->putJson('/api/v1/user/password', [
            'current_password' => 'password',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_change_password_requires_authentication(): void
    {
        $this->putJson('/api/v1/user/password', [])->assertUnauthorized();
    }
}
