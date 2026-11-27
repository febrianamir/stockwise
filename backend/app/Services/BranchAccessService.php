<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\BranchScope;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Branch;
use App\Models\Company;
use App\Models\CompanyMembership;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The one place branch access is decided (docs/features/branch-management/prd.md, BM-3 to BM-5).
 * The `company.branch` middleware, branch lists and `/me/branches` all go through it, so later
 * modules never re-implement the rule.
 */
class BranchAccessService
{
    public function __construct(private AuditLogger $audit) {}

    /**
     * The Owner reaches every branch (BR-3, an ownership invariant, so it checks the role);
     * scope `all` reaches every branch of the company; scope `selected` only the granted ones.
     */
    public function canAccess(CompanyMembership $membership, Branch $branch): bool
    {
        if (! $membership->isActive() || $branch->company_id !== $membership->company_id) {
            return false;
        }

        if ($this->hasAllBranches($membership)) {
            return true;
        }

        return DB::table('membership_branch_access')
            ->where('membership_id', $membership->getKey())
            ->where('branch_id', $branch->getKey())
            ->exists();
    }

    /**
     * Whether the member reaches every branch, including ones created later.
     */
    public function hasAllBranches(CompanyMembership $membership): bool
    {
        return $membership->isOwner() || $membership->branch_scope === BranchScope::All;
    }

    /**
     * The company's branches this member may work in, as a query to filter, sort and paginate.
     *
     * @return HasMany<Branch, Company>
     */
    public function accessibleBranches(Company $company, CompanyMembership $membership): HasMany
    {
        return $company->branches()->when(
            ! $this->hasAllBranches($membership),
            fn (Builder $query) => $query->whereIn('id', DB::table('membership_branch_access')
                ->select('branch_id')
                ->where('membership_id', $membership->getKey())),
        );
    }

    /**
     * Active members who can work in this branch: the Owner, scope `all`, and explicit grants.
     *
     * @return HasMany<CompanyMembership, Company>
     */
    public function membersWithAccess(Company $company, Branch $branch): HasMany
    {
        return $company->memberships()
            ->where('status', MembershipStatus::Active)
            ->where(fn (Builder $members) => $members
                ->where('role', MembershipRole::Owner)
                ->orWhere('branch_scope', BranchScope::All)
                ->orWhereIn('id', DB::table('membership_branch_access')->select('membership_id')->where('branch_id', $branch->getKey())));
    }

    /**
     * Replace a member's branch access in one transaction (BM-5, "change a member's branch
     * access"): the Owner's access can't be restricted, nobody changes their own, `selected` needs
     * at least one branch, and every branch must belong to this company. Audited with the before
     * and after state; a no-op writes nothing.
     *
     * @param  list<string>  $branchPublicIds
     */
    public function replaceAccess(User $actor, Company $company, CompanyMembership $membership, BranchScope $scope, array $branchPublicIds): CompanyMembership
    {
        return DB::transaction(function () use ($actor, $company, $membership, $scope, $branchPublicIds): CompanyMembership {
            $membership = $company->memberships()->whereKey($membership->getKey())->lockForUpdate()->firstOrFail();

            if ($membership->isOwner()) {
                throw ValidationException::withMessages(['scope' => 'The owner always has access to every branch.']);
            }

            if ($membership->user_id === $actor->getKey()) {
                throw ValidationException::withMessages(['scope' => "You can't change your own branch access."]);
            }

            $branchIds = [];

            if ($scope === BranchScope::Selected) {
                $branchPublicIds = array_values(array_unique($branchPublicIds));
                $branches = $company->branches()->whereIn('public_id', $branchPublicIds)->pluck('id', 'public_id');

                if ($branches->count() !== count($branchPublicIds)) {
                    // Branch IDs from another company look exactly like unknown ones (SEC-4).
                    throw ValidationException::withMessages(['branch_ids' => 'Choose branches of this company.']);
                }

                $branchIds = $branches->values()->sort()->values()->all();
            }

            $before = $this->snapshot($membership);

            $membership->branch_scope = $scope;
            $membership->save();

            DB::table('membership_branch_access')->where('membership_id', $membership->getKey())->delete();

            if ($branchIds !== []) {
                DB::table('membership_branch_access')->insert(array_map(fn (int $branchId): array => [
                    'company_id' => $company->getKey(),
                    'membership_id' => $membership->getKey(),
                    'branch_id' => $branchId,
                    'granted_by' => $actor->getKey(),
                    'created_at' => now(),
                ], $branchIds));
            }

            $after = $this->snapshot($membership);

            if ($before !== $after) {
                $this->audit->record(AuditAction::BranchAccessUpdated, $membership, $actor, [
                    'user_id' => $membership->user_id,
                    'changes' => ['branch_access' => ['from' => $before, 'to' => $after]],
                ], $company);
            }

            return $membership;
        });
    }

    /**
     * Scope plus the granted branch codes, for audit metadata.
     *
     * @return array{scope: string, branches: list<string>}
     */
    private function snapshot(CompanyMembership $membership): array
    {
        $codes = $membership->branch_scope === BranchScope::Selected
            ? $membership->branches()->orderBy('code')->pluck('code')->all()
            : [];

        return ['scope' => $membership->branch_scope->value, 'branches' => $codes];
    }
}
