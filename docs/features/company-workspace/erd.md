# Company workspace: database structure

**Related:** [PRD](prd.md) · [Company management ERD](../company-management/erd.md) · [Audit logging](../../architecture/audit-logging.md)

This feature adds **no tables**. It works on the tables from [platform company management](../company-management/erd.md):

| Table | How this feature uses it |
| --- | --- |
| `companies` | Members read it; Owners and Admins update the profile fields (`name`, `legal_name`, `tax_id`, `email`, `phone`, `address`, `timezone`, `currency`). `updated_at` (microseconds) drives optimistic concurrency (CW-7). |
| `company_memberships` | My Companies reads the user's active rows. Adding a member inserts a row (`role` admin, manager or cashier; `status` active; `branch_scope` from the role, BM-4). Changes update `role` or `status`. Rows are never deleted (CW-5). The one-owner index and the role check stay in force. `branch_scope` is changed by [branch management](../branch-management/erd.md). |
| `audit_logs` | `company.member_added`, `company.member_role_changed`, `company.member_deactivated`, `company.member_reactivated` (subject: the membership) and `company.updated` (subject: the company), all with `company_id`. |

## Permissions

Permissions aren't stored. They're derived from `company_memberships.role` in code (`App\Enums\MembershipRole::permissions()`), so changing the mapping needs no migration. A future custom-roles feature may move this to tables (`roles`, `role_permissions`).

## Constraints that matter here

- `UNIQUE (company_id, user_id)`: adding someone who is already a member, active or not, is rejected before the insert (CW-5).
- `company_memberships_one_owner` and `CHECK (role IN …)`: the owner role is never assigned through member management (CW-9), and the database would reject a second owner anyway.
