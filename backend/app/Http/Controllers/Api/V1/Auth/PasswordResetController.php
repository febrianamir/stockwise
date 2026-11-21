<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\OneTimeCodePurpose;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use App\Notifications\ResetPasswordCode;
use App\Services\OneTimeCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    public function __construct(private OneTimeCodeService $oneTimeCodes) {}

    /**
     * Email a reset code when the account exists. Always answers the same way (AUTH-9).
     */
    public function forgot(ForgotPasswordRequest $request): JsonResponse
    {
        $user = User::query()->where('email', $request->validated('email'))->first();

        if ($user !== null && $this->oneTimeCodes->secondsUntilResendAllowed($user, OneTimeCodePurpose::PasswordReset) === 0) {
            $code = $this->oneTimeCodes->issue($user, OneTimeCodePurpose::PasswordReset);

            $user->notify(new ResetPasswordCode($code));
        }

        return response()->json([
            'message' => "If an account exists for that email, we've sent a code.",
        ], 202);
    }

    /**
     * Set a new password with the emailed code, then revoke every token (AUTH-10).
     */
    public function reset(ResetPasswordRequest $request): Response
    {
        $user = User::query()->where('email', $request->validated('email'))->first();

        if ($user === null || ! $this->oneTimeCodes->consume($user, OneTimeCodePurpose::PasswordReset, $request->validated('code'))) {
            throw ValidationException::withMessages([
                'code' => 'The code is invalid or has expired.',
            ]);
        }

        DB::transaction(function () use ($user, $request): void {
            $user->password = $request->validated('password');

            if (! $user->hasVerifiedEmail()) {
                $user->email_verified_at = now();
            }

            $user->save();
            $user->tokens()->delete();
        });

        return response()->noContent();
    }
}
