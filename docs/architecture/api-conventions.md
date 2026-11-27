# API conventions

The backend is a Laravel JSON API consumed by the React app through the client in `frontend/src/lib/api/`. These conventions apply to every endpoint.

## Versioning and prefixes

| Prefix | Who | Example |
| --- | --- | --- |
| `/api/v1/auth/…` | Guests and users (authentication) | `POST /api/v1/auth/login` |
| `/api/v1/user…` | The logged-in user's own account | `PATCH /api/v1/user` |
| `/api/v1/admin/…` | Platform administration, Superadmins only | `GET /api/v1/admin/companies` |
| `/api/v1/companies/{company}/…` | Company-scoped (tenant) routes, see [tenancy.md](tenancy.md) | `GET /api/v1/companies/{company}/branches` |
| `/api/v1/companies/{company}/branches/{branch}/…` | Branch-scoped routes, see [tenancy.md](tenancy.md#branch-context) | `GET …/branches/{branch}/members` |

- Every route is under `/api/v1`. A breaking change to a response goes to `/api/v2` for that resource; additive changes (new fields, new optional parameters) stay in `v1`.
- Route names follow the prefix: `api.v1.admin.companies.index`.
- Requests and responses are JSON. Clients send `Accept: application/json`; the backend answers JSON even when they don't (`redirectGuestsTo(null)`).

## Authentication and authorization

They are separate checks, in this order:

1. **Authentication** (`auth:sanctum`, bearer token): missing, invalid or revoked token, or an inactive account → `401`.
2. **Email verification** (`verified`) on business and platform routes → `403` for unverified users (AUTH-14).
3. **Authorization:** platform routes use the `can:administer-platform` gate (active, verified Superadmin) → `403`. Tenant routes use `company.member` (see [tenancy.md](tenancy.md)).

Authorization checks permissions or gates, not role names (business rules §4.2). On `/admin` routes, records are looked up **inside the controller, after authorization**, never by route model binding, so a non-Superadmin always gets `403` and never a `404` that would reveal whether a record exists.

## Responses

- Single resources and collections use Eloquent API Resources: `{ "data": {…} }`, `{ "data": [ … ], "links": {…}, "meta": {…} }`. Extra top-level keys are allowed when needed, for example `token` on login.
- Dates are ISO 8601 strings with offset (`2026-11-22T03:00:00+00:00`), stored in UTC.
- `201` for creates, `204` for actions with no body, `202` for accepted asynchronous work (e.g. "code sent").

## Errors

Errors use Laravel's shape, with an optional machine-readable `code`:

```json
{ "message": "Human-readable summary.", "errors": { "field": ["Message"] }, "code": "STALE_RECORD" }
```

- `errors` is present on `422` validation failures, keyed by field. Safeguard violations also use `422` with an `errors` key naming the relevant field.
- `code` is present when a client must react to a specific condition, not just display the message. Throw `App\Exceptions\ApiException` (status, code, message) to produce one.

| Code | Status | Meaning |
| --- | --- | --- |
| `COMPANY_SUSPENDED` | 403 | The company is suspended; company-scoped requests are blocked (CM-5) |
| `BRANCH_ACCESS_DENIED` | 403 | The member can't work in this branch of their company (BR-3, BM-10) |
| `BRANCH_INACTIVE` | 403 | A write in an inactive branch on an operational route (BR-4, BM-6) |
| `INVALID_STATUS_TRANSITION` | 409 | The record is not in the state the action requires, e.g. suspending a suspended company |
| `STALE_RECORD` | 409 | The record changed since the client loaded it (see optimistic concurrency) |

Add new codes here when you introduce them. The frontend reads them with `ApiError.code`.

| Status | When |
| --- | --- |
| `401` | Not authenticated |
| `403` | Authenticated but not allowed (including `COMPANY_SUSPENDED`, `BRANCH_ACCESS_DENIED`, `BRANCH_INACTIVE`) |
| `404` | Not found, or not visible to this user on tenant routes (SEC-4) |
| `409` | Conflict with the current state (`code` says which) |
| `422` | Validation failure or a business safeguard |
| `429` | Rate limited, with `retry_after` and a `Retry-After` header |

## Lists: pagination, filters, sorting

- Server-side pagination with Laravel's `paginate()->withQueryString()`. Parameters: `page`, `per_page` (each list defines its default and maximum as constants on its Form Request, typically 25 and 100).
- Filters and search are query parameters validated by a Form Request (e.g. `ListUsersRequest`). Search is case-insensitive and partial, with `%` and `_` escaped (`User::search`, `Company::search`).
- Sorting: `sort=<column>` plus `direction=asc|desc`, from an allow-list. Always add a unique tie-breaker (`id`) so pages are stable. Nullable sort columns sort nulls last.
- The frontend keeps list state in the URL so views can be shared and reloaded.

## Identifiers

- Platform users are addressed by their numeric `id` on `/admin` routes.
- **Tenant-level resources** (companies, and future records exposed outside the platform) are addressed by an opaque **ULID `public_id`**, never the sequential primary key. Models set `uniqueIds()` to `['public_id']` and `getRouteKeyName()` to `public_id`.
- Human-readable codes (e.g. company `code`) are for search and support only, never for security.

## Optimistic concurrency

Edit endpoints for records that several people may change send the `updated_at` the client loaded. The service locks the row and compares it; if it differs, it returns `409 STALE_RECORD` and changes nothing. The client offers to reload. Used by `PATCH /admin/companies/{id}`, `PATCH /companies/{company}` and `PATCH /companies/{company}/branches/{branch}`.

Tables that use this store `updated_at` with microseconds (`timestamps(6)`, model `$dateFormat = 'Y-m-d H:i:s.u'`) and resources return it with microseconds (`format('Y-m-d\TH:i:s.uP')`). Second precision would miss two edits within the same second.

## Rate limits

Named limiters live in `App\Providers\AppServiceProvider` (`login`, `register`, `otp-send`, `otp-verify`) and answer `429` with `retry_after`. Add a limiter for any endpoint that can be abused (sending email, guessing secrets, expensive exports).
