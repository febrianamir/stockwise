<?php

namespace App\Models;

use App\Enums\OneTimeCodePurpose;
use App\Notifications\VerifyEmailCode;
use App\Services\OneTimeCodeService;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * `is_superadmin` marks the platform Superadmin (business rules §4.1). It is deliberately not fillable.
 */
#[Fillable(['name', 'email', 'phone', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_superadmin' => 'boolean',
        ];
    }

    /**
     * @return HasMany<OneTimeCode, $this>
     */
    public function oneTimeCodes(): HasMany
    {
        return $this->hasMany(OneTimeCode::class);
    }

    /**
     * Send a 6-digit verification code instead of Laravel's signed link.
     */
    public function sendEmailVerificationNotification(): void
    {
        $code = app(OneTimeCodeService::class)->issue($this, OneTimeCodePurpose::EmailVerification);

        $this->notify(new VerifyEmailCode($code));
    }
}
