<?php

namespace Tests\Feature\Auth;

use App\Models\OneTimeCode;
use App\Models\User;
use App\Notifications\VerifyEmailCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function issueCodeFor(User $user): string
    {
        Notification::fake();

        $user->sendEmailVerificationNotification();

        $code = null;
        Notification::assertSentTo($user, VerifyEmailCode::class, function (VerifyEmailCode $notification) use (&$code): bool {
            $code = $notification->code;

            return true;
        });

        return $code;
    }

    public function test_user_can_verify_their_email_with_the_code(): void
    {
        $user = User::factory()->unverified()->create();
        $code = $this->issueCodeFor($user);

        Sanctum::actingAs($user);

        $this->postJson('/api/v1/auth/email/verify', ['code' => $code])
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);

        $this->assertTrue($user->fresh()->hasVerifiedEmail());
        $this->assertNotNull(OneTimeCode::query()->sole()->consumed_at);
    }

    public function test_wrong_code_is_rejected_and_counts_as_an_attempt(): void
    {
        $user = User::factory()->unverified()->create();
        $code = $this->issueCodeFor($user);
        $wrongCode = $code === '000000' ? '111111' : '000000';

        Sanctum::actingAs($user);

        $this->postJson('/api/v1/auth/email/verify', ['code' => $wrongCode])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code' => 'The code is invalid or has expired.']);

        $this->assertFalse($user->fresh()->hasVerifiedEmail());
        $this->assertSame(1, OneTimeCode::query()->sole()->attempts);
    }

    public function test_code_stops_working_after_too_many_wrong_attempts(): void
    {
        $user = User::factory()->unverified()->create();
        OneTimeCode::factory()->for($user)->withCode('123456')->create(['attempts' => 5]);

        Sanctum::actingAs($user);

        $this->postJson('/api/v1/auth/email/verify', ['code' => '123456'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('code');

        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_expired_code_is_rejected(): void
    {
        $user = User::factory()->unverified()->create();
        OneTimeCode::factory()->for($user)->withCode('123456')->expired()->create();

        Sanctum::actingAs($user);

        $this->postJson('/api/v1/auth/email/verify', ['code' => '123456'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('code');
    }

    public function test_code_cannot_be_used_twice(): void
    {
        $user = User::factory()->unverified()->create();
        OneTimeCode::factory()->for($user)->withCode('123456')->create(['consumed_at' => now()]);

        Sanctum::actingAs($user);

        $this->postJson('/api/v1/auth/email/verify', ['code' => '123456'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('code');
    }

    public function test_new_code_replaces_the_previous_one(): void
    {
        $user = User::factory()->unverified()->create();
        $firstCode = $this->issueCodeFor($user);
        $this->travel(2)->minutes();
        $secondCode = $this->issueCodeFor($user);

        $this->assertSame(1, $user->oneTimeCodes()->count());

        Sanctum::actingAs($user);

        if ($firstCode !== $secondCode) {
            $this->postJson('/api/v1/auth/email/verify', ['code' => $firstCode])->assertUnprocessable();
        }

        $this->postJson('/api/v1/auth/email/verify', ['code' => $secondCode])->assertOk();
    }

    public function test_password_reset_code_cannot_verify_email(): void
    {
        $user = User::factory()->unverified()->create();
        OneTimeCode::factory()->for($user)->passwordReset()->withCode('123456')->create();

        Sanctum::actingAs($user);

        $this->postJson('/api/v1/auth/email/verify', ['code' => '123456'])->assertUnprocessable();
    }

    public function test_code_must_be_six_digits(): void
    {
        Sanctum::actingAs(User::factory()->unverified()->create());

        $this->postJson('/api/v1/auth/email/verify', ['code' => '12ab'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('code');
    }

    public function test_already_verified_user_cannot_verify_again(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/auth/email/verify', ['code' => '123456'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code' => 'Your email address is already verified.']);
    }

    public function test_user_can_request_a_new_code(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create();

        Sanctum::actingAs($user);

        $this->postJson('/api/v1/auth/email/resend')->assertAccepted();

        Notification::assertSentToTimes($user, VerifyEmailCode::class, 1);
    }

    public function test_resend_enforces_the_cooldown(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create();
        OneTimeCode::factory()->for($user)->create();

        Sanctum::actingAs($user);

        $this->postJson('/api/v1/auth/email/resend')
            ->assertTooManyRequests()
            ->assertHeader('Retry-After')
            ->assertJsonPath('retry_after', 60);

        $this->travel(61)->seconds();

        $this->postJson('/api/v1/auth/email/resend')->assertAccepted();
        Notification::assertSentToTimes($user, VerifyEmailCode::class, 1);
    }

    public function test_verified_user_cannot_request_a_code(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/auth/email/resend')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_verification_requires_authentication(): void
    {
        $this->postJson('/api/v1/auth/email/verify', ['code' => '123456'])->assertUnauthorized();
        $this->postJson('/api/v1/auth/email/resend')->assertUnauthorized();
    }

    public function test_verified_middleware_blocks_unverified_users(): void
    {
        Route::middleware(['api', 'auth:sanctum', 'verified'])->get('/api/v1/test-verified-only', fn () => ['ok' => true]);

        Sanctum::actingAs(User::factory()->unverified()->create());
        $this->getJson('/api/v1/test-verified-only')
            ->assertForbidden()
            ->assertJson(['message' => 'Your email address is not verified.']);

        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/v1/test-verified-only')->assertOk();
    }
}
