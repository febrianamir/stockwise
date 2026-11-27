<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Enums\BranchStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\BranchResource;
use App\Services\BranchAccessService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * The branches the current member can work in, active first (PRD §6, "My branches"). Any active
 * member. The client's chosen branch is only a UI preference; the backend checks every request.
 */
class MyBranchController extends Controller
{
    public function __invoke(Request $request, BranchAccessService $access): AnonymousResourceCollection
    {
        $branches = $access->accessibleBranches($request->attributes->get('company'), $request->attributes->get('membership'))
            ->orderByRaw('status = ? desc', [BranchStatus::Active->value])
            ->orderByRaw('lower(name)')
            ->orderBy('id')
            ->get();

        return BranchResource::collection($branches);
    }
}
