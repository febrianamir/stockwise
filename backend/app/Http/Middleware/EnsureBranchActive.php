<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use App\Models\Branch;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * `branch.active`: rejects writes in an inactive branch with 403 BRANCH_INACTIVE, while reads
 * (history, reports) keep working (BR-4, WH-4, BM-6). Runs after `company.branch`.
 *
 * For operational branch routes (stock, sales, receipts…). Branch management routes don't use it,
 * so an inactive branch can still be viewed, edited and reactivated.
 */
class EnsureBranchActive
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $branch = $request->attributes->get('branch');

        if ($branch instanceof Branch && ! $branch->isActive() && ! $request->isMethodSafe()) {
            throw ApiException::branchInactive();
        }

        return $next($request);
    }
}
