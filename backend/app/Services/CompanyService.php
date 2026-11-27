<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\BranchScope;
use App\Enums\CompanyStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Exceptions\ApiException;
use App\Models\Company;
use App\Models\CompanyMembership;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Platform company management (docs/features/company-management/prd.md). Every action runs in one
 * transaction with its audit entry (CM-10).
 */
class CompanyService
{
    public function __construct(private AuditLogger $audit) {}

    /**
     * Create an active company with its owner (CM-3, CM-4).
     *
     * @param  array<string, mixed>  $attributes  profile fields from PRD §4
     */
    public function create(User $actor, array $attributes, int $ownerUserId): Company
    {
        return DB::transaction(function () use ($actor, $attributes, $ownerUserId): Company {
            $owner = User::query()->whereKey($ownerUserId)->lockForUpdate()->first();

            if ($owner === null || ! $owner->isActive() || ! $owner->hasVerifiedEmail()) {
                throw ValidationException::withMessages(['owner_user_id' => 'The owner must be an active, verified user.']);
            }

            $company = new Company($attributes);
            $company->forceFill(['status' => CompanyStatus::Active, 'created_by' => $actor->getKey()])->save();

            $company->memberships()->create([
                'user_id' => $owner->getKey(),
                'role' => MembershipRole::Owner,
                'status' => MembershipStatus::Active,
                'branch_scope' => MembershipRole::Owner->defaultBranchScope(),
            ]);

            $this->audit->record(AuditAction::CompanyCreated, $company, $actor, [
                'name' => $company->name,
                'code' => $company->code,
                'timezone' => $company->timezone,
                'currency' => $company->currency,
                'owner_id' => $owner->getKey(),
            ], $company);

            return $company;
        });
    }

    /**
     * Edit profile fields. Rejects stale edits (CM-11) and records only changed fields.
     *
     * @param  array<string, mixed>  $attributes  editable fields only
     */
    public function update(User $actor, Company $company, array $attributes, Carbon $loadedUpdatedAt): Company
    {
        return DB::transaction(function () use ($actor, $company, $attributes, $loadedUpdatedAt): Company {
            $company = Company::query()->whereKey($company->getKey())->lockForUpdate()->firstOrFail();

            if (! $company->updated_at->equalTo($loadedUpdatedAt)) {
                throw ApiException::staleRecord();
            }

            $company->fill(array_intersect_key($attributes, array_flip(Company::EDITABLE)));

            if (! $company->isDirty()) {
                return $company;
            }

            $changes = [];
            foreach ($company->getDirty() as $field => $value) {
                $changes[$field] = ['from' => $company->getOriginal($field), 'to' => $value];
            }

            $company->save();

            $this->audit->record(AuditAction::CompanyUpdated, $company, $actor, ['changes' => $changes], $company);

            return $company;
        });
    }

    /**
     * Suspend an active company (CM-5 to CM-7, CM-16). A conditional update makes concurrent
     * requests produce exactly one change.
     */
    public function suspend(User $actor, Company $company, string $reason): Company
    {
        return DB::transaction(function () use ($actor, $company, $reason): Company {
            $updated = Company::query()
                ->whereKey($company->getKey())
                ->where('status', CompanyStatus::Active)
                ->update([
                    'status' => CompanyStatus::Suspended,
                    'suspended_at' => now(),
                    'suspension_reason' => $reason,
                    'updated_at' => now(),
                ]);

            if ($updated === 0) {
                throw ApiException::invalidStatusTransition('Only an active company can be suspended.');
            }

            $company->refresh();

            $this->audit->record(AuditAction::CompanySuspended, $company, $actor, [
                'reason' => $reason,
                'previous_status' => CompanyStatus::Active->value,
            ], $company);

            return $company;
        });
    }

    /**
     * Reactivate a suspended company. Memberships and data are untouched (CM-7).
     */
    public function reactivate(User $actor, Company $company, ?string $note): Company
    {
        return DB::transaction(function () use ($actor, $company, $note): Company {
            $previousReason = Company::query()->whereKey($company->getKey())->lockForUpdate()->value('suspension_reason');

            $updated = Company::query()
                ->whereKey($company->getKey())
                ->where('status', CompanyStatus::Suspended)
                ->update([
                    'status' => CompanyStatus::Active,
                    'suspended_at' => null,
                    'suspension_reason' => null,
                    'updated_at' => now(),
                ]);

            if ($updated === 0) {
                throw ApiException::invalidStatusTransition('Only a suspended company can be reactivated.');
            }

            $company->refresh();

            $this->audit->record(AuditAction::CompanyReactivated, $company, $actor, array_filter([
                'note' => $note,
                'previous_reason' => $previousReason,
            ], fn ($value) => $value !== null && $value !== ''), $company);

            return $company;
        });
    }

    /**
     * Move ownership to another active member (CM-13, MB-6). The old owner is demoted first so the
     * one-owner index never sees two owners; the committed state always has exactly one.
     */
    public function transferOwnership(User $actor, Company $company, int $newOwnerUserId, string $reason): Company
    {
        return DB::transaction(function () use ($actor, $company, $newOwnerUserId, $reason): Company {
            $memberships = $company->memberships()->with('user')->lockForUpdate()->get();

            $currentOwner = $memberships->first(fn (CompanyMembership $membership) => $membership->isOwner());
            $target = $memberships->first(fn (CompanyMembership $membership) => $membership->user_id === $newOwnerUserId);

            if ($target === null || ! $target->isActive() || ! $target->user->isActive() || ! $target->user->hasVerifiedEmail()) {
                throw ValidationException::withMessages(['user_id' => 'The new owner must be an active member of this company with an active account.']);
            }

            if ($target->isOwner()) {
                throw ValidationException::withMessages(['user_id' => 'This user is already the owner.']);
            }

            $previousRole = $target->role;

            // The previous owner keeps every branch as an Admin (BM-4); the new owner has implicit
            // access (BR-3), and its stored scope is kept consistent.
            $currentOwner?->forceFill(['role' => MembershipRole::Admin, 'branch_scope' => BranchScope::All])->save();
            $target->forceFill(['role' => MembershipRole::Owner, 'branch_scope' => BranchScope::All])->save();
            $company->touch();

            $this->audit->record(AuditAction::CompanyOwnershipTransferred, $company, $actor, [
                'reason' => $reason,
                'previous_owner_id' => $currentOwner?->user_id,
                'new_owner_id' => $target->user_id,
                'previous_owner_role' => MembershipRole::Admin->value,
                'new_owner_previous_role' => $previousRole->value,
            ], $company);

            return $company->refresh();
        });
    }
}
