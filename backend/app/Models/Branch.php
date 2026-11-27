<?php

namespace App\Models;

use App\Enums\BranchScope;
use App\Enums\BranchStatus;
use App\Enums\BranchType;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use Database\Factories\BranchFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * A store or warehouse of one company (business rules §2.2–2.3, BR-1). Addressed by its ULID
 * `public_id` and always queried through its company, never by a bare ID (tenancy.md). `status`,
 * deactivation fields and `created_by` are set by App\Services\BranchService.
 * See docs/features/branch-management/erd.md.
 */
#[Fillable(['name', 'code', 'type', 'address', 'phone', 'timezone'])]
class Branch extends Model
{
    /** Fields that can change through edit. `code` is immutable (BM-2). */
    public const EDITABLE = ['name', 'type', 'address', 'phone', 'timezone'];

    /** @use HasFactory<BranchFactory> */
    use HasFactory, HasUlids;

    /**
     * Timestamps keep microseconds so stale edits are detected within the same second.
     */
    protected $dateFormat = 'Y-m-d H:i:s.u';

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'type' => BranchType::Store->value,
        'status' => BranchStatus::Active->value,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => BranchType::class,
            'status' => BranchStatus::class,
            'deactivated_at' => 'datetime',
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

    public function isActive(): bool
    {
        return $this->status === BranchStatus::Active;
    }

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Memberships with an explicit access row (scope `selected`). Members with scope `all` and
     * the Owner have access without one (BR-3, BM-3).
     *
     * @return BelongsToMany<CompanyMembership, $this>
     */
    public function grantedMemberships(): BelongsToMany
    {
        return $this->belongsToMany(CompanyMembership::class, 'membership_branch_access', 'branch_id', 'membership_id');
    }

    /**
     * Adds `members_count`: active members who can work here, meaning the Owner, members with scope
     * `all`, and members granted this branch (BR-3, BM-3).
     *
     * @param  Builder<Branch>  $query
     */
    #[Scope]
    protected function withMembersCount(Builder $query): void
    {
        $query->addSelect(['members_count' => CompanyMembership::query()
            ->selectRaw('count(*)')
            ->whereColumn('company_memberships.company_id', 'branches.company_id')
            ->where('company_memberships.status', MembershipStatus::Active)
            ->where(fn (Builder $members) => $members
                ->where('company_memberships.role', MembershipRole::Owner)
                ->orWhere('company_memberships.branch_scope', BranchScope::All)
                ->orWhereExists(fn ($grant) => $grant->selectRaw('1')
                    ->from('membership_branch_access')
                    ->whereColumn('membership_branch_access.membership_id', 'company_memberships.id')
                    ->whereColumn('membership_branch_access.branch_id', 'branches.id'))),
        ]);
    }

    /**
     * Case-insensitive partial match on name and code.
     *
     * @param  Builder<Branch>  $query
     */
    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        $term = trim((string) $term);

        if ($term === '') {
            return;
        }

        $pattern = '%'.addcslashes($term, '%_\\').'%';

        $query->where(fn (Builder $query) => $query->whereLike('name', $pattern)->orWhereLike('code', $pattern));
    }
}
