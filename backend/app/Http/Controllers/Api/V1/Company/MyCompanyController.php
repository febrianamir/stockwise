<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Enums\MembershipStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\MyCompanyResource;
use App\Models\CompanyMembership;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MyCompanyController extends Controller
{
    /**
     * The current user's active memberships, including suspended companies (shown as such, CW-8).
     */
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $memberships = $request->user()->memberships()
            ->where('status', MembershipStatus::Active)
            ->with('company')
            ->get()
            ->sortBy(fn (CompanyMembership $membership) => mb_strtolower($membership->company->name))
            ->values();

        return MyCompanyResource::collection($memberships);
    }
}
