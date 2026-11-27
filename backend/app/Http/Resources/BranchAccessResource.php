<?php

namespace App\Http\Resources;

use App\Enums\BranchScope;
use App\Models\CompanyMembership;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A member's branch access (BM-3): the scope and, for `selected`, the granted branches. The
 * Owner is always `all` (BR-3). Expects `branches` loaded.
 *
 * @mixin CompanyMembership
 */
class BranchAccessResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $scope = $this->isOwner() ? BranchScope::All : $this->branch_scope;

        return [
            'membership_id' => $this->id,
            'scope' => $scope->value,
            'is_owner' => $this->isOwner(),
            'branches' => $scope === BranchScope::Selected
                ? $this->branches->sortBy('name')->values()->map(fn ($branch) => [
                    'id' => $branch->public_id,
                    'name' => $branch->name,
                    'code' => $branch->code,
                    'type' => $branch->type->value,
                    'status' => $branch->status->value,
                ])->all()
                : [],
        ];
    }
}
