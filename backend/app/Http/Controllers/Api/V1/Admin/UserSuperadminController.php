<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSuperadminRequest;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use App\Services\UserAccountService;

class UserSuperadminController extends Controller
{
    /**
     * Grant or revoke the platform Superadmin flag (UM-4 to UM-6).
     */
    public function update(UpdateSuperadminRequest $request, int $userId, UserAccountService $accounts): AdminUserResource
    {
        $user = User::query()->findOrFail($userId);

        return new AdminUserResource($accounts->setSuperadmin($request->user(), $user, $request->boolean('is_superadmin')));
    }
}
