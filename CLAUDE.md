# Stockwise

Monorepo:
- `backend/` — Laravel REST API (see `backend/CLAUDE.md` for Laravel/Boost guidelines)
- `frontend/` — React app that consumes the API

## Business documents (required for all feature work)

`docs/business/business-rules.md` describes the business domain: who Stockwise is for, the main entities (company/tenant, branch, warehouse, user, company membership, branch and warehouse access), the business and security rules (with IDs such as `CO-1` and `SEC-3`), roles and permissions, and which resources are company-wide or branch-specific. It is imported below, so it is always in context:

@docs/business/business-rules.md

Rules:
- Consult it before designing or building any feature (with that feature's docs in `docs/features/`, below), in `backend/` or `frontend/`: data models, migrations, endpoints, authorisation, validation, UI flows and tests.
- For domain behaviour it is the source of truth. If a request conflicts with a rule, point out the conflict (cite the rule ID) and ask before deviating. Don't silently pick one.
- Enforce tenant and branch isolation on the backend (`SEC-1`–`SEC-4`). Authorisation checks permissions, not role names. The one exception is ownership invariants (last owner, ownership transfer, the Owner's implicit access to all locations), which check the Owner role directly (business rules §4.2). Cover isolation rules with tests, for example "a user from company A gets no data from company B".
- When a feature settles an open question, decides a resource's scope, or adds or changes a rule, update the document in the same piece of work.

## Feature documents (required for work on a feature)

Each feature has its own folder in `docs/features/<feature>/` with:

- `prd.md`: product requirements, covering goals and non-goals, decisions, rules with IDs (e.g. `AUTH-4`), user flows, the API contract, screens, states, acceptance criteria and open questions.
- `erd.md`: database structure, with a Mermaid ER diagram, tables, columns, indexes and constraints, and how they relate to other features.

Current features:

| Feature | PRD | ERD |
| --- | --- | --- |
| User authentication (register, email OTP verification, login, logout, profile, password change and recovery) | `docs/features/auth/prd.md` | `docs/features/auth/erd.md` |
| Platform user management (Superadmin: list, search, filter, inspect, create, deactivate and reactivate users, grant or revoke Superadmin; account status; audit log) | `docs/features/user-management/prd.md` | `docs/features/user-management/erd.md` |
| Platform company management (Superadmin: create companies with an owner, list, search, edit, suspend, reactivate, transfer ownership, members and activity; tenant gate) | `docs/features/company-management/prd.md` | `docs/features/company-management/erd.md` |
| Company workspace (members: My Companies, view a company and its members; Owners and Admins edit the company and manage members; role-to-permission map) | `docs/features/company-workspace/prd.md` | `docs/features/company-workspace/erd.md` |
| Branch management (stores and warehouses as branches; Owners and Admins create, edit, deactivate and reactivate them; members' branch access, `all` or `selected`; the `company.branch` and `branch.active` middleware for branch-scoped routes) | `docs/features/branch-management/prd.md` | `docs/features/branch-management/erd.md` |

Rules:
- Before changing a feature, in `backend/` or `frontend/`, read its PRD and ERD. The PRD is the source of truth for that feature's behaviour. If a request conflicts with it, cite the rule ID and ask before deviating.
- A new feature gets a new folder with both documents, written before or with the implementation. Use `docs/features/auth/` as the template, and add a row to the table above.
- When behaviour, the API contract or the schema changes, update the PRD and ERD in the same piece of work. A new migration means the ERD changes.
- Feature docs must stay consistent with `docs/business/business-rules.md`. Business rules win. Reference them by ID.

## Architecture documents (required for backend and API work)

`docs/architecture/` holds cross-cutting technical conventions: [`api-conventions.md`](docs/architecture/api-conventions.md) (route prefixes, auth vs authorization, error shape and `code`s, pagination, public IDs, optimistic concurrency), [`tenancy.md`](docs/architecture/tenancy.md) (platform vs tenant routes, the `company.member` middleware, tenant-owned tables, isolation tests) and [`audit-logging.md`](docs/architecture/audit-logging.md) (when and how to write `audit_logs`).

Rules:
- Read the relevant documents before adding endpoints, tenant-owned tables or audited actions, and follow them.
- Company-scoped endpoints go inside the `/api/v1/companies/{company}` route group (`company.member` middleware), and require a permission with `company.can:<permission>` when they change data (`App\Enums\CompanyPermission`, mapped from roles in `MembershipRole::permissions()`). Platform endpoints go under `/api/v1/admin` (`can:administer-platform`). Never mix the two.
- Branch-scoped endpoints go under `/companies/{company}/branches/{branch}/…` with `company.branch` (resolves the branch in the company and checks the member's branch access through `App\Services\BranchAccessService`), plus `branch.active` on operational routes. Never take a branch ID from a request body for scoping ([tenancy](docs/architecture/tenancy.md#branch-context)).
- When you change or add a convention (a new error `code`, a new list parameter, a new audit action), update the document in the same piece of work.

## Design documents (required for all frontend work)

Before starting any frontend work (new pages, components, styling, layout, UX copy, or frontend data handling), read and follow:

- `docs/design/design-system.md`: visual language, including colour tokens, typography, spacing, radius, shadows, layout shell, buttons, forms, tables, status badges, icons, charts, responsiveness, interaction states and accessibility.
- `docs/design/ui-guidelines.md`: how UI is built, including reuse before creation, page structure, navigation and tenant/branch context, tables, forms, feedback states, dialogs, permissions, React implementation rules, the AI agent workflow and the UI Definition of Done.
- `docs/design/dashboard-spec.md`: requirements for the `/dashboard` page, including KPIs, chart, widgets, API contract, business rules, states, responsive layout and acceptance criteria. Use it as the template for how other page specs are structured.

These are auto-imported by `frontend/CLAUDE.md`, but read them explicitly when starting frontend work from the repo root.

Rules:
- For visual and UX decisions, the design documents are the source of truth. If they conflict with existing code or with the conventions below, point out the conflict and ask before deviating. Don't silently pick one.
- Follow the agent workflow and Definition of Done in `ui-guidelines.md` §15–16. A UI task is not complete just because it compiles: verify it in the browser (desktop and mobile, interactions, console errors), with Playwright (see "Frontend end-to-end tests" below), or state clearly that browser verification was not done.
- When a page has its own spec in `docs/design/`, read it before implementing that page.
- When a design decision changes intentionally, update the relevant design document in the same piece of work.

### Installed frontend skills and precedence

Project skills in `.claude/skills/`: `frontend-design`, `react-best-practices` (`vercel-react-best-practices`), `web-design-guidelines` and `shadcn`. They are general-purpose guidance written for many kinds of project. Use them, but when they disagree with this project, apply this order:

1. `docs/design/*` (design system, UI guidelines, page specs)
2. `CLAUDE.md` (this file, `frontend/CLAUDE.md`)
3. Installed skills

When a skill rule is overridden, follow the project rule. Mention the conflict only if it affects the result.

Known overrides:
- **`frontend-design`:** don't take its "distinctive / take aesthetic risk" direction for app UI. Stockwise follows `design-system.md`: a calm, consistent SaaS admin look, Inter, muted emerald primary, a dark sidebar, small radii, minimal shadows, and dense but readable tables. Its guidance on writing, restraint, accessibility and avoiding templated filler still applies.
- **`web-design-guidelines`:** use **Title Case** for short UI text: page and section headings, card and dialog titles, buttons, links used as actions, form labels, column headers, menu and nav items, badges, select options and stat labels (e.g. "Add Product", "View All Sales", "Created At", "Forgot Password?"). Keep minor words lowercase unless first (a, an, the, and, or, of, to, in, on, for, by, with). Use **sentence case** for longer copy: descriptions, helper text, placeholders, empty-state text, alerts, toasts and error messages. See design-system §4 "Capitalization". Its other accessibility, forms, focus, typography (`…`, `tabular-nums`) and `Intl.*` formatting rules apply.
- **`react-best-practices`:** use **TanStack Query** for server state and request deduplication, not SWR (`client-swr-dedup`). This is a Vite single-page app with no React Server Components, server actions or Next.js. Skip the `server-*` rules, `next/dynamic` and hydration-specific rules. Use `React.lazy` with dynamic `import()` for code splitting. The client- and render-performance rules apply.
- **`shadcn`:** follow its component and composition rules (for example `FieldGroup`/`Field`, `data-icon`, `gap-*` not `space-y-*`, `cn()` for conditional classes, semantic tokens, `Empty`/`Skeleton`/`Badge`). But theme values (fonts, colours, radius, status colours) come from `design-system.md`, and new tokens such as `success`, `warning` and `info` must be added to the theme in `src/index.css` rather than written as raw colours. Use only the `@shadcn` registry unless the user names another one.

## Frontend

- React 19 + Vite + TypeScript + Tailwind CSS v4 (`@import "tailwindcss"` in `src/index.css`, no config file).
- Import from `src` via the `@/` alias.
- UI components: shadcn/ui (Base UI primitives, `base-nova` style, config in `components.json`).
  - Add components with `npx shadcn@latest add <name>`; they land in `src/components/ui/`. Use them before writing custom ones.
  - Theme colours are CSS variables in `src/index.css`; use the semantic utilities (`bg-background`, `text-muted-foreground`, `text-destructive`, …) instead of raw palette colours. Dark mode is class-based (`.dark` on an ancestor).
  - Merge class names with `cn()` from `@/lib/utils`.
- Icons: `lucide-react` only.
- All backend calls go through the central client in `src/lib/api/` (`api.get/post/put/patch/delete`). Don't call `fetch` directly.
  - Add one module per resource (e.g. `src/lib/api/products.ts`) and re-export it from `src/lib/api/index.ts`.
  - Keep TypeScript types in `src/lib/api/types.ts` in sync with the backend's API Resources.
  - Errors are thrown as `ApiError` (`status`, `errors`, `fieldError(field)`, `isValidationError`, `isUnauthorized`).
- Server state uses TanStack Query (`QueryClient` in `src/lib/query-client.ts`). Don't fetch in `useEffect`.
  - Each resource module exports plain request functions, a key factory and `queryOptions` factories, e.g. `productKeys` and `productQueries.list(filters)`, following `src/lib/api/users.ts`. Components call `useQuery(productQueries.list(filters))`.
  - Pass the query's `signal` through to the request function so cancelled queries abort the HTTP request.
  - Mutations use `useMutation` and then invalidate the affected keys (`queryClient.invalidateQueries({ queryKey: productKeys.all })`).
  - Errors are typed as `ApiError` by default. 4xx responses are not retried; network and 5xx errors are retried twice.
- API base URL comes from `VITE_API_URL` (see `frontend/.env.example`). The dev server runs on port 5173, which must match `FRONTEND_URL` in `backend/.env` for CORS.
- Folder layout: API modules stay in `src/lib/api/` (see above). Feature UI lives in `src/features/<feature>/` (`pages/`, `components/`, hooks). Shared components live in `src/components/`, for example `TextField`, `FormError`, `ConfirmDialog`, `UserAvatar`, `SearchInput`, `ListPagination`, `SortableHead`, `DateRangeFilter`, `CompanyForm`, the company and branch badges and `layout/AppLayout` (the sidebar shell, built on the shadcn `sidebar`; add new pages to its navigation groups). Where `dashboard-spec.md` §17 suggests `features/dashboard/api/`, put that code in `src/lib/api/` instead.
- Routing: React Router (library mode). Routes are defined in `src/router.tsx` and every page is lazy-loaded with route `lazy`. Guard routes with `RequireAuth` / `RequireGuest` from `src/features/auth/components/route-guards.tsx`.
- Auth: Sanctum bearer token in `authToken` (observable). Read the session with `useCurrentUser()` and never read `localStorage` directly. Business routes in the backend must use the `verified` middleware (`AUTH-14`).
- Verify with `npm run lint` and `npm run build` (runs `tsc -b`).

### Frontend end-to-end tests (Playwright)

Playwright (`@playwright/test`, Chromium) is the project's browser testing tool. Use it for end-to-end tests and for the browser verification that `ui-guidelines.md` §15–16 requires.

- Specs live in `frontend/e2e/*.spec.ts`, configured by `frontend/playwright.config.ts`. It has two projects, `desktop` (Desktop Chrome) and `mobile` (Pixel 7), and starts the Vite dev server or reuses one on port 5173.
- Import `test` and `expect` from `./fixtures`, not from `@playwright/test`. The fixture fails a test on any console error or uncaught exception. Opt out only where an error is expected, with `test.use({ failOnConsoleError: false })` and a comment saying why. Seeded logins are in `seededUsers`.
- Don't log in through the UI in every spec: the API allows 5 logins a minute per account. The `setup` project (`e2e/auth.setup.ts`) signs each seeded user in once and saves the session; use it with `test.use({ storageState: authFile('owner') })`. `demoCompany(request)` returns the seeded company and branch IDs for opening URLs directly.
- Tag specs that need the real API with `@backend` (`test.describe('…', { tag: '@backend' }, …)`). Untagged specs must pass with only the frontend running.
- Locate elements the way users find them: `getByRole`, `getByLabel`, `getByText`, using the Title Case UI text. Don't use CSS classes or test IDs unless there's no accessible handle. Link buttons (`Button render={<Link />} nativeButton={false}`) have the `button` role, not `link`. Prefer `{ exact: true }` for short labels such as "Name".
- A new user-facing flow or page gets specs for its main path and its important states (validation error, empty, permission denied) in the same piece of work. Name spec files by feature, e.g. `e2e/companies.spec.ts`.
- Run `npm run test:e2e` (all specs, needs the backend) or `npx playwright test --grep-invert @backend` (frontend only). If the backend wasn't running, say which specs weren't run.

## Documentation

`README.md` at the repo root is the project's main documentation (project description, tech stack, how to run locally, configuration, testing). After any change, check whether it made the README inaccurate or incomplete, and update it in the same piece of work. Examples:
- new or changed setup steps, commands, prerequisites or ports
- new environment variables or changed defaults
- new apps, services or major dependencies (database, queue, cache, auth method)
- new major features or a change in project status

Don't update it for internal changes that don't affect how the project is described, set up or run.

## Commit messages

Commits are grouped **by feature**, not by app. One commit holds everything for a feature or change, including `backend/`, `frontend/`, docs and root files. Unrelated features go in separate commits.

Format: `<type>(<scope>): <message>`

- `<type>`: a conventional commit type: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`, `perf`, `build`, `ci`, etc.
- `<scope>`: the feature or area, e.g. `auth`, `products`, `dashboard`, `deps`. Don't prefix the app, whether the commit touches one app or both.
  - If it touches only root-level files (`README.md`, `CLAUDE.md`, `compose.yaml`, `docker/`, `docs/`, `.claude/`), use `repo/<part>`, e.g. `docs(repo/readme): ...`.

Examples:
- `feat(auth): add email OTP verification`
- `fix(api): return JSON 401 instead of redirecting guests`
- `chore(deps): upgrade react-router`

Do not add a `Co-Authored-By: Claude ...` trailer (or any other AI attribution line) to commit messages unless the user explicitly asks for it in that request.
