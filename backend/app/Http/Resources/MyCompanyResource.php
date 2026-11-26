<?php

namespace App\Http\Resources;

use App\Models\CompanyMembership;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One of the current user's companies (docs/features/company-workspace/prd.md §7). Wraps an
 * active membership with its company loaded.
 *
 * @mixin CompanyMembership
 */
class MyCompanyResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->company->public_id,
            'name' => $this->company->name,
            'code' => $this->company->code,
            'status' => $this->company->status->value,
            'role' => $this->role->value,
            'is_owner' => $this->isOwner(),
            'joined_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
