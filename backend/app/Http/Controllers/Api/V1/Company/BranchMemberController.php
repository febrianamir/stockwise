<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Enums\MembershipRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\CompanyMemberResource;
use App\Services\BranchAccessService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Active members who can work in a branch: the Owner, members with scope `all` and those granted
 * it (PRD §6). Members with scope `all` are shown as "All Branches" by the client.
 */
class BranchMemberController extends Controller
{
    public const PER_PAGE = 25;

    public function index(Request $request, BranchAccessService $access): AnonymousResourceCollection
    {
        $members = $access->membersWithAccess($request->attributes->get('company'), $request->attributes->get('branch'))
            ->with('user')
            ->orderByRaw('role = ? desc', [MembershipRole::Owner->value])
            ->orderBy('created_at')
            ->orderBy('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return CompanyMemberResource::collection($members);
    }
}
