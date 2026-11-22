<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListUsersRequest;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Resources\AdminUserDetailResource;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use App\Services\UserAccountService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

/**
 * Platform user management (docs/features/user-management/prd.md). Superadmin only (UM-1).
 */
class UserController extends Controller
{
    /**
     * Search, filter, sort and paginate every user on the platform (UM-8, UM-9).
     */
    public function index(ListUsersRequest $request): AnonymousResourceCollection
    {
        $sort = $request->validated('sort', 'created_at');
        $direction = $request->validated('direction', 'desc');

        $users = User::query()
            ->search($request->validated('search'))
            ->when($request->validated('status'), fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($request->validated('verification') === 'verified', fn (Builder $query) => $query->whereNotNull('email_verified_at'))
            ->when($request->validated('verification') === 'unverified', fn (Builder $query) => $query->whereNull('email_verified_at'))
            ->when($request->validated('created_from'), fn (Builder $query, string $date) => $query->where('created_at', '>=', Carbon::parse($date)->startOfDay()))
            ->when($request->validated('created_to'), fn (Builder $query, string $date) => $query->where('created_at', '<=', Carbon::parse($date)->endOfDay()))
            ->when(
                $sort === 'last_login_at',
                fn (Builder $query) => $query->orderByRaw('last_login_at '.($direction === 'asc' ? 'asc' : 'desc').' nulls last'),
                fn (Builder $query) => $query->orderBy($sort, $direction),
            )
            ->orderBy('id', $direction)
            ->paginate((int) $request->validated('per_page', ListUsersRequest::DEFAULT_PER_PAGE))
            ->withQueryString();

        return AdminUserResource::collection($users);
    }

    /**
     * Create a pending account with an initial password (UM-7).
     */
    public function store(StoreUserRequest $request, UserAccountService $accounts): JsonResponse
    {
        $user = $accounts->create($request->user(), $request->validated());

        return (new AdminUserResource($user->refresh()))->response()->setStatusCode(201);
    }

    /**
     * A user's details and account activity.
     */
    public function show(int $userId): AdminUserDetailResource
    {
        return new AdminUserDetailResource(User::query()->findOrFail($userId));
    }
}
