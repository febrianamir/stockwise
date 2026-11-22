<?php

namespace App\Http\Resources;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * A user's details plus account activity, newest first (PRD §6.3).
 *
 * @mixin User
 */
class AdminUserDetailResource extends AdminUserResource
{
    /** Most recent audit entries returned as activity (PRD §6.3). */
    public const ACTIVITY_LIMIT = 100;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $activity = AuditLog::query()
            ->with('actor:id,name')
            ->where('subject_type', $this->resource->getMorphClass())
            ->where('subject_id', $this->id)
            ->latest('created_at')
            ->latest('id')
            ->limit(self::ACTIVITY_LIMIT)
            ->get()
            ->map(fn (AuditLog $log): array => [
                'id' => $log->id,
                'action' => $log->action->value,
                'occurred_at' => $log->created_at?->toIso8601String(),
                'actor' => $log->actor ? ['id' => $log->actor->id, 'name' => $log->actor->name] : null,
            ]);

        if ($this->last_login_at !== null) {
            $activity->push([
                'id' => null,
                'action' => 'user.last_login',
                'occurred_at' => $this->last_login_at->toIso8601String(),
                'actor' => null,
            ]);
        }

        return [
            ...parent::toArray($request),
            'activity' => $activity->sortByDesc('occurred_at')->values()->all(),
        ];
    }
}
