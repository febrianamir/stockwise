<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\TransferOwnershipRequest;
use App\Http\Resources\AdminCompanyDetailResource;
use App\Models\Company;
use App\Services\CompanyService;

class CompanyOwnershipController extends Controller
{
    /**
     * Transfer ownership to an active member (PRD §6.7, CM-13).
     */
    public function transfer(TransferOwnershipRequest $request, string $companyId, CompanyService $companies): AdminCompanyDetailResource
    {
        $company = $companies->transferOwnership(
            $request->user(),
            Company::findByPublicIdOrFail($companyId),
            (int) $request->validated('user_id'),
            $request->validated('reason'),
        );

        return new AdminCompanyDetailResource($company->loadDetail());
    }
}
