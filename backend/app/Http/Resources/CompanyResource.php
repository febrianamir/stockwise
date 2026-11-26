<?php

namespace App\Http\Resources;

use App\Models\Company;
use App\Models\CompanyMembership;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A company as its members see it, with the viewer's role and permissions (CW-1).
 * Expects `ownerMembership.user` loaded and `members_count` selected.
 *
 * @mixin Company
 */
class CompanyResource extends JsonResource
{
    public function __construct(Company $company, private CompanyMembership $membership)
    {
        parent::__construct($company);
    }

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $owner = $this->ownerMembership?->user;

        return [
            'id' => $this->public_id,
            'name' => $this->name,
            'code' => $this->code,
            'status' => $this->status->value,
            'legal_name' => $this->legal_name,
            'tax_id' => $this->tax_id,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'timezone' => $this->timezone,
            'currency' => $this->currency,
            'owner' => $owner ? ['id' => $owner->id, 'name' => $owner->name, 'email' => $owner->email] : null,
            'members_count' => (int) ($this->members_count ?? 0),
            'created_at' => $this->created_at?->toIso8601String(),
            // Microseconds: sent back on edit for optimistic concurrency (CW-7).
            'updated_at' => $this->updated_at?->format('Y-m-d\TH:i:s.uP'),
            'membership' => [
                'role' => $this->membership->role->value,
                'is_owner' => $this->membership->isOwner(),
                'permissions' => $this->membership->permissionNames(),
            ],
        ];
    }
}
