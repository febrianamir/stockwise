<?php

namespace App\Http\Resources;

use App\Models\AuditLog;
use App\Models\CompanyMembership;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One audit entry of a company's activity (docs/architecture/audit-logging.md).
 *
 * @mixin AuditLog
 */
class CompanyActivityResource extends JsonResource
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
            'action' => $this->action->value,
            'occurred_at' => $this->created_at?->toIso8601String(),
            'actor' => $this->actor ? ['id' => $this->actor->id, 'name' => $this->actor->name] : null,
            // For member actions: the member the action was about.
            'member' => $this->subject instanceof CompanyMembership && $this->subject->user
                ? ['id' => $this->subject->user->id, 'name' => $this->subject->user->name]
                : null,
            'metadata' => (object) ($this->metadata ?? []),
        ];
    }
}
