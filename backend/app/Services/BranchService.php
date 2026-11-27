<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\BranchStatus;
use App\Exceptions\ApiException;
use App\Models\Branch;
use App\Models\Company;
use App\Models\User;
use BackedEnum;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Branch lifecycle inside a company (docs/features/branch-management/prd.md §6). The company
 * always comes from the resolved tenant, never from input (SEC-3). Every change is audited in the
 * same transaction (SEC-5).
 */
class BranchService
{
    public function __construct(private AuditLogger $audit) {}

    /**
     * Create an active branch. Members with scope `all` and the Owner reach it at once (BM-3).
     *
     * @param  array<string, mixed>  $attributes  fields from PRD §5
     */
    public function create(User $actor, Company $company, array $attributes): Branch
    {
        return DB::transaction(function () use ($actor, $company, $attributes): Branch {
            $branch = new Branch($attributes);
            $branch->company()->associate($company);
            $branch->forceFill(['status' => BranchStatus::Active, 'created_by' => $actor->getKey()])->save();

            $this->audit->record(AuditAction::BranchCreated, $branch, $actor, [
                'name' => $branch->name,
                'code' => $branch->code,
                'type' => $branch->type->value,
            ], $company);

            return $branch;
        });
    }

    /**
     * Edit profile fields. Rejects stale edits with 409 STALE_RECORD and records only changed fields.
     *
     * @param  array<string, mixed>  $attributes  editable fields only
     */
    public function update(User $actor, Company $company, Branch $branch, array $attributes, Carbon $loadedUpdatedAt): Branch
    {
        return DB::transaction(function () use ($actor, $company, $branch, $attributes, $loadedUpdatedAt): Branch {
            $branch = $company->branches()->whereKey($branch->getKey())->lockForUpdate()->firstOrFail();

            if (! $branch->updated_at->equalTo($loadedUpdatedAt)) {
                throw ApiException::staleRecord();
            }

            $branch->fill(array_intersect_key($attributes, array_flip(Branch::EDITABLE)));

            if (! $branch->isDirty()) {
                return $branch;
            }

            $changes = [];
            foreach ($branch->getDirty() as $field => $value) {
                $original = $branch->getOriginal($field);
                $changes[$field] = [
                    'from' => $original instanceof BackedEnum ? $original->value : $original,
                    'to' => $value instanceof BackedEnum ? $value->value : $value,
                ];
            }

            $branch->save();

            $this->audit->record(AuditAction::BranchUpdated, $branch, $actor, ['changes' => $changes], $company);

            return $branch;
        });
    }

    /**
     * Deactivate an active branch (BR-4, BM-6). Access grants are kept so reactivation restores
     * them. A conditional update makes concurrent requests produce exactly one change.
     */
    public function deactivate(User $actor, Company $company, Branch $branch, string $reason): Branch
    {
        return DB::transaction(function () use ($actor, $company, $branch, $reason): Branch {
            $updated = $company->branches()
                ->whereKey($branch->getKey())
                ->where('status', BranchStatus::Active)
                ->update([
                    'status' => BranchStatus::Inactive,
                    'deactivated_at' => now(),
                    'deactivation_reason' => $reason,
                    'updated_at' => now(),
                ]);

            if ($updated === 0) {
                throw ApiException::invalidStatusTransition('Only an active branch can be deactivated.');
            }

            $branch->refresh();

            $this->audit->record(AuditAction::BranchDeactivated, $branch, $actor, [
                'reason' => $reason,
                'previous_status' => BranchStatus::Active->value,
            ], $company);

            return $branch;
        });
    }

    /**
     * Reactivate an inactive branch; its access grants work again unchanged.
     */
    public function reactivate(User $actor, Company $company, Branch $branch): Branch
    {
        return DB::transaction(function () use ($actor, $company, $branch): Branch {
            $previousReason = $company->branches()->whereKey($branch->getKey())->lockForUpdate()->value('deactivation_reason');

            $updated = $company->branches()
                ->whereKey($branch->getKey())
                ->where('status', BranchStatus::Inactive)
                ->update([
                    'status' => BranchStatus::Active,
                    'deactivated_at' => null,
                    'deactivation_reason' => null,
                    'updated_at' => now(),
                ]);

            if ($updated === 0) {
                throw ApiException::invalidStatusTransition('Only an inactive branch can be reactivated.');
            }

            $branch->refresh();

            $this->audit->record(AuditAction::BranchReactivated, $branch, $actor, array_filter([
                'previous_reason' => $previousReason,
                'previous_status' => BranchStatus::Inactive->value,
            ], fn ($value) => $value !== null && $value !== ''), $company);

            return $branch;
        });
    }
}
