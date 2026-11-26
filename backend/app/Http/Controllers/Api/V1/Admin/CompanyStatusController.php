<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReactivateCompanyRequest;
use App\Http\Requests\Admin\SuspendCompanyRequest;
use App\Http\Resources\AdminCompanyDetailResource;
use App\Models\Company;
use App\Services\CompanyService;

class CompanyStatusController extends Controller
{
    public function __construct(private CompanyService $companies) {}

    /**
     * Suspend an active company (PRD §6.5, CM-5 to CM-7, CM-16).
     */
    public function suspend(SuspendCompanyRequest $request, string $companyId): AdminCompanyDetailResource
    {
        $company = $this->companies->suspend($request->user(), Company::findByPublicIdOrFail($companyId), $request->validated('reason'));

        return new AdminCompanyDetailResource($company->loadDetail());
    }

    /**
     * Reactivate a suspended company (PRD §6.6).
     */
    public function reactivate(ReactivateCompanyRequest $request, string $companyId): AdminCompanyDetailResource
    {
        $company = $this->companies->reactivate($request->user(), Company::findByPublicIdOrFail($companyId), $request->validated('note'));

        return new AdminCompanyDetailResource($company->loadDetail());
    }
}
