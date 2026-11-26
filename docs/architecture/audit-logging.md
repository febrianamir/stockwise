# Audit logging

Critical actions are recorded in an append-only audit trail (SEC-5). One table and one service serve every feature.

## Storage

`audit_logs` (see the [user management ERD](../features/user-management/erd.md) and the [company management ERD](../features/company-management/erd.md)):

| Column | Meaning |
| --- | --- |
| `actor_id` | User who performed the action; `null` for system actions |
| `action` | `App\Enums\AuditAction` value, e.g. `company.suspended` |
| `subject_type`, `subject_id` | The record the action was performed on |
| `company_id` | The company the entry belongs to, for company-level actions; `null` for platform-wide ones |
| `metadata` | JSON with the details below |
| `ip_address`, `user_agent`, `created_at` | Request context and time |

Rows are never updated or deleted by the application.

## When to audit

Audit actions that change access, ownership, money or stock, or that someone may later need to explain. Today:

- **Accounts:** `user.registered`, `user.created`, `user.email_verified`, `user.deactivated`, `user.reactivated`, `user.superadmin_granted`, `user.superadmin_revoked`.
- **Companies:** `company.created`, `company.updated`, `company.suspended`, `company.reactivated`, `company.ownership_transferred`.
- **Members:** `company.member_added`, `company.member_role_changed`, `company.member_deactivated`, `company.member_reactivated` (subject: the membership).

Logins are tracked on `users.last_login_at`, not audited row by row.

## How to write an entry

```php
DB::transaction(function () use ($actor, $company): void {
    // … change the data …
    $this->audit->record(AuditAction::CompanySuspended, $company, $actor, ['reason' => $reason], $company);
});
```

- Use `App\Services\AuditLogger::record(action, subject, actor, metadata, company)`. It captures the request IP and user agent.
- Write the entry **inside the same transaction** as the change. If the audit write fails, the change rolls back, and a rolled-back change leaves no entry.
- Don't audit no-ops: if nothing changed (an edit with identical values, a rejected state transition), write nothing.

## Action names

`<resource>.<past-tense verb>`, lowercase with underscores: `company.ownership_transferred`. Add the case to `AuditAction` and the frontend label maps when you introduce one.

## Metadata

Keep it small and useful for a human reading the history:

| Situation | Keys |
| --- | --- |
| Field edits | `changes: { field: { from, to } }`, only changed fields |
| Actions with a reason or note | `reason` / `note` |
| Status changes | `previous_status` (and the new one if not implied) |
| Ownership | `previous_owner_id`, `new_owner_id`, `previous_owner_role` |
| Creation | the initial values that matter (e.g. `code`, `owner_id`) |

Never store secrets (passwords, tokens, codes) in metadata.

## Reading the trail

- A user's account activity: entries where the subject is that user (`AdminUserDetailResource`).
- A company's activity: entries where `company_id` is that company (`GET /admin/companies/{id}/activity`), newest first, paginated.
