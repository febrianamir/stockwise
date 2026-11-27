<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Company;
use App\Models\CompanyMembership;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Member management inside a company (docs/features/company-workspace/prd.md, CW-3 to CW-6).
 * Every change is audited in the same transaction (SEC-5).
 */
class MembershipService
{
    public function __construct(private AuditLogger $audit) {}

    /**
     * Add an existing active user with an assignable role (CW-3). Re-adding someone whose
     * membership was deactivated is rejected with a hint to reactivate them instead (CW-5).
     */
    public function add(User $actor, Company $company, string $email, MembershipRole $role): CompanyMembership
    {
        return DB::transaction(function () use ($actor, $company, $email, $role): CompanyMembership {
            $user = User::query()->where('email', $email)->lockForUpdate()->first();

            if ($user === null || ! $user->isActive() || ! $user->hasVerifiedEmail()) {
                throw ValidationException::withMessages(['email' => 'No active Stockwise account uses this email. Ask them to register and verify their email first.']);
            }

            $existing = $company->memberships()->where('user_id', $user->getKey())->lockForUpdate()->first();

            if ($existing !== null) {
                throw ValidationException::withMessages(['email' => $existing->isActive()
                    ? 'This user is already a member of this company.'
                    : 'This user is a deactivated member. Reactivate them from the member list instead.']);
            }

            $membership = $company->memberships()->create([
                'user_id' => $user->getKey(),
                'role' => $role,
                'status' => MembershipStatus::Active,
                'branch_scope' => $role->defaultBranchScope(),
            ]);

            $this->audit->record(AuditAction::CompanyMemberAdded, $membership, $actor, [
                'user_id' => $user->getKey(),
                'role' => $role->value,
            ], $company);

            return $membership->load('user');
        });
    }

    /**
     * Change a member's role or membership status (CW-4). The owner's membership and your own
     * can't be changed here; ownership only moves through a platform transfer (CM-13).
     */
    public function update(User $actor, Company $company, CompanyMembership $membership, ?MembershipRole $role, ?MembershipStatus $status): CompanyMembership
    {
        return DB::transaction(function () use ($actor, $company, $membership, $role, $status): CompanyMembership {
            $membership = $company->memberships()->whereKey($membership->getKey())->lockForUpdate()->firstOrFail();

            if ($membership->isOwner()) {
                throw ValidationException::withMessages(['membership' => "The owner's membership can't be changed here. Contact your Stockwise administrator to transfer ownership."]);
            }

            if ($membership->user_id === $actor->getKey()) {
                throw ValidationException::withMessages(['membership' => "You can't change your own membership."]);
            }

            if ($role !== null && $role !== $membership->role) {
                $previous = $membership->role;
                $membership->role = $role;
                $membership->save();

                $this->audit->record(AuditAction::CompanyMemberRoleChanged, $membership, $actor, [
                    'user_id' => $membership->user_id,
                    'changes' => ['role' => ['from' => $previous->value, 'to' => $role->value]],
                ], $company);
            }

            if ($status !== null && $status !== $membership->status) {
                $membership->status = $status;
                $membership->save();

                $this->audit->record(
                    $status === MembershipStatus::Active ? AuditAction::CompanyMemberReactivated : AuditAction::CompanyMemberDeactivated,
                    $membership,
                    $actor,
                    ['user_id' => $membership->user_id],
                    $company,
                );
            }

            return $membership->load('user');
        });
    }
}
