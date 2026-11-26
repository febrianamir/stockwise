<?php

namespace App\Http\Middleware;

use App\Enums\MembershipStatus;
use App\Exceptions\ApiException;
use App\Models\Company;
use App\Models\CompanyMembership;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tenant gate for `/api/v1/companies/{company}/…` (docs/architecture/tenancy.md).
 *
 * - Non-members, including Superadmins without a membership, get 404 (CM-15, SEC-4).
 * - Members of a suspended company get 403 COMPANY_SUSPENDED (CM-5).
 * - The company and membership are shared on the request as `company` and `membership`.
 */
class EnsureCompanyMember
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $publicId = $request->route('company');
        $company = is_string($publicId) ? Company::query()->where('public_id', $publicId)->first() : null;

        $membership = $company === null ? null : CompanyMembership::query()
            ->where('company_id', $company->getKey())
            ->where('user_id', $request->user()?->getKey())
            ->where('status', MembershipStatus::Active)
            ->first();

        if ($membership === null) {
            abort(404);
        }

        if ($company->isSuspended()) {
            throw ApiException::companySuspended();
        }

        $request->attributes->set('company', $company);
        $request->attributes->set('membership', $membership->setRelation('company', $company));

        // Controllers receive the resolved company, not the raw route parameter.
        $request->route()?->forgetParameter('company');

        return $next($request);
    }
}
