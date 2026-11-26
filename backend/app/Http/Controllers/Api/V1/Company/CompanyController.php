<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\UpdateCompanyProfileRequest;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use App\Models\CompanyMembership;
use App\Services\CompanyService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * A company from its members' side (docs/features/company-workspace/prd.md). Tenant routes:
 * `company.member` has resolved the company and the viewer's membership.
 */
class CompanyController extends Controller
{
    /**
     * Any active member can view the company (CW-1).
     */
    public function show(Request $request): CompanyResource
    {
        [$company, $membership] = $this->tenant($request);

        return new CompanyResource($company->loadDetail(), $membership);
    }

    /**
     * Owners and Admins edit the profile and settings (CW-2, `company.can:manage-company`).
     */
    public function update(UpdateCompanyProfileRequest $request, CompanyService $companies): CompanyResource
    {
        [$company, $membership] = $this->tenant($request);

        $company = $companies->update(
            $request->user(),
            $company,
            $request->safe()->except('updated_at'),
            Carbon::parse($request->validated('updated_at')),
        );

        return new CompanyResource($company->loadDetail(), $membership);
    }

    /**
     * @return array{Company, CompanyMembership}
     */
    private function tenant(Request $request): array
    {
        return [$request->attributes->get('company'), $request->attributes->get('membership')];
    }
}
