<?php

namespace App\Models;

use App\Enums\CompanyPermission;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use Database\Factories\CompanyMembershipFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Links a global user to a company with a role (business rules §2.5). Exactly one `owner` per
 * company, enforced by a partial unique index (CM-3).
 */
#[Fillable(['company_id', 'user_id', 'role', 'status'])]
class CompanyMembership extends Model
{
    /** @use HasFactory<CompanyMembershipFactory> */
    use HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'active',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'role' => MembershipRole::class,
            'status' => MembershipStatus::class,
        ];
    }

    public function isOwner(): bool
    {
        return $this->role === MembershipRole::Owner;
    }

    public function hasPermission(CompanyPermission $permission): bool
    {
        return $this->isActive() && in_array($permission, $this->role->permissions(), true);
    }

    /**
     * @return list<string>
     */
    public function permissionNames(): array
    {
        return array_map(fn (CompanyPermission $permission) => $permission->value, $this->isActive() ? $this->role->permissions() : []);
    }

    public function isActive(): bool
    {
        return $this->status === MembershipStatus::Active;
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
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
