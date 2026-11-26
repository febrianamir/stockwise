<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\CompanyStatus;
use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\JsonResponse;

class CompanyStatsController extends Controller
{
    /**
     * Platform-wide company counts, in a single query.
     */
    public function __invoke(): JsonResponse
    {
        $counts = Company::query()
            ->toBase()
            ->selectRaw('count(*) as total')
            ->selectRaw('count(*) filter (where status = ?) as active', [CompanyStatus::Active->value])
            ->selectRaw('count(*) filter (where status = ?) as suspended', [CompanyStatus::Suspended->value])
            ->first();

        return response()->json(['data' => array_map('intval', (array) $counts)]);
    }
}
