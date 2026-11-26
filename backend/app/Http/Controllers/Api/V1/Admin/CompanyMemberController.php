<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListCompanyMembersRequest;
use App\Http\Resources\CompanyMemberResource;
use App\Models\Company;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CompanyMemberController extends Controller
{
    public const PER_PAGE = 25;

    /**
     * A company's members, owner first (read-only, PRD §6.3). `search` matches name or email;
     * `eligible_owner` keeps only possible new owners, for the transfer dialog (CM-13).
     */
    public function index(ListCompanyMembersRequest $request, string $companyId): AnonymousResourceCollection
    {
        $company = Company::findByPublicIdOrFail($companyId);

        $members = $company->memberships()
            ->with('user')
            ->when($request->validated('search'), fn (Builder $query, string $search) => $query->whereHas('user', fn (Builder $user) => $user->search($search)))
            ->when($request->boolean('eligible_owner'), fn (Builder $query) => $query
                ->where('role', '!=', MembershipRole::Owner)
                ->where('status', MembershipStatus::Active)
                ->whereHas('user', fn (Builder $user) => $user->where('status', UserStatus::Active)->whereNotNull('email_verified_at')))
            ->orderByRaw('role = ? desc', [MembershipRole::Owner->value])
            ->orderBy('created_at')
            ->orderBy('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return CompanyMemberResource::collection($members);
    }
}
