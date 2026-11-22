<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Password::defaults(fn (): Password => Password::min(8)->letters()->numbers());

        $this->configureRateLimiting();
        $this->configureAccountAccess();
    }

    /**
     * Deactivated accounts can't use any token, even one that survived revocation (UM-3).
     * Platform administration is a Superadmin-only gate that no company role feeds (UM-1, UM-2).
     */
    private function configureAccountAccess(): void
    {
        Sanctum::authenticateAccessTokensUsing(
            fn (PersonalAccessToken $token, bool $isValid): bool => $isValid
                && ! ($token->tokenable instanceof User && $token->tokenable->isInactive()),
        );

        Gate::define('administer-platform', fn (User $user): bool => $user->is_superadmin && $user->isActive());
    }

    /**
     * Auth rate limits (docs/features/auth/prd.md §7.3).
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('login', fn (Request $request): Limit => Limit::perMinute(5)
            ->by(self::emailKey($request).'|'.$request->ip())
            ->response(self::tooManyAttempts(...)));

        RateLimiter::for('register', fn (Request $request): Limit => Limit::perMinute(10)
            ->by($request->ip())
            ->response(self::tooManyAttempts(...)));

        RateLimiter::for('otp-send', fn (Request $request): Limit => Limit::perMinute(3)
            ->by(($request->user()?->getKey() ?? self::emailKey($request)).'|'.$request->ip())
            ->response(self::tooManyAttempts(...)));

        RateLimiter::for('otp-verify', fn (Request $request): Limit => Limit::perMinute(10)
            ->by(($request->user()?->getKey() ?? self::emailKey($request)).'|'.$request->ip())
            ->response(self::tooManyAttempts(...)));
    }

    private static function emailKey(Request $request): string
    {
        return Str::transliterate(Str::lower((string) $request->input('email')));
    }

    /**
     * @param  array<string, int|string>  $headers
     */
    private static function tooManyAttempts(Request $request, array $headers): JsonResponse
    {
        $retryAfter = (int) ($headers['Retry-After'] ?? 60);

        return response()->json([
            'message' => "Too many attempts. Please try again in {$retryAfter} seconds.",
            'retry_after' => $retryAfter,
        ], 429, $headers);
    }
}
