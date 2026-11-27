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

## Branch context

Branches (stores and warehouses) are locations of one company ([branch management](../features/branch-management/prd.md)). A request acts in a branch only through the URL: `/api/v1/companies/{company}/branches/{branch}/…`, where `{branch}` is the branch's ULID `public_id`. Never take the branch from a header, a body field or server-side state, and never trust a `branch_id` in a body for scoping (SEC-3, BM-10).

After `company.member` (and `company.can`), branch routes add:

- **`company.branch`** (`App\Http\Middleware\EnsureBranchAccess`): loads the branch by `public_id` **and** the resolved company, so another company's branch is a `404` (SEC-4). Then it asks `App\Services\BranchAccessService::canAccess()` whether the member may work there: the Owner always (BR-3), scope `all`, or a `membership_branch_access` row. Otherwise `403 BRANCH_ACCESS_DENIED`. It shares the branch as `$request->attributes->get('branch')` and removes `{branch}` from the route parameters, like `company.member` does for the company.
- **`branch.active`** (`EnsureBranchActive`), for operational routes (stock, sales, receipts): rejects writes in an inactive branch with `403 BRANCH_INACTIVE` and lets reads through (BR-4, BM-6). Branch management routes leave it out so an inactive branch can still be edited and reactivated.

```php
Route::prefix('branches/{branch}')->whereUlid('branch')->middleware(['company.branch', 'branch.active'])->group(function () {
    Route::get('/stock', …)->middleware('company.can:view-inventory');
    Route::post('/stock-adjustments', …)->middleware('company.can:adjust-inventory');
});
```

The full order is: authenticated → verified → member of the company (`404`) → company not suspended → permission → branch in the company (`404`) → access to the branch (`403 BRANCH_ACCESS_DENIED`) → branch active for writes (`403 BRANCH_INACTIVE`).

Lists that span branches (for example "all my branches' sales") filter with `BranchAccessService::accessibleBranches()`, never with a list of branch IDs from the client.

## Tenant-owned tables

- Every tenant-owned table has a non-null `company_id` foreign key to `companies`.
- Queries in tenant controllers always start from the resolved company (`$company->products()…`) or filter by its id. Never accept a `company_id` from the request body (SEC-3).
- Where a child row references another tenant-owned row, prefer a **composite foreign key** `(company_id, parent_id) → (company_id, id)` (with a unique index on the parent's `(company_id, id)`), so the database itself rejects links across companies.
- Uniqueness that is per company is a composite unique index, e.g. `(company_id, code)` for branch codes (BR-2).
- **Branch-owned tables** also carry `branch_id`, with the composite foreign key `(company_id, branch_id) → branches (company_id, id)`. `membership_branch_access` is the first example ([branch management ERD](../features/branch-management/erd.md)).

## Testing isolation

Every tenant module includes tests that:

- a member of company A gets `404` for company B's resources, even with valid IDs (SEC-4, SEC-5);
- a member of a suspended company gets `403 COMPANY_SUSPENDED`;
- a user in two companies only sees the data of the company in the URL;
- IDs from another company in request bodies are rejected (`422`).

`backend/tests/Feature/Tenancy/CompanyMemberMiddlewareTest.php` shows the pattern with test-only routes.

Branch-scoped modules also test that another company's branch is `404`, a branch without access is `403 BRANCH_ACCESS_DENIED`, and writes in an inactive branch are `403 BRANCH_INACTIVE`. `backend/tests/Feature/Branch/BranchResolverTest.php` shows the pattern.
