<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\DeactivateBranchRequest;
use App\Http\Resources\BranchResource;
use App\Services\BranchService;
use Illuminate\Http\Request;

/**
 * Deactivate and reactivate a branch (PRD §6, BR-4, BM-6). Needs `manage-branches` and access to
 * the branch.
 */
class BranchStatusController extends Controller
{
    public function __construct(private BranchService $branches) {}

    public function deactivate(DeactivateBranchRequest $request): BranchResource
    {
        $branch = $this->branches->deactivate(
            $request->user(),
            $request->attributes->get('company'),
            $request->attributes->get('branch'),
            $request->validated('reason'),
        );

        return new BranchResource($branch);
    }

    public function reactivate(Request $request): BranchResource
    {
        $branch = $this->branches->reactivate(
            $request->user(),
            $request->attributes->get('company'),
            $request->attributes->get('branch'),
        );

        return new BranchResource($branch);
    }
}
