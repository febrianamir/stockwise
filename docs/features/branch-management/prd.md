# Branch management: product requirements

**Status:** Implemented (v1)
**Module:** Company and location setup (tenant side)
**Apps:** `backend/` (API), `frontend/` (screens)
**Related:** [ERD](erd.md) · [Company workspace](../company-workspace/prd.md) · [Platform company management](../company-management/prd.md) · [Business rules](../../business/business-rules.md) · [Tenancy](../../architecture/tenancy.md) · [Audit logging](../../architecture/audit-logging.md)

## 1. Purpose

A company works from one or more physical locations: stores and warehouses. In Stockwise these are **branches**, and a warehouse is a branch of type `warehouse` (business rules §2.3). Branches are the location context for later modules: stock levels, goods receipts, sales and cash, returns, transfers and per-branch reports.

This feature lets a company:

1. Create and maintain its branches.
2. Deactivate and reactivate branches without losing history.
3. Control which members can work in which branches.
4. Give every later module one trusted backend check for "this request is for branch X, and this member may work there".

Point 4 matters most. If branch scoping is wrong here, every later module inherits the bug.

## 2. Goals and non-goals

### Goals

- Owners and Admins manage their company's branches without a Superadmin.
- A member's branch access is **all branches** (including future ones) or **a list of branches**.
- The backend resolves and authorises the branch on every branch-scoped request (`company.branch`). No later module re-implements it.
- The database rejects an access grant that links a membership and a branch of different companies.
- Every branch and access change is audited.

### Non-goals (v1)

- Different roles per branch (for example Manager in Makassar, Cashier in Gowa). A member has one company role, scoped to their branches.
- Branch settings beyond the profile (receipt templates, tax, opening hours).
- Stock, transfers, cash drawers and registers. Later modules build on branches.
- A branch switcher in the app shell. `GET …/me/branches` is ready for it; the switcher comes with the first branch-scoped page (stock), so it never switches nothing (ui-guidelines §2.3).
- Branch management by Superadmins. They see branches read-only on the platform company page (CM-12, CM-15).
- Hard deletion of branches.

## 3. Decisions

These answered the draft's open decisions and several business-rules open questions.

| Topic | Decision |
| --- | --- |
| Warehouse model | A warehouse is a branch with `type = warehouse`; one table and one access model cover stores and warehouses (business rules open question 9). |
| Access model | `company_memberships.branch_scope` (`all` or `selected`) plus `membership_branch_access` rows for `selected`. `all` includes branches created later. |
| Owner access | Implicit through the Owner role, checked directly (BR-3, §4.2 exception). It can't be restricted, whatever is stored. |
| Default access | Owners and Admins start with `all` and Admins can be restricted; Managers and Cashiers start with `selected` and no branches (business rules open question 2). |
| Roles per branch | No. One company role per membership. The access table can gain a role column later. |
| Branch context | Route segment: `/companies/{company}/branches/{branch}/…`. Never a header, a body field or server-side state (business rules open question 8). |
| Inactive branches | Operational writes are blocked; reads, management and reactivation still work; access grants are kept (business rules open question 4). |
| Code | Immutable, uppercase, unique within the company. Later used in document numbers. |
| Timezone | Optional per branch; `null` inherits the company's (company-management open question 3). |
| Audit storage | The existing `audit_logs` table with `company_id`. |
| Manager permissions | View only for now. Managing branches is Owner and Admin (`manage-branches`). |

## 4. Permissions

Roles map to permissions in `MembershipRole::permissions()`. Routes check permissions with `company.can:<permission>`, then `company.branch` checks access to the branch itself.

| Permission | Owner | Admin | Manager | Cashier |
| --- | --- | --- | --- | --- |
| `view-branches`: list and view the branches they have access to, and who works there | ✓ | ✓ | ✓ | ✓ |
| `manage-branches`: create, edit, deactivate and reactivate branches they have access to | ✓ | ✓ | — | — |
| `manage-branch-access`: change members' branch access | ✓ | ✓ | — | — |

## 5. Branch data

| Field | Required | Editable | Rules |
| --- | --- | --- | --- |
| `name` | Yes | Yes | 2–100 characters, trimmed. Unique within the company, ignoring case. |
| `code` | Yes | No | 2–20 characters: uppercase letters, digits and hyphens, starting with a letter or digit. Entered in any case and stored uppercase. Unique within the company (BR-2). |
| `type` | No | Yes | `store` (default) or `warehouse`. |
| `address` | No | Yes | Up to 500 characters. |
| `phone` | No | Yes | Up to 30 characters. |
| `timezone` | No | Yes | IANA zone. `null` uses the company's timezone. |
| `status` | System | Deactivate and reactivate only | `active` or `inactive`. |
| `deactivated_at`, `deactivation_reason` | System | Deactivate and reactivate only | Reason 10–500 characters. Cleared on reactivation. |
| `created_by` | System | No | The user who created it. |

Branches are addressed by a ULID `public_id`, like companies (api-conventions "Identifiers").

## 6. Rules

| ID | Rule |
| --- | --- |
| BM-1 | A branch belongs to exactly one company, and that never changes (BR-1, WH-1). A `company_id` in a request body is ignored or rejected. |
| BM-2 | Name and code are unique within a company; different companies may reuse them (BR-2, WH-2). The code is immutable. |
| BM-3 | A member may work in a branch when they are the **Owner** (implicit, BR-3, WH-3), their `branch_scope` is `all`, or their scope is `selected` and they have an access row for it. Only active memberships count (MB-4). |
| BM-4 | New Owner and Admin memberships start with `all`; Manager and Cashier memberships start with `selected` and no branches. After an ownership transfer the previous owner becomes Admin with `all`. Changing a role doesn't change branch access. |
| BM-5 | Members with `manage-branch-access` replace a member's access with `all`, or with `selected` and at least one branch of this company. The Owner's access and your own access can't be changed. The replacement is one transaction and applies on the member's next request. |
| BM-6 | An inactive branch rejects operational writes with `403 BRANCH_INACTIVE` and keeps reads working (BR-4, WH-4). Branch management itself still works, so it can be edited and reactivated. Deactivation needs a reason; access grants are kept. |
| BM-7 | Branches are never hard-deleted. |
| BM-8 | An access row can only link a membership and a branch of the **same** company. The database enforces this with composite foreign keys (WH-6 pattern, [tenancy](../../architecture/tenancy.md)). |
| BM-9 | A branch's `timezone` is optional; without one the branch uses the company's. |
| BM-10 | The branch of a request comes only from the route and is resolved together with the company. Another company's branch is `404` (SEC-4); a branch of this company without access is `403 BRANCH_ACCESS_DENIED`. Branch IDs in request bodies are never trusted for scoping (SEC-3). |
| BM-11 | Deactivating a membership keeps its access rows, so reactivating it restores them; the inactive member is already blocked by `company.member` (MB-4). |
| BM-12 | A suspended company's branches are unreachable whatever their status (CO-6): `403 COMPANY_SUSPENDED`. |
| BM-13 | A company may have no branches. The UI shows an onboarding prompt, and branch-scoped work is simply unavailable. |
| BM-14 | Every change is written to `audit_logs` with the company, in the same transaction: `branch.created`, `branch.updated` (changed fields), `branch.deactivated` (reason), `branch.reactivated`, `branch_access.updated` (before and after). No-ops write nothing (SEC-5). |
| BM-15 | Branch lists, counts and `/me/branches` only include the branches the member may work in. Superadmins read every company's branches only through the platform route (CM-12). |

## 7. User flows

### 7.1 Create a branch

An Owner or Admin opens the company page, then **View All Branches** (or **Add Branch** in the empty state), and fills in name, code, type, phone, address and optionally a timezone. On success they land on the branch page. Members with `all` and the Owner can work there at once; members with `selected` can't until someone grants it.

### 7.2 Restrict a cashier to one branch

On the company page, the Owner opens the cashier's row menu → **Branch Access**, picks **Selected Branches**, ticks Gowa Store and saves. The cashier's next request to Makassar Store gets `403 BRANCH_ACCESS_DENIED`, and their branch list shows only Gowa Store.

### 7.3 Deactivate and reactivate

On the branch page, **Deactivate** asks for a reason and explains the effect. The page then shows an "inactive" notice with the date and reason, and **Reactivate** brings the branch back with the same access.

### 7.4 Authorisation order on every branch-scoped request

```
authenticated (401) → verified (403) → company exists and active membership (404) → company not suspended (403 COMPANY_SUSPENDED)
  → permission for the action (403) → branch in this company (404) → member may work in the branch (403 BRANCH_ACCESS_DENIED)
  → [operational writes] branch active (403 BRANCH_INACTIVE) → handler
```

## 8. Screens

There's no sidebar company context yet, so the company page is the entry point.

### 8.1 Branch list: `/companies/:companyId/branches`

Title "Branches", with **Add Branch** for `manage-branches`. Search by name or code, filter by status and type, sort by name, code or created date; all kept in the URL. Columns: branch, code, type, status, members, created at. Mobile shows stacked rows. Members without `manage-branches` see only their branches and the description "The stores and warehouses you can work in." The empty state invites managers to add a branch (BM-13) and tells others to ask for access.

### 8.2 Add and edit: `/companies/:companyId/branches/new`, `…/:branchId/edit`

One form: **Branch Details** (name, code, type, phone, address) and **Business Settings** (timezone). The code is read-only on edit. The timezone field shows the company's timezone as the default and has "Use the company's timezone" to clear an override. Edits send only changed fields with `updated_at`; a stale save shows the reload prompt. Without `manage-branches` the routes redirect to the list or branch page.

### 8.3 Branch page: `/companies/:companyId/branches/:branchId`

Name, code, type and status; **Edit Branch** and **Deactivate**/**Reactivate** for `manage-branches`. An inactive branch shows a notice with the date and reason. **Profile** lists the fields; the timezone reads "Asia/Makassar (company)" when inherited. **Members** lists active members who can work here, with their role and "All Branches" or "This Branch".

### 8.4 Member branch access

On the company page, the Members card gets a **Branches** column (All Branches or Selected Branches) and, for `manage-branch-access`, a **Branch Access** item in each row menu (not for the owner or yourself). The dialog has an **All Branches** / **Selected Branches** choice and a checklist of branches, with inactive ones marked. Saving needs at least one branch for Selected. Existing grants are listed even when the editor can't see the branch, so saving never drops them.

### 8.5 Company page and platform

The company page has a **Branches** card: the location count, the first five branches and **View All Branches**, or the empty state. The platform company page (`/admin/companies/:id`) has a read-only **Branches** tab, and its Activity tab names the branch or member of branch entries.

### Errors on branch screens

| Response | Shown as |
| --- | --- |
| `404` (unknown or another company's branch, or not a member) | The not-found page |
| `403 BRANCH_ACCESS_DENIED` | "You don't have access to this branch", with a link back to the branch list |
| `403 COMPANY_SUSPENDED` | The suspended-company notice |
| `403 BRANCH_INACTIVE` (operational writes in later modules) | The request's error message, in the form or dialog that sent it |
| Other errors | An alert with **Retry** |

## 9. API contract

Tenant routes under `/api/v1/companies/{company}` ([tenancy](../../architecture/tenancy.md)). `{company}` and `{branch}` are ULID `public_id`s; `{membershipId}` is numeric.

| Method and path | Middleware | Body or query | Success |
| --- | --- | --- | --- |
| `GET /branches` | `company.can:view-branches` | `search`, `status`, `type`, `sort` (`name`, `code`, `created_at`), `direction`, `page`, `per_page` (5–100, default 25) | `200` paginated `Branch[]`, only accessible branches |
| `POST /branches` | `company.can:manage-branches` | `name`, `code`, `type`, `address`, `phone`, `timezone` | `201` `{ data: Branch }` |
| `GET /branches/{branch}` | `view-branches`, `company.branch` | none | `200` `{ data: Branch }` |
| `PATCH /branches/{branch}` | `manage-branches`, `company.branch` | editable fields + `updated_at` | `200` `{ data: Branch }` |
| `POST /branches/{branch}/deactivate` | `manage-branches`, `company.branch` | `reason` (10–500) | `200` `{ data: Branch }` |
| `POST /branches/{branch}/reactivate` | `manage-branches`, `company.branch` | none | `200` `{ data: Branch }` |
| `GET /branches/{branch}/members` | `view-branches`, `company.branch` | `page` | `200` paginated `CompanyMember[]` |
| `GET /members/{membershipId}/branch-access` | `company.can:manage-branch-access` | none | `200` `{ data: BranchAccess }` |
| `PUT /members/{membershipId}/branch-access` | `company.can:manage-branch-access` | `{ scope: "all" }` or `{ scope: "selected", branch_ids: [...] }` | `200` `{ data: BranchAccess }` |
| `GET /me/branches` | any active member | none | `200` `{ data: Branch[] }`, active first |
| `GET /api/v1/admin/companies/{companyId}/branches` | `can:administer-platform` | `page` | `200` paginated `Branch[]` (read-only) |

`Branch`: `{ id, name, code, type, status, address, phone, timezone, deactivated_at, deactivation_reason, members_count, created_at, updated_at }`. `members_count` counts active members who can work there and is absent on `/me/branches`; `updated_at` has microseconds.

`BranchAccess`: `{ membership_id, scope, is_owner, branches: [{ id, name, code, type, status }] }`. The owner is always `scope: "all"`.

`CompanyMember` (company workspace) gains `branch_scope`, always `all` for the owner. `Company.membership.permissions` includes the branch permissions. The platform company detail gains `branches_count`, and company activity entries gain `branch: { id, name, code } | null`.

### Errors

Laravel's error shape with `code` ([api-conventions](../../architecture/api-conventions.md#errors)).

| Status | When |
| --- | --- |
| `401` | Not logged in |
| `403` | Unverified; missing permission; `COMPANY_SUSPENDED`; `BRANCH_ACCESS_DENIED` (no access to this branch) |
| `404` | Not a member; a branch or membership of another company |
| `409` | `STALE_RECORD` (stale edit); `INVALID_STATUS_TRANSITION` (deactivating an inactive branch, reactivating an active one) |
| `422` | Validation: duplicate name or code, bad code format, `code`/`status`/`company_id` in an edit, short reason, `selected` without branches, branch IDs of another company; safeguards: the owner's or your own access |

`BRANCH_INACTIVE` (`403`) comes from the `branch.active` middleware on operational branch routes in later modules.

## 10. States

| Screen | Loading | Empty | Error |
| --- | --- | --- | --- |
| Branch list | Skeleton rows | Onboarding prompt (managers) or "no access yet" (others); "no matches" with Clear Filters when filtered | Errors table in §8 |
| Branch page | Page spinner | — | Errors table in §8 |
| Branches card | Skeleton rows | Onboarding prompt | Alert with Retry |
| Branch access dialog | Skeletons | "This company has no branches yet" in the checklist | Alert with Retry; validation under the fields |

## 11. Acceptance criteria

### Backend

- [x] Owners and Admins create branches in the route's company; a body `company_id` is ignored (BM-1).
- [x] Duplicate code or name (any case) in a company is `422`; another company may reuse them (BM-2).
- [x] Editing `code` or `status` is `422`; a stale edit is `409 STALE_RECORD`; only changed fields are audited.
- [x] Deactivate needs a reason; deactivating twice is `409` with one audit entry; reactivation restores access unchanged (BM-6).
- [x] Managers and Cashiers get `403` on management routes; non-members and Superadmins get `404`.
- [x] Another company's branch is `404`; a branch without access is `403 BRANCH_ACCESS_DENIED`; scope `all` and the Owner reach branches created later (BM-3, BM-10).
- [x] Revoked access is denied on the very next request; deactivating and reactivating a member keeps their access (BM-5, BM-11).
- [x] On a test branch-scoped route, an inactive branch rejects writes with `BRANCH_INACTIVE` and allows reads; a suspended company gets `COMPANY_SUSPENDED` (BM-6, BM-12).
- [x] The owner's and your own access can't be changed; `selected` needs branches of this company (BM-5).
- [x] The database rejects a cross-company access row and invalid code, type, status and scope values (BM-8).
- [x] Every change writes exactly one audit entry with `company_id`; no-ops write none (BM-14).
- [x] `/me/branches` returns exactly the accessible branches, active first (BM-15).
- [x] Superadmins list a company's branches through the platform route; others get `403`.
- [x] `db:seed` can be re-run and creates the demo branches and a cashier restricted to Gowa Store.

### Frontend

- [x] Company page Branches card, branch list with search, filters, sort and pagination in the URL.
- [x] Add, edit (with stale reload), deactivate and reactivate, with management actions hidden without `manage-branches`.
- [x] Member Branch Access dialog and the Branches column in the members list.
- [x] Access-denied, not-found, suspended and retry states on branch pages.
- [x] Read-only Branches tab and branch-aware activity on the platform company page.
- [x] Verified in the browser on desktop and mobile with no console errors (Playwright, `e2e/branches.spec.ts`).

## 12. Open questions

1. **Manager branch management.** Should Managers edit the profile of branches they're assigned to (business rules §4.2 "Assigned")? v1 keeps them view-only.
2. **Branch switcher.** How is the chosen branch shown and kept in the app shell once branch-scoped pages exist? The URL already carries it (BM-10).
3. **Blocking deactivation.** Later modules may block deactivation while a branch has open cash shifts or pending transfers.
4. **Branch activity for members.** Should Owners see the company's activity log, including branch changes, in the workspace?
