<?php

namespace App\Http\Resources;

use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A company in platform lists (docs/features/company-management/prd.md §7).
 * Expects `ownerMembership.user` loaded and `members_count` selected.
 *
 * @mixin Company
 */
class AdminCompanyResource extends JsonResource
{
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
            'owner' => $owner ? [
                'id' => $owner->id,
                'name' => $owner->name,
                'email' => $owner->email,
                'status' => $owner->status->value,
            ] : null,
            'members_count' => (int) ($this->members_count ?? 0),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
