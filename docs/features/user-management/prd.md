# Platform user management: product requirements

**Status:** Implemented (v1)
**Module:** Platform administration
**Apps:** `backend/` (API), `frontend/` (screens)
**Related:** [ERD](erd.md) · [Auth PRD](../auth/prd.md) · [Business rules](../../business/business-rules.md) · [Design system](../../design/design-system.md) · [UI guidelines](../../design/ui-guidelines.md)

## 1. Overview

Platform Superadmins (business rules §4.1) administer every Stockwise account, across all companies. They can:

1. Create a user, who starts unverified and verifies themselves.
2. View all registered users.
3. Search for users.
4. Inspect a user's details and account activity.
5. Activate or deactivate accounts.
6. Grant or revoke Superadmin.
7. Find users who haven't verified their email.
8. Monitor account creation (date filter and sort, newest first).
9. See total, active, inactive and pending user counts.

Only Superadmins can do any of this. Company roles never grant access.

## 2. Goals and non-goals

### Goals

- Find any user quickly, without browsing every record (server-side search, filters, sorting and pagination).
- Cut off access immediately when an account must be disabled.
- Leave an audit trail for every sensitive action.

### Non-goals (v1)

- Changing company memberships or roles. Since [company management](../company-management/prd.md), the user list shows each user's company count and the details page lists their memberships, both **read-only**.
- Public user IDs such as `USR-1024`. These are planned as a future `users.public_id` column that search will match exactly. Today, search matches the numeric internal ID.

Also out of scope: deleting users, editing a user's profile or email, resetting someone else's password, uploading avatars (the table shows initials), and a full activity log for every request.

## 3. Account status

| Status | Meaning | Can log in? |
| --- | --- | --- |
| `pending` | Registered or created, email not verified yet | Yes, but only to verify (AUTH-14) |
| `active` | Email verified and not deactivated | Yes |
| `inactive` | Deactivated by a Superadmin | No. Every token is revoked |

Transitions:

- Registration or creation by a Superadmin → `pending`.
- First email verification (by code, or by password reset per AUTH-10) → `active`, only if the user was `pending`. Verification never reactivates an `inactive` user.
- Deactivation by a Superadmin → `inactive`.
- Reactivation by a Superadmin → `active` if the email is verified, otherwise `pending`.

## 4. Rules

| ID | Rule |
| --- | --- |
| UM-1 | Every platform user management endpoint requires an authenticated, verified, active Superadmin. Authentication is checked first (`401`); authorization second (`403`). |
| UM-2 | Superadmin is a platform flag (`users.is_superadmin`). No company role or membership grants it or any platform access, and it can't be set through the profile endpoints. |
| UM-3 | Deactivation sets `inactive`, revokes every token immediately, and blocks every way of authenticating: login, existing tokens, password reset. Memberships and historical records stay intact. |
| UM-4 | A Superadmin can't deactivate their own account or revoke their own Superadmin status. |
| UM-5 | The last active Superadmin can't be deactivated or lose Superadmin, so the platform always keeps one administrator. The check locks the active Superadmin rows in the same transaction, so two Superadmins demoting each other at once can't both succeed. |
| UM-6 | Superadmin can only be granted to an active, verified user. |
| UM-7 | Users created by a Superadmin start `pending` with an initial password the Superadmin shares out of band. No email is sent at creation; the user logs in and requests a code from `/verify-email`. |
| UM-8 | Search is case-insensitive and matches partial names and emails. A numeric term also matches the user ID exactly. |
| UM-9 | Listing is paginated, filtered and sorted on the server. The client never downloads the whole user table. |
| UM-10 | These actions are written to `audit_logs` with the actor, subject, IP address and user agent: user registered, user created, email verified, user deactivated, user reactivated, Superadmin granted, Superadmin revoked (SEC-5). |
| UM-11 | Each successful login records `last_login_at`. This doesn't change `updated_at`, which stays "last profile update". |
| UM-12 | A user who owns a company can't be deactivated; the `422` names the companies. Transfer ownership first (MB-5, CM-14). |

Deactivating a company owner is blocked (UM-12, MB-5).

## 5. Authorization

| Action | Superadmin | Any other user (any company role) |
| --- | --- | --- |
| List and search all platform users | Allowed | `403` |
| View any user's details and activity | Allowed | `403` |
| Create a user | Allowed | `403` |
| Deactivate or reactivate a user | Allowed, subject to UM-4, UM-5 and UM-12 | `403` |
| Grant or revoke Superadmin | Allowed, subject to UM-4 to UM-6 | `403` |

A Superadmin doesn't need to belong to any company.

## 6. User flows

### 6.1 Find users

On `/admin/users` the Superadmin sees the stat cards (Total, Active, Inactive, Pending), then a toolbar and the users table.

- **Search** by name, email or ID, debounced at 300 ms.
- **Filters:** account status (All, Active, Pending, Inactive), email verification (All, Verified, Unverified), and registration date (a custom range).
- **Sorting:** ascending or descending by name, registration date or last login. Users who never logged in sort last.
- **Pagination:** 25 per page by default.

Filters, sort and page are kept in the URL, so a view can be bookmarked or shared and survives a reload. Changing a filter or the search goes back to page 1.

### 6.2 Create a user

"Add User" opens a dialog with name, email, initial password and confirmation. On success a toast confirms it and the app opens the new user's details. The Superadmin shares the password with the user, who logs in, verifies their email (and becomes active), then changes the password from their profile.

### 6.3 Inspect a user

Clicking a user's name, or "View Details", opens `/admin/users/:id`. The page shows:

- **Profile Information:** ID, name, email, account status, email verified, created at, updated at.
- **Company Memberships:** read-only. Company (linked to its page), role (the owner is marked), membership status, company status and joined date.
- **Account Activity:** newest first. Account creation, email verification, deactivation and reactivation, Superadmin changes (each with who did it), plus the last successful login. Shows the 100 most recent entries.

### 6.4 Deactivate a user

Available from the row menu and the details page. A confirmation dialog is shown first:

> **Deactivate This User?**
> This user will no longer be able to log in to Stockwise or access any of their companies.
> Their memberships and historical business records will remain intact.
> [Cancel] [Deactivate User]

On success, a toast confirms it, and the user's open sessions stop working on their next request (`401` → `/login`).

### 6.5 Reactivate a user

From the row menu or the details page, with a short confirmation. The account returns to `active`, or to `pending` if it was never verified.

### 6.6 Grant or revoke Superadmin

From the details page, with a confirmation that explains the change. Actions blocked by UM-4 to UM-6 are hidden or disabled in the UI and rejected by the API with a `422` explaining why.

## 7. API contract

Base URL `/api/v1/admin`. Every endpoint uses the middleware `auth:sanctum`, `verified` and `can:administer-platform`.

### 7.1 Endpoints

| Method and path | Body or query | Success |
| --- | --- | --- |
| `GET /users` | See §7.2 | `200` paginated `{ data: AdminUser[], links, meta }` |
| `GET /users/stats` | none | `200` `{ data: { total, active, inactive, pending, unverified } }` |
| `POST /users` | `name`, `email`, `password`, `password_confirmation` | `201` `{ data: AdminUser }` |
| `GET /users/{id}` | none | `200` `{ data: AdminUserDetail }` |
| `POST /users/{id}/deactivate` | none | `200` `{ data: AdminUser }` |
| `POST /users/{id}/reactivate` | none | `200` `{ data: AdminUser }` |
| `PUT /users/{id}/superadmin` | `is_superadmin` (boolean) | `200` `{ data: AdminUser }` |

`AdminUser`:

```json
{
  "id": 12,
  "name": "Rina Putri",
  "email": "rina@example.com",
  "status": "active",
  "is_superadmin": false,
  "email_verified_at": "2026-11-21T08:30:00+00:00",
  "last_login_at": "2026-11-22T02:10:00+00:00",
  "created_at": "2026-11-21T08:00:00+00:00",
  "updated_at": "2026-11-21T08:30:00+00:00",
  "companies_count": 2
}
```

`companies_count` counts active memberships.

`AdminUserDetail` is `AdminUser` plus `memberships` (`{ id, company: { id, name, code, status }, role, status, is_owner, joined_at }`, by company name) and `activity`, newest first:

```json
{ "id": 42, "action": "user.deactivated", "occurred_at": "2026-11-22T03:00:00+00:00", "actor": { "id": 1, "name": "Stockwise Superadmin" } }
```

`id` is the audit log id. The action `user.last_login` is derived from `last_login_at` and has `id: null` and no actor. At most the 100 most recent audit entries are returned (`AdminUserDetailResource::ACTIVITY_LIMIT`).

### 7.2 List query parameters

| Parameter | Values | Default |
| --- | --- | --- |
| `search` | Up to 100 characters. Partial name or email, or an exact numeric ID | none |
| `status` | `active`, `pending`, `inactive` | all |
| `verification` | `verified`, `unverified` | all |
| `company` | `has`, `none` (an active company membership or not) | all |
| `created_from`, `created_to` | `YYYY-MM-DD`, inclusive, in the server's timezone (UTC) | none |
| `sort` | `name`, `created_at`, `last_login_at` | `created_at` |
| `direction` | `asc`, `desc` | `desc` |
| `per_page` | 10–100 | 25 |
| `page` | ≥ 1 | 1 |

### 7.3 Errors

| Status | When |
| --- | --- |
| `401` | Missing, invalid or revoked token, or the token owner is inactive |
| `403` | Not a verified, active Superadmin |
| `404` | Unknown user ID |
| `422` | Validation failure, or a safeguard (UM-4 to UM-6, UM-12, or deactivating or reactivating a user who is already in that state). The message explains why |

## 8. Screens

| Route | Access | Purpose |
| --- | --- | --- |
| `/admin/users` | Superadmin | Stats, search, filters, users table, create user |
| `/admin/users/:userId` | Superadmin | User details, activity, actions |

Other users who open these routes see the not-found page, and the API returns `403`. Superadmins see a "Platform Admin" group with a "Users" item in the sidebar; other users don't see the group.

### List layout

- **Header:** "Users", a "Platform Admin" badge, the description "Manage all registered users across the Stockwise platform." and an "Add User" primary button.
- **Stat cards:** Total Users, Active, Inactive, Pending.
- **Toolbar:** search ("Name, email or user ID"), status, verification and company-membership selects, a registration date range, and "Clear Filters".
- **Desktop table:**

  | Column | Content |
  | --- | --- |
  | User | Initials avatar, name, "Superadmin" badge |
  | Email | Email address |
  | Status | Status badge |
  | Email Verification | Verification badge |
  | Companies | Number of active company memberships |
  | Created At | Registration date |
  | Last Login | Last successful login, or "Never" |
  | Actions | Menu: View Details, Deactivate or Reactivate |

- **Mobile:** one stacked row per user (name, email, badges, created date).
- **Footer:** "Showing x–y of z" with previous and next buttons.

Status badges: Active is `success`, Pending is `warning`, Inactive is `destructive`. Verification badges: Verified is `success`, Unverified is `warning`. Each badge carries an icon and text (design-system §11).

## 9. States

- **Loading:** skeleton stat cards and table rows. The page keeps the previous results visible while the next page or filter loads.
- **Empty:** "No users match these filters." with "Clear Filters". A platform with no users isn't possible, because the Superadmin exists.
- **Error:** the stat cards and the table fail separately, each with a retry action.
- **Mutations:** buttons show a spinner. A success toast confirms the change, and errors appear as toasts or inside the dialog.

## 10. Acceptance criteria

### Backend

- [x] Every endpoint returns `401` to guests and `403` to normal, unverified or inactive users.
- [x] Search matches partial names and emails case-insensitively, and the numeric ID exactly.
- [x] Status, verification and date filters, and all sorts in both directions, work with server-side pagination.
- [x] Stats return total, active, inactive, pending and unverified counts.
- [x] Created users start `pending`, can log in and verify, and then become `active`.
- [x] Deactivation revokes all tokens. Old tokens get `401`, and login and password reset are refused.
- [x] Reactivation restores `active`, or `pending` if the user is unverified.
- [x] UM-4 to UM-6 are enforced with `422`.
- [x] All UM-10 actions write `audit_logs` rows, and the details endpoint returns them as activity.
- [x] Login records `last_login_at` without changing `updated_at`.

### Frontend

- [x] The list, filters, sort and pagination work against the API, and their state is kept in the URL.
- [x] Create, deactivate (with the exact confirmation copy), reactivate and Superadmin toggles work, with feedback.
- [x] Non-Superadmins can't reach the pages and see no nav link.
- [x] Loading, empty and error states are implemented.
- [x] Verified in the browser on desktop and mobile with no console errors.

## 11. Open questions

1. **Reason for deactivation.** Should a reason be required and shown on the details page?
2. **Notifications.** Should users be emailed when they are deactivated or reactivated, or when a Superadmin creates their account?
3. **Search at scale.** At large volumes, should name and email search use a `pg_trgm` index, or a search engine?
4. **Superadmin protection.** Should granting or revoking Superadmin require re-entering the password, or a second Superadmin's approval?
