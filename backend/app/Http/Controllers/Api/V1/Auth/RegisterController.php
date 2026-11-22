<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class RegisterController extends Controller
{
    /**
     * Create an unverified account, email a verification code and log the user in (AUTH-3).
     */
    public function __invoke(RegisterRequest $request, AuditLogger $audit): JsonResponse
    {
        $user = DB::transaction(function () use ($request, $audit): User {
            $user = User::create($request->validated());
            $audit->record(AuditAction::UserRegistered, $user, $user);
            $user->recordLogin();

            return $user;
        });

        $user->sendEmailVerificationNotification();

        $token = $user->createToken('web')->plainTextToken;

        return (new UserResource($user))
            ->additional(['token' => $token])
            ->response()
            ->setStatusCode(201);
    }
}
