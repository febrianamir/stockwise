<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CompanyActivityResource;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\CompanyMembership;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CompanyActivityController extends Controller
{
    public const PER_PAGE = 25;

    /**
     * The company's audit entries, newest first (PRD §6.3, audit-logging.md).
     */
    public function index(string $companyId): AnonymousResourceCollection
    {
        $company = Company::findByPublicIdOrFail($companyId);

        $entries = AuditLog::query()
            ->with(['actor:id,name', 'subject' => fn (MorphTo $subject) => $subject->morphWith([CompanyMembership::class => ['user:id,name']])])
            ->where('company_id', $company->getKey())
            ->latest('created_at')
            ->latest('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return CompanyActivityResource::collection($entries);
    }
}
