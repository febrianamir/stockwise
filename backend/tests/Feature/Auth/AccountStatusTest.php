<?php

namespace Tests\Feature\Auth;

use App\Enums\AuditAction;
use App\Enums\UserStatus;
use App\Models\OneTimeCode;
use App\Models\User;
use App\Notifications\ResetPasswordCode;
use App\Notifications\VerifyEmailCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_creates_a_pending_account_and_records_it(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Rina',
            'email' => 'rina@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])->assertCreated()->assertJsonPath('data.status', 'pending')->assertJsonPath('data.is_superadmin', false);

        $user = User::query()->sole();
        $this->assertSame(UserStatus::Pending, $user->status);
        $this->assertNotNull($user->last_login_at);
        $this->assertDatabaseHas('audit_logs', ['action' => AuditAction::UserRegistered->value, 'subject_id' => $user->id, 'actor_id' => $user->id]);
    }

    public function test_verifying_email_activates_a_pending_account(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create();
        $user->sendEmailVerificationNotification();
        $code = null;
        Notification::assertSentTo($user, VerifyEmailCode::class, function (VerifyEmailCode $notification) use (&$code): bool {
            $code = $notification->code;

            return true;
        });

        Sanctum::actingAs($user);
        $this->postJson('/api/v1/auth/email/verify', ['code' => $code])
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('audit_logs', ['action' => AuditAction::UserEmailVerified->value, 'subject_id' => $user->id]);
    }

    public function test_verification_does_not_reactivate_an_inactive_account(): void
    {
        $user = User::factory()->unverified()->inactive()->create();

        $user->markEmailAsVerified();

        $this->assertSame(UserStatus::Inactive, $user->fresh()->status);
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    public function test_login_records_last_login_without_touching_updated_at(): void
    {
        $user = User::factory()->create(['email' => 'rina@example.com', 'updated_at' => now()->subWeek()]);
        $updatedAt = $user->fresh()->updated_at;

        $this->postJson('/api/v1/auth/login', ['email' => 'rina@example.com', 'password' => 'password'])->assertOk();

        $user->refresh();
        $this->assertNotNull($user->last_login_at);
        $this->assertTrue($updatedAt->equalTo($user->updated_at));
    }

    public function test_wrong_password_for_inactive_account_gets_the_generic_error(): void
    {
        User::factory()->inactive()->create(['email' => 'rina@example.com']);

        $this->postJson('/api/v1/auth/login', ['email' => 'rina@example.com', 'password' => 'wrong-password'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => __('auth.failed')]);
    }

    public function test_inactive_accounts_cannot_recover_their_password(): void
    {
        Notification::fake();
        $user = User::factory()->inactive()->create(['email' => 'rina@example.com']);

        $this->postJson('/api/v1/auth/password/forgot', ['email' => 'rina@example.com'])->assertAccepted();
        Notification::assertNotSentTo($user, ResetPasswordCode::class);

        OneTimeCode::factory()->for($user)->passwordReset()->withCode('123456')->create();
        $this->postJson('/api/v1/auth/password/reset', [
            'email' => 'rina@example.com',
            'code' => '123456',
            'password' => 'newsecret123',
            'password_confirmation' => 'newsecret123',
        ])->assertUnprocessable()->assertJsonValidationErrors(['code' => 'The code is invalid or has expired.']);
    }

    public function test_password_reset_activates_a_pending_account(): void
    {
        $user = User::factory()->unverified()->create(['email' => 'rina@example.com']);
        OneTimeCode::factory()->for($user)->passwordReset()->withCode('123456')->create();

        $this->postJson('/api/v1/auth/password/reset', [
            'email' => 'rina@example.com',
            'code' => '123456',
            'password' => 'newsecret123',
            'password_confirmation' => 'newsecret123',
        ])->assertNoContent();

        $this->assertSame(UserStatus::Active, $user->fresh()->status);
    }

    public function test_profile_update_cannot_change_status_or_superadmin(): void
    {
        $user = User::factory()->unverified()->create();
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/user', ['name' => 'Rina', 'status' => 'active', 'is_superadmin' => true])->assertOk();

        $user->refresh();
        $this->assertSame(UserStatus::Pending, $user->status);
        $this->assertFalse($user->is_superadmin);
    }
}
