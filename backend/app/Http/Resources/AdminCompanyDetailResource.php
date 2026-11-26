<?php

namespace App\Http\Resources;

use App\Models\Company;
use Illuminate\Http\Request;

/**
 * A company's full profile for the platform detail page. Expects `ownerMembership.user` and
 * `creator` loaded and `members_count` selected.
 *
 * @mixin Company
 */
class AdminCompanyDetailResource extends AdminCompanyResource
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
            ...parent::toArray($request),
            'legal_name' => $this->legal_name,
            'tax_id' => $this->tax_id,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'timezone' => $this->timezone,
            'currency' => $this->currency,
            'suspended_at' => $this->suspended_at?->toIso8601String(),
            'suspension_reason' => $this->suspension_reason,
            'created_by' => $this->creator ? ['id' => $this->creator->id, 'name' => $this->creator->name] : null,
            // Safety net for the "no active owner" banner; CM-14 normally prevents it.
            'owner_is_active' => $owner !== null && $owner->isActive(),
            // Microseconds: the client sends it back for optimistic concurrency (CM-11).
            'updated_at' => $this->updated_at?->format('Y-m-d\TH:i:s.uP'),
        ];
    }
}
