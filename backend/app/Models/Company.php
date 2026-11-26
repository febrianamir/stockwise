<?php

namespace App\Models;

use App\Enums\CompanyStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use Database\Factories\CompanyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * A tenant (business rules §2.1). Addressed by its ULID `public_id`; `status`, suspension fields
 * and `created_by` are set by App\Services\CompanyService, not mass assignment.
 * See docs/features/company-management/erd.md.
 */
#[Fillable(['name', 'code', 'legal_name', 'tax_id', 'email', 'phone', 'address', 'timezone', 'currency'])]
class Company extends Model
{
    /** Profile fields a Superadmin may edit (PRD §4). `code` is immutable (CM-8). */
    public const EDITABLE = ['name', 'legal_name', 'tax_id', 'email', 'phone', 'address', 'timezone', 'currency'];

    /** @use HasFactory<CompanyFactory> */
    use HasFactory, HasUlids;

    /**
     * Timestamps keep microseconds so stale edits are detected within the same second (CM-11).
     */
    protected $dateFormat = 'Y-m-d H:i:s.u';

    /** Matches the column default in the companies migration (PRD §4). */
    public const DEFAULT_CURRENCY = 'IDR';

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => CompanyStatus::Active->value,
        'currency' => self::DEFAULT_CURRENCY,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => CompanyStatus::class,
            'suspended_at' => 'datetime',
        ];
    }

    /**
     * The ULID goes in `public_id`; `id` stays an auto-increment key.
     *
     * @return array<int, string>
     */
    public function uniqueIds(): array
    {
        return ['public_id'];
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    /**
     * Platform controllers look companies up after authorization, by public ID (api-conventions).
     */
    public static function findByPublicIdOrFail(string $publicId): self
    {
        return static::query()->where('public_id', $publicId)->firstOrFail();
    }

    /**
     * Relations and counts the platform detail resource needs.
     */
    public function loadDetail(): static
    {
        return $this->load(['ownerMembership.user', 'creator'])
            ->loadCount(['memberships as members_count' => fn (Builder $memberships) => $memberships->where('status', MembershipStatus::Active)]);
    }

    public function isSuspended(): bool
    {
        return $this->status === CompanyStatus::Suspended;
    }

    /**
     * @return HasMany<CompanyMembership, $this>
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(CompanyMembership::class);
    }

    /**
     * @return HasOne<CompanyMembership, $this>
     */
    public function ownerMembership(): HasOne
    {
        return $this->hasOne(CompanyMembership::class)->where('role', MembershipRole::Owner);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Case-insensitive partial match on name, code, legal name, email and the owner's email (PRD §6.1).
     *
     * @param  Builder<Company>  $query
     */
    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        $term = trim((string) $term);

        if ($term === '') {
            return;
        }

        $pattern = '%'.addcslashes($term, '%_\\').'%';

        $query->where(function (Builder $query) use ($pattern): void {
            $query->whereLike('name', $pattern)
                ->orWhereLike('code', $pattern)
                ->orWhereLike('legal_name', $pattern)
                ->orWhereLike('email', $pattern)
                ->orWhereHas('ownerMembership.user', fn (Builder $owner) => $owner->whereLike('email', $pattern));
        });
    }

    /**
     * Count of active memberships, for lists.
     *
     * @param  Builder<Company>  $query
     */
    #[Scope]
    protected function withActiveMembersCount(Builder $query): void
    {
        $query->withCount(['memberships as members_count' => fn (Builder $memberships) => $memberships->where('status', MembershipStatus::Active)]);
    }
}
