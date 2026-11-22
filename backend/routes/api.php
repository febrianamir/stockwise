<?php

use App\Http\Controllers\Api\V1\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\V1\Admin\UserStatsController as AdminUserStatsController;
use App\Http\Controllers\Api\V1\Admin\UserStatusController as AdminUserStatusController;
use App\Http\Controllers\Api\V1\Admin\UserSuperadminController as AdminUserSuperadminController;
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

    /*
    | Platform user management: docs/features/user-management/prd.md §7. Superadmin only (UM-1):
    | authentication (401) and authorization (403) are separate checks. Users are looked up in the
    | controllers (not route model binding) so non-Superadmins get 403, never a revealing 404.
    */
    Route::prefix('admin')->name('admin.')->middleware(['auth:sanctum', 'verified', 'can:administer-platform'])->group(function () {
        Route::get('/users/stats', AdminUserStatsController::class)->name('users.stats');
        Route::get('/users', [AdminUserController::class, 'index'])->name('users.index');
        Route::post('/users', [AdminUserController::class, 'store'])->name('users.store');
        Route::get('/users/{userId}', [AdminUserController::class, 'show'])->whereNumber('userId')->name('users.show');
        Route::post('/users/{userId}/deactivate', [AdminUserStatusController::class, 'deactivate'])->whereNumber('userId')->name('users.deactivate');
        Route::post('/users/{userId}/reactivate', [AdminUserStatusController::class, 'reactivate'])->whereNumber('userId')->name('users.reactivate');
        Route::put('/users/{userId}/superadmin', [AdminUserSuperadminController::class, 'update'])->whereNumber('userId')->name('users.superadmin');
    });
});
