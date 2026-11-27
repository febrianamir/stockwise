<?php

namespace App\Http\Resources;

use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A branch as company members (and, read-only, Superadmins) see it. `members_count` is present
 * when selected with Branch::withMembersCount().
 *
 * @mixin Branch
 */
class BranchResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->public_id,
            'name' => $this->name,
            'code' => $this->code,
            'type' => $this->type->value,
            'status' => $this->status->value,
            'address' => $this->address,
            'phone' => $this->phone,
            // Null means the branch uses the company's timezone (BM-9).
            'timezone' => $this->timezone,
            'deactivated_at' => $this->deactivated_at?->toIso8601String(),
            'deactivation_reason' => $this->deactivation_reason,
            'members_count' => $this->when(isset($this->members_count), fn () => (int) $this->members_count),
            'created_at' => $this->created_at?->toIso8601String(),
            // Microseconds: sent back on edit for optimistic concurrency.
            'updated_at' => $this->updated_at?->format('Y-m-d\TH:i:s.uP'),
        ];
    }
}
