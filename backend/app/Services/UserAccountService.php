<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Platform user management actions and their safeguards (docs/features/user-management/prd.md §4).
 */
class UserAccountService
{
    public function __construct(private AuditLogger $audit) {}

    /**
     * Create a pending account with an initial password the Superadmin shares out of band (UM-7).
     *
     * @param  array{name: string, email: string, password: string}  $attributes
     */
    public function create(User $actor, array $attributes): User
    {
        return DB::transaction(function () use ($actor, $attributes): User {
            $user = User::create($attributes);

            $this->audit->record(AuditAction::UserCreated, $user, $actor);

            return $user;
        });
    }

    /**
     * Deactivate the account and revoke every token so access stops immediately (UM-3).
     */
    public function deactivate(User $actor, User $user): User
    {
        if ($user->isInactive()) {
            throw ValidationException::withMessages(['user' => 'This user is already inactive.']);
        }

        if ($actor->is($user)) {
            throw ValidationException::withMessages(['user' => "You can't deactivate your own account."]);
        }

        return DB::transaction(function () use ($actor, $user): User {
            if ($this->isLastActiveSuperadmin($user)) {
                throw ValidationException::withMessages(['user' => "You can't deactivate the last active Superadmin."]);
            }

            $previousStatus = $user->status;

            $user->status = UserStatus::Inactive;
            $user->save();
            $user->tokens()->delete();

            $this->audit->record(AuditAction::UserDeactivated, $user, $actor, [
                'previous_status' => $previousStatus->value,
            ]);

            return $user;
        });
    }

    /**
     * Restore access: active when the email is verified, otherwise pending (PRD §3).
     */
    public function reactivate(User $actor, User $user): User
    {
        if (! $user->isInactive()) {
            throw ValidationException::withMessages(['user' => 'This user is not inactive.']);
        }

        return DB::transaction(function () use ($actor, $user): User {
            $user->status = $user->hasVerifiedEmail() ? UserStatus::Active : UserStatus::Pending;
            $user->save();

            $this->audit->record(AuditAction::UserReactivated, $user, $actor, [
                'status' => $user->status->value,
            ]);

            return $user;
        });
    }

    /**
     * Grant or revoke the platform Superadmin flag (UM-4 to UM-6).
     */
    public function setSuperadmin(User $actor, User $user, bool $isSuperadmin): User
    {
        if ($user->is_superadmin === $isSuperadmin) {
            return $user;
        }

        if ($isSuperadmin && (! $user->isActive() || ! $user->hasVerifiedEmail())) {
            throw ValidationException::withMessages(['is_superadmin' => 'Superadmin can only be granted to an active, verified user.']);
        }

        if (! $isSuperadmin && $actor->is($user)) {
            throw ValidationException::withMessages(['is_superadmin' => "You can't revoke your own Superadmin status."]);
        }

        return DB::transaction(function () use ($actor, $user, $isSuperadmin): User {
            if (! $isSuperadmin && $this->isLastActiveSuperadmin($user)) {
                throw ValidationException::withMessages(['is_superadmin' => "You can't revoke the last active Superadmin."]);
            }

            $user->is_superadmin = $isSuperadmin;
            $user->save();

            $this->audit->record(
                $isSuperadmin ? AuditAction::UserSuperadminGranted : AuditAction::UserSuperadminRevoked,
                $user,
                $actor,
            );

            return $user;
        });
    }

    /**
     * Whether the user is the only active Superadmin (UM-5). Call inside a transaction: the active
     * Superadmin rows are locked, so two Superadmins demoting each other at the same moment are
     * serialized and the second one sees the first change instead of both passing the check.
     */
    private function isLastActiveSuperadmin(User $user): bool
    {
        $activeSuperadminIds = User::query()
            ->where('is_superadmin', true)
            ->where('status', UserStatus::Active)
            ->lockForUpdate()
            ->pluck('id');

        return $activeSuperadminIds->count() === 1 && $activeSuperadminIds->contains($user->getKey());
    }
}
