<?php

namespace Tests\Feature\Admin;

use App\Enums\AuditAction;
use App\Enums\UserStatus;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUserManageTest extends TestCase
{
    use RefreshDatabase;

    private User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superadmin = User::factory()->superadmin()->create();
    }

    private function assertAudited(AuditAction $action, User $subject, ?User $actor): void
    {
        $this->assertDatabaseHas('audit_logs', [
            'action' => $action->value,
            'subject_type' => $subject->getMorphClass(),
            'subject_id' => $subject->id,
            'actor_id' => $actor?->id,
        ]);
    }

    public function test_superadmin_creates_a_pending_user_who_can_log_in_and_verify(): void
    {
        Sanctum::actingAs($this->superadmin);

        $response = $this->postJson('/api/v1/admin/users', [
            'name' => 'New Cashier',
            'email' => 'New.Cashier@Example.com',
            'password' => 'initial123',
            'password_confirmation' => 'initial123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.email', 'new.cashier@example.com')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.email_verified_at', null)
            ->assertJsonPath('data.is_superadmin', false);

        $user = User::query()->where('email', 'new.cashier@example.com')->sole();
        $this->assertAudited(AuditAction::UserCreated, $user, $this->superadmin);

        $this->postJson('/api/v1/auth/login', ['email' => 'new.cashier@example.com', 'password' => 'initial123'])
            ->assertOk()
            ->assertJsonPath('data.status', 'pending');

        $user->markEmailAsVerified();
        $this->assertSame(UserStatus::Active, $user->fresh()->status);
    }

    public function test_create_user_is_validated(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);
        Sanctum::actingAs($this->superadmin);

        $this->postJson('/api/v1/admin/users', [
            'name' => '',
            'email' => 'TAKEN@example.com',
            'password' => 'short',
            'password_confirmation' => 'other',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_show_returns_profile_and_activity_newest_first(): void
    {
        $user = User::factory()->unverified()->create();
        $user->markEmailAsVerified();
        $this->travel(1)->minute();
        $user->recordLogin();
        Sanctum::actingAs($this->superadmin);
        $this->travel(1)->minute();
        $this->postJson("/api/v1/admin/users/{$user->id}/deactivate")->assertOk();

        $response = $this->getJson("/api/v1/admin/users/{$user->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.status', 'inactive');

        $this->assertSame(['user.deactivated', 'user.last_login', 'user.email_verified'], array_column($response->json('data.activity'), 'action'));
        $this->assertSame($this->superadmin->id, $response->json('data.activity.0.actor.id'));
        $this->assertIsInt($response->json('data.activity.0.id'));
        $this->assertNull($response->json('data.activity.1.id'));
    }

    public function test_show_unknown_user_returns_404_for_superadmin(): void
    {
        Sanctum::actingAs($this->superadmin);

        $this->getJson('/api/v1/admin/users/999999')->assertNotFound();
    }

    public function test_deactivation_revokes_tokens_and_blocks_every_way_in(): void
    {
        $user = User::factory()->create(['email' => 'rina@example.com']);
        $token = $user->createToken('web')->plainTextToken;
        $user->createToken('other-device');

        Sanctum::actingAs($this->superadmin);
        $this->postJson("/api/v1/admin/users/{$user->id}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.status', 'inactive');

        $this->assertSame(0, $user->tokens()->count());
        $this->assertAudited(AuditAction::UserDeactivated, $user, $this->superadmin);

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/user')->assertUnauthorized();

        $this->postJson('/api/v1/auth/login', ['email' => 'rina@example.com', 'password' => 'password'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'This account has been deactivated. Contact your Stockwise administrator.']);
    }

    public function test_a_surviving_token_of_an_inactive_user_is_rejected(): void
    {
        $user = User::factory()->inactive()->create();
        $token = $user->createToken('web')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/user')->assertUnauthorized();
    }

    public function test_superadmin_cannot_deactivate_themselves_or_the_last_active_superadmin(): void
    {
        Sanctum::actingAs($this->superadmin);

        $this->postJson("/api/v1/admin/users/{$this->superadmin->id}/deactivate")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['user' => "You can't deactivate your own account."]);

        $other = User::factory()->superadmin()->create();
        $this->postJson("/api/v1/admin/users/{$other->id}/deactivate")->assertOk();

        $this->assertSame(UserStatus::Active, $this->superadmin->fresh()->status);
    }

    public function test_last_active_superadmin_cannot_be_deactivated_by_another_admin_path(): void
    {
        $second = User::factory()->superadmin()->create();
        $this->superadmin->forceFill(['is_superadmin' => false])->save();
        Sanctum::actingAs($this->superadmin->forceFill(['is_superadmin' => true]));

        // Only $second is an active Superadmin in the database.
        $this->postJson("/api/v1/admin/users/{$second->id}/deactivate")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['user' => "You can't deactivate the last active Superadmin."]);
    }

    public function test_deactivating_an_inactive_user_is_rejected(): void
    {
        $user = User::factory()->inactive()->create();
        Sanctum::actingAs($this->superadmin);

        $this->postJson("/api/v1/admin/users/{$user->id}/deactivate")->assertUnprocessable();
    }

    public function test_reactivation_restores_active_or_pending(): void
    {
        $verified = User::factory()->inactive()->create();
        $unverified = User::factory()->unverified()->inactive()->create();
        Sanctum::actingAs($this->superadmin);

        $this->postJson("/api/v1/admin/users/{$verified->id}/reactivate")->assertOk()->assertJsonPath('data.status', 'active');
        $this->postJson("/api/v1/admin/users/{$unverified->id}/reactivate")->assertOk()->assertJsonPath('data.status', 'pending');
        $this->postJson("/api/v1/admin/users/{$verified->id}/reactivate")->assertUnprocessable();

        $this->assertAudited(AuditAction::UserReactivated, $verified, $this->superadmin);
    }

    public function test_superadmin_can_grant_and_revoke_superadmin(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($this->superadmin);

        $this->putJson("/api/v1/admin/users/{$user->id}/superadmin", ['is_superadmin' => true])
            ->assertOk()
            ->assertJsonPath('data.is_superadmin', true);
        $this->assertAudited(AuditAction::UserSuperadminGranted, $user, $this->superadmin);

        $this->putJson("/api/v1/admin/users/{$user->id}/superadmin", ['is_superadmin' => false])
            ->assertOk()
            ->assertJsonPath('data.is_superadmin', false);
        $this->assertAudited(AuditAction::UserSuperadminRevoked, $user, $this->superadmin);
    }

    public function test_superadmin_cannot_be_granted_to_pending_or_inactive_users(): void
    {
        $pending = User::factory()->unverified()->create();
        $inactive = User::factory()->inactive()->create();
        Sanctum::actingAs($this->superadmin);

        $this->putJson("/api/v1/admin/users/{$pending->id}/superadmin", ['is_superadmin' => true])->assertUnprocessable()->assertJsonValidationErrors('is_superadmin');
        $this->putJson("/api/v1/admin/users/{$inactive->id}/superadmin", ['is_superadmin' => true])->assertUnprocessable()->assertJsonValidationErrors('is_superadmin');
    }

    public function test_superadmin_cannot_revoke_themselves(): void
    {
        User::factory()->superadmin()->create();
        Sanctum::actingAs($this->superadmin);

        $this->putJson("/api/v1/admin/users/{$this->superadmin->id}/superadmin", ['is_superadmin' => false])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['is_superadmin' => "You can't revoke your own Superadmin status."]);

        $this->assertTrue($this->superadmin->fresh()->is_superadmin);
    }

    public function test_superadmin_toggle_is_validated(): void
    {
        Sanctum::actingAs($this->superadmin);

        $this->putJson("/api/v1/admin/users/{$this->superadmin->id}/superadmin", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('is_superadmin');
    }

    public function test_audit_entries_record_ip_and_user_agent(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($this->superadmin);

        $this->withHeader('User-Agent', 'StockwiseTest/1.0')->postJson("/api/v1/admin/users/{$user->id}/deactivate")->assertOk();

        $log = AuditLog::query()->where('action', AuditAction::UserDeactivated)->sole();
        $this->assertSame('StockwiseTest/1.0', $log->user_agent);
        $this->assertSame('127.0.0.1', $log->ip_address);
        $this->assertSame(['previous_status' => 'active'], $log->metadata);
    }
}
