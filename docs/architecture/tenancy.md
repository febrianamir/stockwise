# Tenancy

Stockwise is multi-tenant: each **company** is a tenant (business rules §2.1). Tenant isolation is enforced by the backend (SEC-1), on every request, with database constraints where possible.

## Two kinds of routes

| Kind | Prefix | Who | Data access |
| --- | --- | --- | --- |
| Platform | `/api/v1/admin/…` | Active, verified Superadmins (`can:administer-platform`) | May read across companies. The **only** place cross-tenant reads are allowed (CM-12) |
| Tenant | `/api/v1/companies/{company}/…` | Active members of that company (`company.member`) | Only that company's data |

Platform endpoints must never be reused by tenant features, and tenant features must never query without a company scope.

## How a request identifies its company

The company is part of the URL: `/api/v1/companies/{company}/…`, where `{company}` is the company's ULID `public_id`. This is explicit, easy to log and easy to test. The frontend keeps the active company in its routes.

The route group in `backend/routes/api.php` applies `auth:sanctum`, `verified` and `company.member`. Add company-scoped modules **inside that group**.

## The `company.member` middleware

`App\Http\Middleware\EnsureCompanyMember` runs on every tenant request:

1. Resolves `{company}` by `public_id`.
2. Requires an **active membership** of the authenticated user in that company. Otherwise → `404` (SEC-4: a non-member learns nothing, not even that the company exists).
3. If the company is **suspended** → `403` with `code: COMPANY_SUSPENDED`, for every member including the owner (CM-5).
4. Shares the resolved `Company` and `CompanyMembership` on the request (`$request->attributes->get('company')`, `…('membership')`) for permission checks in controllers and policies.
5. Removes `{company}` from the route parameters, so controller arguments line up with the remaining parameters (`show(Request $request, string $product)` for `/companies/{company}/products/{product}`). Read the company from the request attributes, never from the URL again.

## Permissions on tenant routes

After `company.member`, actions that change data add `company.can:<permission>` (`App\Http\Middleware\EnsureCompanyPermission`), which answers `403` when the membership's role lacks the permission. Permissions are `App\Enums\CompanyPermission` values; roles map to them in `MembershipRole::permissions()` (business rules §4.2). Check permissions, never role names; the only exception is ownership invariants (CO-1, MB-5, MB-6).

```php
Route::patch('/members/{membershipId}', [MemberController::class, 'update'])->middleware('company.can:manage-members');
```

The frontend reads the same permissions from `membership.permissions` in the company resource to show or hide actions (SEC-2: hiding is never the control).

Consequences:

- A **Superadmin has no tenant access** without a membership: they get `404` like anyone else. Platform work goes through `/admin` routes.
- Suspending a company doesn't revoke tokens or deactivate users. A user in companies A and B keeps using B when A is suspended (CM-6).
- Removing or deactivating a membership blocks access on the next request (MB-4).

## Tenant-owned tables

- Every tenant-owned table has a non-null `company_id` foreign key to `companies`.
- Queries in tenant controllers always start from the resolved company (`$company->products()…`) or filter by its id. Never accept a `company_id` from the request body (SEC-3).
- Where a child row references another tenant-owned row, prefer a **composite foreign key** `(company_id, parent_id) → (company_id, id)` (with a unique index on the parent's `(company_id, id)`), so the database itself rejects links across companies.
- Uniqueness that is per company is a composite unique index, e.g. `(company_id, code)` for branch codes (BR-2).

## Testing isolation

Every tenant module includes tests that:

- a member of company A gets `404` for company B's resources, even with valid IDs (SEC-4, SEC-5);
- a member of a suspended company gets `403 COMPANY_SUSPENDED`;
- a user in two companies only sees the data of the company in the URL;
- IDs from another company in request bodies are rejected (`422`).

`backend/tests/Feature/Tenancy/CompanyMemberMiddlewareTest.php` shows the pattern with test-only routes.
