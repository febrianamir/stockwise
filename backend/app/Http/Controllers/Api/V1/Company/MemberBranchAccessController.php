<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Enums\BranchScope;
use App\Http\Controllers\Controller;
use App\Http\Requests\Company\UpdateBranchAccessRequest;
use App\Http\Resources\BranchAccessResource;
use App\Models\Company;
use App\Models\CompanyMembership;
use App\Services\BranchAccessService;
use Illuminate\Http\Request;

/**
 * A member's branch access (PRD §6, BM-5). Needs `manage-branch-access`. Memberships are looked up
 * inside this company, so an ID from another company is a 404 (SEC-4).
 */
class MemberBranchAccessController extends Controller
{
    public function __construct(private BranchAccessService $access) {}

    public function show(Request $request, string $membershipId): BranchAccessResource
    {
        return new BranchAccessResource($this->membership($request, $membershipId)->load('branches'));
    }

    public function update(UpdateBranchAccessRequest $request, string $membershipId): BranchAccessResource
    {
        $company = $this->company($request);

        $membership = $this->access->replaceAccess(
            $request->user(),
            $company,
            $this->membership($request, $membershipId),
            BranchScope::from($request->validated('scope')),
            array_map('strtolower', $request->validated('branch_ids', [])),
        );

        return new BranchAccessResource($membership->load('branches'));
    }

    private function membership(Request $request, string $membershipId): CompanyMembership
    {
        return $this->company($request)->memberships()->whereKey($membershipId)->firstOrFail();
    }

    private function company(Request $request): Company
    {
        return $request->attributes->get('company');
    }
}
