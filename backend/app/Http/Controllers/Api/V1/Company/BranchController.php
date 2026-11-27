<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\ListBranchesRequest;
use App\Http\Requests\Company\StoreBranchRequest;
use App\Http\Requests\Company\UpdateBranchRequest;
use App\Http\Resources\BranchResource;
use App\Models\Branch;
use App\Models\Company;
use App\Models\CompanyMembership;
use App\Services\BranchAccessService;
use App\Services\BranchService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

/**
 * A company's branches (docs/features/branch-management/prd.md §9). `company.member` resolved the
 * company and membership; `company.branch` resolved `{branch}` and checked access.
 */
class BranchController extends Controller
{
    public function __construct(private BranchService $branches, private BranchAccessService $access) {}

    /**
     * The branches this member may work in, searched, filtered, sorted and paginated (BM-3).
     */
    public function index(ListBranchesRequest $request): AnonymousResourceCollection
    {
        [$company, $membership] = $this->tenant($request);
        $sort = $request->validated('sort', 'name');
        $direction = $request->validated('direction', $sort === 'created_at' ? 'desc' : 'asc');

        $branches = $this->access->accessibleBranches($company, $membership)
            ->withMembersCount()
            ->search($request->validated('search'))
            ->when($request->validated('status'), fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($request->validated('type'), fn (Builder $query, string $type) => $query->where('type', $type))
            ->when(
                $sort === 'name',
                fn (Builder $query) => $query->orderByRaw('lower(name) '.($direction === 'asc' ? 'asc' : 'desc')),
                fn (Builder $query) => $query->orderBy($sort, $direction),
            )
            ->orderBy('id', $direction)
            ->paginate((int) $request->validated('per_page', ListBranchesRequest::DEFAULT_PER_PAGE))
            ->withQueryString();

        return BranchResource::collection($branches);
    }

    public function store(StoreBranchRequest $request): JsonResponse
    {
        [$company] = $this->tenant($request);

        $branch = $this->branches->create($request->user(), $company, $request->safe()->only(['name', 'code', 'type', 'address', 'phone', 'timezone']));

        return (new BranchResource($this->fresh($company, $branch)))->response()->setStatusCode(201);
    }

    public function show(Request $request): BranchResource
    {
        [$company] = $this->tenant($request);

        return new BranchResource($this->fresh($company, $request->attributes->get('branch')));
    }

    /**
     * Edit the profile; stale edits get 409 STALE_RECORD.
     */
    public function update(UpdateBranchRequest $request): BranchResource
    {
        [$company] = $this->tenant($request);

        $branch = $this->branches->update(
            $request->user(),
            $company,
            $request->branch(),
            $request->safe()->except('updated_at'),
            Carbon::parse($request->validated('updated_at')),
        );

        return new BranchResource($this->fresh($company, $branch));
    }

    /**
     * The branch reloaded with its member count.
     */
    private function fresh(Company $company, Branch $branch): Branch
    {
        return $company->branches()->whereKey($branch->getKey())->withMembersCount()->firstOrFail();
    }

    /**
     * @return array{Company, CompanyMembership}
     */
    private function tenant(Request $request): array
    {
        return [$request->attributes->get('company'), $request->attributes->get('membership')];
    }
}
