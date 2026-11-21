<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\OneTimeCodePurpose;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\VerifyEmailRequest;
use App\Http\Resources\UserResource;
use App\Services\OneTimeCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EmailVerificationController extends Controller
{
    public function __construct(private OneTimeCodeService $oneTimeCodes) {}

    /**
     * Verify the user's email with the emailed code.
     */
    public function verify(VerifyEmailRequest $request): UserResource
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            throw ValidationException::withMessages([
                'code' => 'Your email address is already verified.',
            ]);
        }

        if (! $this->oneTimeCodes->consume($user, OneTimeCodePurpose::EmailVerification, $request->validated('code'))) {
            throw ValidationException::withMessages([
                'code' => 'The code is invalid or has expired.',
            ]);
        }

        $user->markEmailAsVerified();

        return new UserResource($user);
    }

    /**
     * Email a new verification code, at most once per cooldown period (AUTH-7).
     */
    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            throw ValidationException::withMessages([
                'email' => 'Your email address is already verified.',
            ]);
        }

        $retryAfter = $this->oneTimeCodes->secondsUntilResendAllowed($user, OneTimeCodePurpose::EmailVerification);

        if ($retryAfter > 0) {
            return response()->json([
                'message' => "Please wait {$retryAfter} seconds before requesting a new code.",
                'retry_after' => $retryAfter,
            ], 429, ['Retry-After' => $retryAfter]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'We sent a new verification code to your email.',
        ], 202);
    }
}
