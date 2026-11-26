<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Company\AddMemberRequest;
use App\Http\Requests\Company\UpdateMemberRequest;
use App\Http\Resources\CompanyMemberResource;
use App\Models\Company;
use App\Services\MembershipService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Company members (docs/features/company-workspace/prd.md §6). Viewing is open to every member;
 * changes need `manage-members` (Owner, Admin).
 */
class MemberController extends Controller
{
    public const PER_PAGE = 25;

    public function __construct(private MembershipService $memberships) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $members = $this->company($request)->memberships()
            ->with('user')
            ->orderByRaw('role = ? desc', [MembershipRole::Owner->value])
            ->orderByRaw('status = ? desc', [MembershipStatus::Active->value])
            ->orderBy('created_at')
            ->orderBy('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return CompanyMemberResource::collection($members);
    }

    public function store(AddMemberRequest $request): JsonResponse
    {
        $membership = $this->memberships->add(
            $request->user(),
            $this->company($request),
            $request->validated('email'),
            MembershipRole::from($request->validated('role')),
        );

        return (new CompanyMemberResource($membership))->response()->setStatusCode(201);
    }

    /**
     * Change a member's role or status. Memberships are looked up inside this company, so an ID
     * from another company is a 404 (SEC-4).
     */
    public function update(UpdateMemberRequest $request, string $membershipId): CompanyMemberResource
    {
        $company = $this->company($request);
        $membership = $company->memberships()->whereKey($membershipId)->firstOrFail();

        $role = $request->validated('role');
        $status = $request->validated('status');

        return new CompanyMemberResource($this->memberships->update(
            $request->user(),
            $company,
            $membership,
            $role !== null ? MembershipRole::from($role) : null,
            $status !== null ? MembershipStatus::from($status) : null,
        ));
    }

    private function company(Request $request): Company
    {
        return $request->attributes->get('company');
    }
}
