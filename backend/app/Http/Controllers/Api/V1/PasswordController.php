<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdatePasswordRequest;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class PasswordController extends Controller
{
    /**
     * Change the password and log out every other device (AUTH-11).
     */
    public function update(UpdatePasswordRequest $request): Response
    {
        $user = $request->user();
        $currentTokenId = $user->currentAccessToken()->getKey();

        DB::transaction(function () use ($user, $request, $currentTokenId): void {
            $user->update(['password' => $request->validated('password')]);
            $user->tokens()->whereKeyNot($currentTokenId)->delete();
        });

        return response()->noContent();
    }
}
