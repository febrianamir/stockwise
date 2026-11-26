<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListCompaniesRequest;
use App\Http\Requests\Admin\StoreCompanyRequest;
use App\Http\Requests\Admin\UpdateCompanyRequest;
use App\Http\Resources\AdminCompanyDetailResource;
use App\Http\Resources\AdminCompanyResource;
use App\Models\Company;
use App\Services\CompanyService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

/**
 * Platform company management (docs/features/company-management/prd.md). Superadmin only (CM-1);
 * companies are looked up by public ID after authorization.
 */
class CompanyController extends Controller
{
    public function __construct(private CompanyService $companies) {}

    /**
     * Search, filter, sort and paginate every company (CM-12).
     */
    public function index(ListCompaniesRequest $request): AnonymousResourceCollection
    {
        $sort = $request->validated('sort', 'created_at');
        $direction = $request->validated('direction', 'desc');

        $companies = Company::query()
            ->with('ownerMembership.user')
            ->withActiveMembersCount()
            ->search($request->validated('search'))
            ->when($request->validated('status'), fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($request->validated('created_from'), fn (Builder $query, string $date) => $query->where('created_at', '>=', Carbon::parse($date)->startOfDay()))
            ->when($request->validated('created_to'), fn (Builder $query, string $date) => $query->where('created_at', '<=', Carbon::parse($date)->endOfDay()))
            ->when(
                $sort === 'name',
                fn (Builder $query) => $query->orderByRaw('lower(name) '.($direction === 'asc' ? 'asc' : 'desc')),
                fn (Builder $query) => $query->orderBy('created_at', $direction),
            )
            ->orderBy('id', $direction)
            ->paginate((int) $request->validated('per_page', ListCompaniesRequest::DEFAULT_PER_PAGE))
            ->withQueryString();

        return AdminCompanyResource::collection($companies);
    }

    /**
     * Create a company with its owner in one transaction (PRD §6.2).
     */
    public function store(StoreCompanyRequest $request): JsonResponse
    {
        $company = $this->companies->create(
            $request->user(),
            $request->safe()->except('owner_user_id'),
            (int) $request->validated('owner_user_id'),
        );

        return (new AdminCompanyDetailResource($company->loadDetail()))->response()->setStatusCode(201);
    }

    public function show(string $companyId): AdminCompanyDetailResource
    {
        return new AdminCompanyDetailResource(Company::findByPublicIdOrFail($companyId)->loadDetail());
    }

    /**
     * Edit the profile; stale edits get 409 STALE_RECORD (CM-11).
     */
    public function update(UpdateCompanyRequest $request, string $companyId): AdminCompanyDetailResource
    {
        $company = $this->companies->update(
            $request->user(),
            Company::findByPublicIdOrFail($companyId),
            $request->safe()->except('updated_at'),
            Carbon::parse($request->validated('updated_at')),
        );

        return new AdminCompanyDetailResource($company->loadDetail());
    }
}
