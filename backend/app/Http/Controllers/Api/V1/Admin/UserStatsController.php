<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class UserStatsController extends Controller
{
    /**
     * Platform-wide user counts, in a single query.
     */
    public function __invoke(): JsonResponse
    {
        $counts = User::query()
            ->toBase()
            ->selectRaw('count(*) as total')
            ->selectRaw('count(*) filter (where status = ?) as active', [UserStatus::Active->value])
            ->selectRaw('count(*) filter (where status = ?) as inactive', [UserStatus::Inactive->value])
            ->selectRaw('count(*) filter (where status = ?) as pending', [UserStatus::Pending->value])
            ->selectRaw('count(*) filter (where email_verified_at is null) as unverified')
            ->first();

        return response()->json([
            'data' => array_map('intval', (array) $counts),
        ]);
    }
}
