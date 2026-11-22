<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use App\Services\UserAccountService;
use Illuminate\Http\Request;

class UserStatusController extends Controller
{
    public function __construct(private UserAccountService $accounts) {}

    /**
     * Deactivate the account and revoke its tokens (UM-3 to UM-5).
     */
    public function deactivate(Request $request, int $userId): AdminUserResource
    {
        return new AdminUserResource($this->accounts->deactivate($request->user(), User::query()->findOrFail($userId)));
    }

    /**
     * Restore a deactivated account.
     */
    public function reactivate(Request $request, int $userId): AdminUserResource
    {
        return new AdminUserResource($this->accounts->reactivate($request->user(), User::query()->findOrFail($userId)));
    }
}
