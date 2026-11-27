<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\BranchResource;
use App\Models\Company;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * A company's branches, read-only, for the platform company detail page (company-management PRD,
 * CM-12). Superadmins never manage branches through tenant routes (CM-15).
 */
class CompanyBranchController extends Controller
{
    public const PER_PAGE = 25;

    public function index(string $companyId): AnonymousResourceCollection
    {
        $branches = Company::findByPublicIdOrFail($companyId)->branches()
            ->withMembersCount()
            ->orderByRaw('lower(name)')
            ->orderBy('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return BranchResource::collection($branches);
    }
}
