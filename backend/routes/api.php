<?php

use App\Http\Controllers\Api\V1\Auth\AuthenticatedTokenController;
use App\Http\Controllers\Api\V1\Auth\EmailVerificationController;
use App\Http\Controllers\Api\V1\Auth\PasswordResetController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\PasswordController;
use App\Http\Controllers\Api\V1\ProfileController;
use Illuminate\Support\Facades\Route;

/*
| Authentication and account endpoints: see docs/features/auth/prd.md §7.
| Business routes added later must also use the `verified` middleware (AUTH-14).
*/

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::prefix('auth')->name('auth.')->group(function () {
        Route::post('/register', RegisterController::class)
            ->middleware('throttle:register')
            ->name('register');

        Route::post('/login', [AuthenticatedTokenController::class, 'store'])
            ->middleware('throttle:login')
            ->name('login');

        Route::post('/password/forgot', [PasswordResetController::class, 'forgot'])
            ->middleware('throttle:otp-send')
            ->name('password.forgot');

        Route::post('/password/reset', [PasswordResetController::class, 'reset'])
            ->middleware('throttle:otp-verify')
            ->name('password.reset');

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [AuthenticatedTokenController::class, 'destroy'])->name('logout');

            Route::post('/email/verify', [EmailVerificationController::class, 'verify'])
                ->middleware('throttle:otp-verify')
                ->name('email.verify');

            Route::post('/email/resend', [EmailVerificationController::class, 'resend'])
                ->middleware('throttle:otp-send')
                ->name('email.resend');
        });
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/user', [ProfileController::class, 'show'])->name('user');
        Route::patch('/user', [ProfileController::class, 'update'])->name('user.update');
        Route::put('/user/password', [PasswordController::class, 'update'])->name('user.password');
    });
});
