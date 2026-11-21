<?php

namespace App\Services;

use App\Enums\OneTimeCodePurpose;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Issues and checks emailed one-time codes (AUTH-4 to AUTH-8 in docs/features/auth/prd.md).
 */
class OneTimeCodeService
{
    /**
     * Create a new code for the user and purpose, replacing earlier ones, and return the plain code.
     */
    public function issue(User $user, OneTimeCodePurpose $purpose): string
    {
        $length = (int) config('auth.one_time_codes.length');
        $code = str_pad((string) random_int(0, 10 ** $length - 1), $length, '0', STR_PAD_LEFT);

        DB::transaction(function () use ($user, $purpose, $code): void {
            $user->oneTimeCodes()->where('purpose', $purpose)->delete();

            $user->oneTimeCodes()->create([
                'purpose' => $purpose,
                'code_hash' => self::hash($code),
                'expires_at' => now()->addMinutes((int) config('auth.one_time_codes.ttl_minutes')),
            ]);
        });

        return $code;
    }

    /**
     * Check a code and consume it when it matches. Wrong guesses count towards the attempt limit.
     */
    public function consume(User $user, OneTimeCodePurpose $purpose, string $code): bool
    {
        return DB::transaction(function () use ($user, $purpose, $code): bool {
            $oneTimeCode = $user->oneTimeCodes()
                ->where('purpose', $purpose)
                ->whereNull('consumed_at')
                ->where('expires_at', '>', now())
                ->where('attempts', '<', (int) config('auth.one_time_codes.max_attempts'))
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if ($oneTimeCode === null) {
                return false;
            }

            if (! hash_equals($oneTimeCode->code_hash, self::hash($code))) {
                $oneTimeCode->increment('attempts');

                return false;
            }

            $oneTimeCode->update(['consumed_at' => now()]);

            return true;
        });
    }

    /**
     * Seconds the user must wait before another code can be sent for the purpose (AUTH-7).
     */
    public function secondsUntilResendAllowed(User $user, OneTimeCodePurpose $purpose): int
    {
        $latest = $user->oneTimeCodes()->where('purpose', $purpose)->latest('id')->first();

        if ($latest === null) {
            return 0;
        }

        $availableAt = $latest->created_at->addSeconds((int) config('auth.one_time_codes.resend_cooldown_seconds'));

        return max(0, (int) ceil(now()->diffInSeconds($availableAt, false)));
    }

    /**
     * Keyed hash of a plain code. Only the hash is stored.
     */
    public static function hash(string $code): string
    {
        return hash_hmac('sha256', $code, (string) config('app.key'));
    }
}
