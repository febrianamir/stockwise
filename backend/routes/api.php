<?php

use App\Http\Controllers\Api\V1\Admin\CompanyActivityController;
use App\Http\Controllers\Api\V1\Admin\CompanyController;
use App\Http\Controllers\Api\V1\Admin\CompanyMemberController;
use App\Http\Controllers\Api\V1\Admin\CompanyOwnershipController;
use App\Http\Controllers\Api\V1\Admin\CompanyStatsController;
use App\Http\Controllers\Api\V1\Admin\CompanyStatusController;
use App\Http\Controllers\Api\V1\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\V1\Admin\UserStatsController as AdminUserStatsController;
use App\Http\Controllers\Api\V1\Admin\UserStatusController as AdminUserStatusController;
use App\Http\Controllers\Api\V1\Admin\UserSuperadminController as AdminUserSuperadminController;
use App\Http\Controllers\Api\V1\Auth\AuthenticatedTokenController;
use App\Http\Controllers\Api\V1\Auth\EmailVerificationController;
use App\Http\Controllers\Api\V1\Auth\PasswordResetController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Company\CompanyController as MemberCompanyController;
use App\Http\Controllers\Api\V1\Company\MemberController;
use App\Http\Controllers\Api\V1\Company\MyCompanyController;
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

        // Platform company management: docs/features/company-management/prd.md §7.
        Route::get('/companies/stats', CompanyStatsController::class)->name('companies.stats');
        Route::get('/companies', [CompanyController::class, 'index'])->name('companies.index');
        Route::post('/companies', [CompanyController::class, 'store'])->name('companies.store');
        Route::get('/companies/{companyId}', [CompanyController::class, 'show'])->whereUlid('companyId')->name('companies.show');
        Route::patch('/companies/{companyId}', [CompanyController::class, 'update'])->whereUlid('companyId')->name('companies.update');
        Route::post('/companies/{companyId}/suspend', [CompanyStatusController::class, 'suspend'])->whereUlid('companyId')->name('companies.suspend');
        Route::post('/companies/{companyId}/reactivate', [CompanyStatusController::class, 'reactivate'])->whereUlid('companyId')->name('companies.reactivate');
        Route::post('/companies/{companyId}/transfer-ownership', [CompanyOwnershipController::class, 'transfer'])->whereUlid('companyId')->name('companies.transfer-ownership');
        Route::get('/companies/{companyId}/members', [CompanyMemberController::class, 'index'])->whereUlid('companyId')->name('companies.members');
        Route::get('/companies/{companyId}/activity', [CompanyActivityController::class, 'index'])->whereUlid('companyId')->name('companies.activity');
    });

    /*
    | Company-scoped (tenant) routes: docs/architecture/tenancy.md. Add tenant modules here. The
    | `company.member` middleware returns 404 to non-members and 403 COMPANY_SUSPENDED for suspended
    | companies, and puts the company and membership on $request->attributes.
    */
    // The current user's companies (not tenant-scoped: it lists memberships across companies).
    Route::get('/companies', MyCompanyController::class)->middleware(['auth:sanctum', 'verified'])->name('companies.mine');

    Route::prefix('companies/{company}')
        ->name('companies.')
        ->middleware(['auth:sanctum', 'verified', 'company.member'])
        ->group(function () {
            // Company workspace: docs/features/company-workspace/prd.md §7.
            Route::get('/', [MemberCompanyController::class, 'show'])->name('show');
            Route::patch('/', [MemberCompanyController::class, 'update'])->middleware('company.can:manage-company')->name('update');
            Route::get('/members', [MemberController::class, 'index'])->name('members.index');
            Route::post('/members', [MemberController::class, 'store'])->middleware('company.can:manage-members')->name('members.store');
            Route::patch('/members/{membershipId}', [MemberController::class, 'update'])
                ->whereNumber('membershipId')
                ->middleware('company.can:manage-members')
                ->name('members.update');
        });
});
