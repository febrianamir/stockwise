<?php

namespace App\Models;

use App\Enums\AuditAction;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\OneTimeCodePurpose;
use App\Enums\UserStatus;
use App\Notifications\VerifyEmailCode;
use App\Services\AuditLogger;
use App\Services\OneTimeCodeService;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * `is_superadmin` marks the platform Superadmin (business rules §4.1) and `status` is the account
 * lifecycle (docs/features/user-management/prd.md §3). Both are deliberately not fillable.
 */
#[Fillable(['name', 'email', 'phone', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Defaults that match the database, so new models have them before a refresh.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'pending',
        'is_superadmin' => false,
    ];

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
            'status' => UserStatus::class,
            'last_login_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<CompanyMembership, $this>
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(CompanyMembership::class);
    }

    /**
     * Companies this user owns (each company has exactly one owner, CM-3).
     *
     * @return BelongsToMany<Company, $this>
     */
    public function ownedCompanies(): BelongsToMany
    {
        return $this->belongsToMany(Company::class, 'company_memberships')
            ->wherePivot('role', MembershipRole::Owner->value);
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

    public function isActive(): bool
    {
        return $this->status === UserStatus::Active;
    }

    public function isInactive(): bool
    {
        return $this->status === UserStatus::Inactive;
    }

    /**
     * Mark the email verified. A pending account becomes active on its first verification;
     * an inactive (deactivated) account stays inactive (PRD §3).
     */
    public function markEmailAsVerified(): bool
    {
        if ($this->hasVerifiedEmail()) {
            return true;
        }

        $this->email_verified_at = $this->freshTimestamp();

        if ($this->status === UserStatus::Pending) {
            $this->status = UserStatus::Active;
        }

        $saved = $this->save();

        app(AuditLogger::class)->record(AuditAction::UserEmailVerified, $this, $this);

        return $saved;
    }

    /**
     * Record a successful login without touching `updated_at` (UM-11).
     */
    public function recordLogin(): void
    {
        $this->timestamps = false;
        $this->forceFill(['last_login_at' => $this->freshTimestamp()])->saveQuietly();
        $this->timestamps = true;
    }

    /**
     * Load `companies_count` on an already retrieved user.
     */
    public function loadActiveCompaniesCount(): static
    {
        return $this->loadCount(['memberships as companies_count' => fn (Builder $memberships) => $memberships->where('status', MembershipStatus::Active)]);
    }

    /**
     * Number of active company memberships, as `companies_count`.
     *
     * @param  Builder<User>  $query
     */
    #[Scope]
    protected function withActiveCompaniesCount(Builder $query): void
    {
        $query->withCount(['memberships as companies_count' => fn (Builder $memberships) => $memberships->where('status', MembershipStatus::Active)]);
    }

    /**
     * Case-insensitive partial match on name and email; a numeric term also matches the ID (UM-8).
     *
     * @param  Builder<User>  $query
     */
    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        $term = trim((string) $term);

        if ($term === '') {
            return;
        }

        $pattern = '%'.addcslashes($term, '%_\\').'%';

        $query->where(function (Builder $query) use ($term, $pattern): void {
            $query->whereLike('name', $pattern)->orWhereLike('email', $pattern);

            if (ctype_digit($term) && strlen($term) <= 18) {
                $query->orWhere('id', (int) $term);
            }
        });
    }
}
