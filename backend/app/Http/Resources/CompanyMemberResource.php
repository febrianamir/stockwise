<?php

namespace App\Http\Resources;

use App\Models\CompanyMembership;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A company membership with its user. Used by the platform company detail page (read-only,
 * company-management PRD §6.3) and the company workspace members list (company-workspace PRD §6).
 *
 * @mixin CompanyMembership
 */
class CompanyMemberResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'status' => $this->user->status->value,
            ],
            'role' => $this->role->value,
            'status' => $this->status->value,
            'is_owner' => $this->isOwner(),
            // The Owner reaches every branch whatever is stored (BR-3, BM-3).
            'branch_scope' => $this->isOwner() ? 'all' : $this->branch_scope->value,
            'joined_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
