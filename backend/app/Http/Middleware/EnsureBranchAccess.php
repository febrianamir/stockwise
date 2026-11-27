<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use App\Models\Company;
use App\Models\CompanyMembership;
use App\Services\BranchAccessService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * `company.branch`: the branch gate for `/api/v1/companies/{company}/branches/{branch}/…`
 * (docs/architecture/tenancy.md, "Branch context"). Runs after `company.member`.
 *
 * - The branch is loaded by public ID **and** the resolved company: a branch of another company
 *   is a 404, never a 403 (SEC-4, BM-10).
 * - A member without access to it gets 403 BRANCH_ACCESS_DENIED (BR-3, BM-3).
 * - The branch is shared on the request as `branch`; controllers never read a branch ID from input.
 */
class EnsureBranchAccess
{
    public function __construct(private BranchAccessService $access) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $company = $request->attributes->get('company');
        $membership = $request->attributes->get('membership');
        $publicId = $request->route('branch');

        $branch = $company instanceof Company && is_string($publicId)
            ? $company->branches()->where('public_id', strtolower($publicId))->first()
            : null;

        if ($branch === null || ! $membership instanceof CompanyMembership) {
            abort(404);
        }

        if (! $this->access->canAccess($membership, $branch)) {
            throw ApiException::branchAccessDenied();
        }

        $request->attributes->set('branch', $branch->setRelation('company', $company));

        // Controllers receive the resolved branch, not the raw route parameter.
        $request->route()?->forgetParameter('branch');

        return $next($request);
    }
}
