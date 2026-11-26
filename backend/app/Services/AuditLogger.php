<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Writes `audit_logs` entries with the request's IP and user agent (SEC-5).
 */
class AuditLogger
{
    /**
     * Call inside the transaction that makes the change (docs/architecture/audit-logging.md).
     *
     * @param  array<string, mixed>  $metadata
     */
    public function record(AuditAction $action, ?Model $subject = null, ?User $actor = null, array $metadata = [], ?Company $company = null): AuditLog
    {
        return AuditLog::create([
            'actor_id' => $actor?->getKey(),
            'company_id' => $company?->getKey(),
            'action' => $action,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'metadata' => $metadata === [] ? null : $metadata,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
