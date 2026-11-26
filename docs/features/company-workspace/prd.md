# Company workspace: product requirements

**Status:** Implemented (v1)
**Module:** Company management (tenant side)
**Apps:** `backend/` (API), `frontend/` (screens)
**Related:** [ERD](erd.md) · [Platform company management](../company-management/prd.md) · [Business rules](../../business/business-rules.md) · [Tenancy](../../architecture/tenancy.md) · [Audit logging](../../architecture/audit-logging.md)

## 1. Overview

Members see and manage their companies from inside the tenant. This is different from [platform company management](../company-management/prd.md), where Superadmins manage every tenant.

Every member can:

1. See the companies they belong to (My Companies), also on their profile.
2. Open a company and view its profile and members.

Owners and Admins can also:

3. Edit the company profile and settings.
4. Add existing users as members with a role.
5. Change a member's role, and deactivate or reactivate a membership.

## 2. Goals and non-goals

### Goals

- Let a business manage its own team without asking a Superadmin.
- Enforce company permissions on the backend, through permissions rather than role names (business rules §4.2).

### Non-goals (v1)

- Invitations by email, including people without an account. Members are added from existing active accounts (CW-3).
- Removing members permanently. Memberships are deactivated, never deleted (CW-5).
- Assigning or transferring ownership. Ownership moves only through the Superadmin's ownership transfer (CM-13).
- Branch and warehouse access, which comes with Branch Management.
- A company activity log for members. Changes are audited and visible to Superadmins.

## 3. Permissions

Roles map to permissions (`App\Enums\MembershipRole::permissions()`). Routes check permissions with the `company.can:<permission>` middleware.

| Permission | Owner | Admin | Manager | Cashier |
| --- | --- | --- | --- | --- |
| `view-company`: view the profile and the members | ✓ | ✓ | ✓ | ✓ |
| `manage-company`: edit the profile and settings | ✓ | ✓ | — | — |
| `manage-members`: add members, change roles, deactivate and reactivate | ✓ | ✓ | — | — |

These correspond to "Manage company" and "Manage users" in the business rules §4.2.

## 4. Rules

| ID | Rule |
| --- | --- |
| CW-1 | Every active member of an active company can view the company's profile and member list. Non-members get `404`; members of a suspended company get `403 COMPANY_SUSPENDED` (CM-5, CM-15). |
| CW-2 | Members with `manage-company` (Owner, Admin) can edit name, legal name, tax ID, email, phone, address, timezone and currency. `code` and `status` stay platform-only (CM-8). |
| CW-3 | Members with `manage-members` (Owner, Admin) add **existing, active, verified** users by email, with the role Admin, Manager or Cashier. The membership is active immediately. |
| CW-4 | They can change a member's role among Admin, Manager and Cashier, and deactivate or reactivate a membership. Nobody can change the owner's membership or their own here. |
| CW-5 | Memberships are never deleted. A deactivated member loses access to the company on their next request (MB-4) and can be reactivated; adding them again is rejected with a hint to reactivate. |
| CW-6 | Every change is written to `audit_logs` with the company: `company.updated`, `company.member_added`, `company.member_role_changed`, `company.member_deactivated`, `company.member_reactivated` (SEC-5). |
| CW-7 | Profile edits use optimistic concurrency, as on the platform (CM-11): a stale `updated_at` gives `409 STALE_RECORD`. |
| CW-8 | My Companies lists the user's **active** memberships, including suspended companies. Those are shown as suspended and can't be opened (CW-1). |
| CW-9 | The owner role is never assignable here. Ownership only moves through a platform transfer (CM-13). |

## 5. User flows

### 5.1 My Companies

The sidebar's "Workspace" group has "My Companies" (`/companies`), and the profile page has a "My Companies" card. Both list each company with its code, the user's role (the owner is marked) and its status. Active companies link to their page. Suspended companies show a Suspended badge and a note, with no link.

### 5.2 View a company

`/companies/:id` shows the company name, code, status and the user's role, then:

- **Profile:** name, code, legal name, tax ID, email, phone, address, timezone, currency, owner.
- **Members:** name, email, role (owner marked), membership status, joined date. Everyone sees this list.

Users without `manage-company` see no Edit button. Users without `manage-members` see no Add Member button and no row actions. The backend rejects these actions anyway (SEC-2).

### 5.3 Edit the company

"Edit" opens `/companies/:id/edit`, the same form the platform uses, with the code read-only and no owner section. A stale save shows the reload prompt.

### 5.4 Add a member

"Add Member" opens a dialog with the user's email and a role (Admin, Manager or Cashier). Errors explain the case: no active account (ask them to register and verify first), already a member, or a deactivated member (reactivate instead).

### 5.5 Change a member

Each member row (except the owner's and your own) has a menu: change role (Admin, Manager, Cashier), and deactivate or reactivate. Deactivating asks for confirmation:

> **Deactivate This Member?**
> {name} will lose access to {company} immediately. Their account and history are kept, and you can reactivate them later.

## 6. API contract

Tenant routes under `/api/v1/companies/{company}` use `auth:sanctum`, `verified` and `company.member` ([tenancy](../../architecture/tenancy.md)). `{company}` is the ULID `public_id`.

| Method and path | Permission | Body | Success |
| --- | --- | --- | --- |
| `GET /api/v1/companies` | logged in, verified | none | `200` `{ data: MyCompany[] }` |
| `GET /companies/{company}` | `view-company` | none | `200` `{ data: Company }` |
| `PATCH /companies/{company}` | `manage-company` | editable fields + `updated_at` | `200` `{ data: Company }` |
| `GET /companies/{company}/members` | `view-company` | `page` | `200` paginated `CompanyMember[]` |
| `POST /companies/{company}/members` | `manage-members` | `email`, `role` | `201` `{ data: CompanyMember }` |
| `PATCH /companies/{company}/members/{membershipId}` | `manage-members` | `role` and/or `status` | `200` `{ data: CompanyMember }` |

`MyCompany`: `{ id, name, code, status, role, is_owner, joined_at }`.

`Company`: the profile fields, `owner` (`{ id, name, email }`), `members_count`, `created_at`, `updated_at` (microseconds) and `membership` (`{ role, is_owner, permissions: string[] }`).

`CompanyMember`: as on the platform: `{ id, user: { id, name, email, status }, role, status, is_owner, joined_at }`.

Errors: `401` not logged in; `403` unverified, missing permission, or `COMPANY_SUSPENDED`; `404` not a member, or a membership ID from another company; `409 STALE_RECORD`; `422` validation and safeguards (CW-3 to CW-5, CW-9).

## 7. Screens

| Route | Who | Purpose |
| --- | --- | --- |
| `/companies` | Any verified user | My Companies |
| `/companies/:companyId` | Members | Profile and members; Edit and member management for Owners and Admins |
| `/companies/:companyId/edit` | Owners and Admins | Edit profile and settings |

A user who opens a company they don't belong to, or a suspended one, sees the not-found page or a suspended notice.

## 8. Acceptance criteria

- [x] My Companies (page and profile card) lists active memberships, with suspended companies marked and not openable.
- [x] Members of all roles can view the company and its members; non-members get `404`.
- [x] Owners and Admins edit profile and settings; Managers and Cashiers get `403` and see no Edit button.
- [x] Owners and Admins add existing active users with Admin, Manager or Cashier; the owner role is rejected.
- [x] Role changes, deactivation and reactivation work, except on the owner and on yourself; a deactivated member loses access at once.
- [x] Every change is audited with the company.
- [x] Verified in the browser on desktop and mobile with no console errors.

## 9. Open questions

1. **Invitations.** Should members be invited by email, including people without an account, with accept and decline?
2. **Admins and other Admins.** Should an Admin be allowed to deactivate or demote another Admin, or only the Owner?
3. **Activity for members.** Should Owners see the company's activity log inside the workspace?
