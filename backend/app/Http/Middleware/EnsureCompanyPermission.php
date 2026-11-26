<?php

namespace App\Http\Middleware;

use App\Enums\CompanyPermission;
use App\Models\CompanyMembership;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * `company.can:<permission>`: requires a company permission on tenant routes. Runs after
 * `company.member`, which resolves the membership (docs/architecture/tenancy.md).
 */
class EnsureCompanyPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $membership = $request->attributes->get('membership');

        if (! $membership instanceof CompanyMembership || ! $membership->hasPermission(CompanyPermission::from($permission))) {
            abort(403, "You don't have permission to do this in this company.");
        }

        return $next($request);
    }
}
