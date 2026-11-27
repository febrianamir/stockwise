# Platform company management: product requirements

**Status:** Approved (v1), implemented
**Module:** Platform administration
**Apps:** `backend/` (API), `frontend/` (screens)
**Related:** [ERD](erd.md) · [User management PRD](../user-management/prd.md) · [Business rules](../../business/business-rules.md) · [Tenancy](../../architecture/tenancy.md) · [API conventions](../../architecture/api-conventions.md) · [Audit logging](../../architecture/audit-logging.md)

Based on the draft in `planning-features/company-management.md` (v2). This document records the decisions taken on its open questions and is the source of truth.

## 1. Purpose

Stockwise is multi-tenant: each tenant is a **company** (business rules §2.1). This feature gives platform **Superadmins** the tools to manage tenants as a whole: create them with an owner, find and inspect them, edit their profile, suspend and reactivate them, and transfer ownership.

It is a **platform** feature. It is different from the later **Company Management** feature, where a company's own users manage members, roles and settings from inside the tenant.

| Feature | Who | What it manages |
| --- | --- | --- |
| Platform company management (this PRD) | Superadmin | Tenants: existence, owner, status, profile |
| [Platform user management](../user-management/prd.md) | Superadmin | Global user accounts |
| [Company workspace](../company-workspace/prd.md) | Owner and Admins | Members, roles, company settings |
| [Branch management](../branch-management/prd.md) | Owner and Admins | Branches and branch access |

## 2. Goals and non-goals

### Goals

- Create a company and give it an owner in one atomic operation.
- Find any company quickly and see its status, owner and members.
- Suspend a company so none of its members can operate in it, and reactivate it later with no data loss.
- Record every administrative change in the audit log with actor, reason and before/after values.
- Enforce tenant isolation and authorization on the backend, with tests.

### Non-goals

- Billing, plans, trials; company self-sign-up.
- Adding, removing or changing members and roles (later Company Management). Members are **read-only** here.
- Managing branches. Superadmins only read them on a **Branches** tab ([branch management](../branch-management/prd.md) §8.5); Owners and Admins manage them in the workspace (CM-15).
- Hard deletion (CM-9), a `closed`/archived status, impersonation, data export.

## 3. Decisions

| Topic | Decision |
| --- | --- |
| Owner model | A membership with role `owner`. The database allows **exactly one** owner per company (partial unique index). |
| Owner source | An existing **active** user, picked from Platform User Management's user list. New people are created there first (UM-7). |
| Owner account deactivation | Blocked while the user owns a company (MB-5, CM-14). Transfer ownership first. |
| Statuses | `active`, `suspended`. |
| Suspension effect | Blocks every company-scoped request for every member (CM-5). Doesn't touch sessions or accounts (CM-6). |
| Default branch | None is created. |
| Ownership transfer | In scope, Superadmin only. The previous owner becomes `admin`. |
| Superadmin storage | `users.is_superadmin` and the `administer-platform` gate, shared with user management. |
| Timezone and currency | Company level only. |
| Identifiers | Companies are addressed by a ULID `public_id`. `code` is human-readable and never used for security. |
| `code` | Immutable after creation. |
| API | `/api/v1/admin/companies`, Laravel error shape plus `code` ([API conventions](../../architecture/api-conventions.md)). |
| Tenant resolution | URL prefix `/api/v1/companies/{company}/…` with the `company.member` middleware ([tenancy](../../architecture/tenancy.md)). |

## 4. Company data

| Field | Required | Editable | Rules |
| --- | --- | --- | --- |
| `name` | Yes | Yes | 2–150 characters, trimmed. Not unique. |
| `code` | Yes | **No** | 3–40 characters: lowercase `a-z`, `0-9`, `-`, starting with a letter. Globally unique, case-insensitive. |
| `legal_name` | No | Yes | Up to 200 characters. |
| `tax_id` | No | Yes | Up to 50 characters (e.g. NPWP). Format validation deferred. |
| `email` | No | Yes | Valid email. Contact address, not a login. |
| `phone` | No | Yes | Up to 30 characters. |
| `address` | No | Yes | Free text, up to 500 characters. |
| `timezone` | Yes | Yes | Valid IANA zone, e.g. `Asia/Makassar`. Default `Asia/Jakarta`. |
| `currency` | Yes | Yes | ISO 4217 code. Default `IDR`. Becomes locked once financial transactions exist (Stage 5). |
| `status` | System | Suspend and reactivate only | `active` or `suspended`. |
| `suspended_at`, `suspension_reason` | System | Suspend and reactivate only | Set on suspend, cleared on reactivate. History lives in the audit log. |
| `created_by` | System | No | The Superadmin who created the company. |

## 5. Rules

| ID | Rule |
| --- | --- |
| CM-1 | Only an active, verified Superadmin can use platform company endpoints (`can:administer-platform`). Guests get `401`, everyone else `403`. |
| CM-2 | Superadmin comes from the platform flag on the user, never from a company membership or role (UM-2). |
| CM-3 | Every company has **exactly one** owner at all times (CO-1). Creation without an owner is impossible; ownership only moves. The database enforces at most one owner per company. |
| CM-4 | The owner must be an **active** user (verified and not deactivated) when assigned, at creation or transfer. |
| CM-5 | While a company is suspended, every company-scoped request (`/api/v1/companies/{company}/…`) is rejected with `403` and `code: COMPANY_SUSPENDED`, for every member including the owner. Platform routes still let Superadmins view and reactivate it. |
| CM-6 | Suspension doesn't revoke tokens or deactivate accounts. Users are global; their access to other companies is unaffected. |
| CM-7 | Suspension and reactivation never modify, delete or hide business data or memberships. |
| CM-8 | `code` is globally unique (case-insensitive), matches the format in §4, and can't be changed after creation. |
| CM-9 | Companies are never hard-deleted. |
| CM-10 | Every create, edit, suspend, reactivate and ownership transfer writes an audit entry in the same transaction as the change. If the audit write fails, the change is rolled back. No-ops write nothing. |
| CM-11 | Edits carry the `updated_at` the client loaded. If the company changed since, the edit is rejected with `409 STALE_RECORD`. |
| CM-12 | Platform list and detail endpoints are the only place cross-tenant reads are allowed, and only for Superadmins. Tenant features never reuse them. |
| CM-13 | Ownership is transferred to an **active member** of the company whose account is active. In one transaction the previous owner becomes `admin` and the new owner becomes `owner`; a reason is required. |
| CM-14 | A user who owns a company can't be deactivated in Platform User Management until ownership is transferred (MB-5). |
| CM-15 | On tenant routes, a user without an active membership gets `404`, including Superadmins (SEC-4). |
| CM-16 | Suspend and reactivate are only valid from `active` and `suspended` respectively. Anything else is `409 INVALID_STATUS_TRANSITION` with no change and no audit entry. Concurrent requests produce exactly one change. |

## 6. User flows

### 6.1 Find companies

`/admin/companies` shows stat cards (Total, Active, Suspended), a search box (name, code, legal name, company email, owner email; partial and case-insensitive), a status filter (All, Active, Suspended), a created-date range, and the table. Sorting by name or created date, newest first by default; 25 per page, up to 100. State lives in the URL.

### 6.2 Create a company

"New Company" opens `/admin/companies/new`, a single page with three sections:

1. **Company Details:** name, code, legal name, tax ID, email, phone, address.
2. **Business Settings:** timezone and currency (searchable pickers).
3. **Owner:** a searchable picker over active users ("Name, email or user ID"). Users must exist already; a link points to Users to create one.

The API creates the company (`active`), the owner membership and the audit entry in one transaction. On success the app opens the company with a toast. Field errors show inline.

### 6.3 Inspect a company

`/admin/companies/:id` shows the name, code, status badge and the actions (Edit, Suspend or Reactivate, Transfer Ownership), with tabs:

- **Overview:** all fields in §4, suspension reason and date when suspended, owner, created by and created at. A warning banner appears if the owner's account isn't active (a safety net; CM-14 normally prevents it).
- **Members:** read-only, paginated: name, email, company role, membership status, account status, joined date. The owner is listed first and marked; names link to the user in Platform User Management.
- **Activity:** the company's audit entries, newest first: action, actor, time, reason or note, and changed fields as before → after.

### 6.4 Edit

`/admin/companies/:id/edit` reuses the form without the code and owner fields (code is shown read-only). Only changed fields are sent and audited. If someone else saved first, the page explains it and offers to reload.

### 6.5 Suspend

From an active company. The dialog explains the effects, asks for a reason (10–500 characters), and enables "Suspend Company" only after the Superadmin types the company code.

> **Suspend This Company?**
> Members of {name}, including the owner, will immediately lose access to this company. Their accounts stay active and they can keep using other companies. No data is changed, and you can reactivate the company at any time.

### 6.6 Reactivate

From a suspended company, with an optional note (up to 500 characters). Members regain access on their next request.

### 6.7 Transfer ownership

From the detail page. The dialog has a searchable picker over the company's eligible members (active membership, active account, not the current owner), searched on the server so large companies work, asks for a reason (10–500 characters), and explains that the current owner becomes Admin. If there are no eligible members, the dialog says so: Owners and Admins add members in the [company workspace](../company-workspace/prd.md).

## 7. API contract

Base `/api/v1/admin`, middleware `auth:sanctum`, `verified`, `can:administer-platform`. `{company}` is the `public_id`.

| Method and path | Body or query | Success |
| --- | --- | --- |
| `GET /companies` | `search`, `status`, `created_from`, `created_to`, `sort` (`name`, `created_at`), `direction`, `per_page`, `page` | `200` paginated `AdminCompany[]` |
| `GET /companies/stats` | none | `200` `{ data: { total, active, suspended } }` |
| `POST /companies` | §4 fields + `owner_user_id` | `201` `{ data: AdminCompanyDetail }` |
| `GET /companies/{company}` | none | `200` `{ data: AdminCompanyDetail }` |
| `PATCH /companies/{company}` | editable §4 fields + `updated_at` | `200` `{ data: AdminCompanyDetail }` |
| `POST /companies/{company}/suspend` | `reason` | `200` `{ data: AdminCompanyDetail }` |
| `POST /companies/{company}/reactivate` | `note` (optional) | `200` `{ data: AdminCompanyDetail }` |
| `POST /companies/{company}/transfer-ownership` | `user_id`, `reason` | `200` `{ data: AdminCompanyDetail }` |
| `GET /companies/{company}/members` | `page`, `search` (name or email), `eligible_owner` (only active members with an active account who aren't the owner) | `200` paginated `CompanyMember[]` |
| `GET /companies/{company}/activity` | `page`, `per_page` | `200` paginated `CompanyActivity[]` |
| `GET /companies/{company}/branches` | `page` | `200` paginated `Branch[]`, read-only ([branch management](../branch-management/prd.md) §9) |

`AdminCompany`:

```json
{
  "id": "01JDX3Y5T6M8Q2W4E7R9T1Y3V5",
  "name": "Toko Sejahtera",
  "code": "toko-sejahtera",
  "status": "active",
  "owner": { "id": 12, "name": "Andi", "email": "andi@example.com", "status": "active" },
  "members_count": 3,
  "created_at": "2026-11-26T03:00:00+00:00"
}
```

`AdminCompanyDetail` adds `legal_name`, `tax_id`, `email`, `phone`, `address`, `timezone`, `currency`, `suspended_at`, `suspension_reason`, `created_by` (`{ id, name }` or `null`), `owner_is_active` and `updated_at` (with microseconds, e.g. `2026-11-26T03:00:00.123456+00:00`; send it back unchanged on `PATCH`).

`CompanyMember`: `{ id, user: { id, name, email, status }, role, status, is_owner, joined_at }`.

`CompanyActivity`: `{ id, action, occurred_at, actor: { id, name } | null, member: { id, name } | null, metadata }`; `member` is set for member actions from the [company workspace](../company-workspace/prd.md), where `metadata` may hold `changes` (`{ field: { from, to } }`), `reason`, `note`, `previous_status`, `previous_owner_id`, `new_owner_id`.

### Errors

| Status | When | `code` |
| --- | --- | --- |
| `401` | Not authenticated | none |
| `403` | Not an active, verified Superadmin | none |
| `404` | Unknown company | none |
| `409` | Suspend/reactivate from the wrong state; stale edit | `INVALID_STATUS_TRANSITION`, `STALE_RECORD` |
| `422` | Validation (field errors), inactive owner, duplicate code, attempt to change `code`/`status`, invalid transfer target | none |

## 8. Tenant routes

Company-scoped modules live under `/api/v1/companies/{company}/…` behind `company.member` ([tenancy](../../architecture/tenancy.md)). For this feature the group has no endpoints yet; its behaviour (CM-5, CM-6, CM-15) is covered by tests with test-only routes.

## 9. Screens

| Route | Purpose |
| --- | --- |
| `/admin/companies` | List, search, filters, stats |
| `/admin/companies/new` | Create a company with an owner |
| `/admin/companies/:companyId` | Details with Overview, Members, Branches (read-only) and Activity tabs, and the actions |
| `/admin/companies/:companyId/edit` | Edit the profile |

All are Superadmin-only (others see the not-found page) and appear as "Companies" in the sidebar's Platform Admin group. Status badges: Active → `success`, Suspended → `destructive`.

## 10. States

- **Loading:** skeleton cards and rows; previous results stay visible while a page or filter loads.
- **Empty:** "No companies match these filters." with Clear Filters, or "No companies yet." with New Company.
- **Errors:** inline field errors on forms; dialogs keep their input and show the error; a stale edit shows a reload prompt; list, stats and tabs fail independently with a retry action.
- **Mutations:** spinners on buttons, toasts on success.

## 11. Acceptance criteria

### Backend

- [x] Guests get `401` and non-Superadmins (including company owners) get `403` on every endpoint; Superadmins see companies from all tenants.
- [x] Creating with an active owner gives `201`, an `active` company, exactly one owner membership and a `company.created` audit row.
- [x] An inactive owner, a duplicate code in any case, or an invalid timezone or currency gives `422` and persists nothing.
- [x] A failure while writing the audit entry rolls back the whole creation.
- [x] Editing changes and audits only the changed fields; `code` or `status` gives `422`; a stale `updated_at` gives `409 STALE_RECORD`; a no-op writes nothing.
- [x] Suspending needs a 10–500 character reason; suspending twice gives `409 INVALID_STATUS_TRANSITION` with one audit row.
- [x] Reactivating clears the suspension fields and leaves memberships unchanged.
- [x] On tenant routes, members of a suspended company get `403 COMPANY_SUSPENDED`; a user in two companies keeps access to the other one with the same token; non-members and Superadmins without a membership get `404`.
- [x] Ownership transfer swaps the roles in one transaction; non-members, inactive members, inactive accounts and the current owner are rejected with `422`.
- [x] The database rejects a second owner, a duplicate code (case-insensitive), an invalid role or status, and a duplicate membership, even when bypassing validation.
- [x] Deactivating a user who owns a company gives `422` (CM-14).

### Frontend

- [x] List, search, filters, sorting and pagination work and are kept in the URL.
- [x] Create, edit (with stale handling), suspend (type-to-confirm), reactivate and transfer work with feedback.
- [x] Members, Branches and Activity tabs show the read-only data; activity names the member or branch an entry is about.
- [x] Only Superadmins see the Companies nav item and pages.
- [x] Verified in the browser on desktop and mobile with no console errors.

## 12. Open questions

1. **Read-only suspension.** Should a suspended company's owner be able to read or export data instead of being fully blocked?
2. **Closing a business.** Is a `closed`/archived status needed for businesses that stop permanently (data retention)?
3. ~~**Per-branch timezone.**~~ Answered: a branch may set its own timezone; without one it uses the company's ([branch management](../branch-management/prd.md) BM-9).
4. **Fallback role on transfer.** The previous owner becomes `admin`. Should the Superadmin be able to choose the role (or remove the membership) once member management exists?
