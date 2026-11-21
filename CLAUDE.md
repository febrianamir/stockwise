# Stockwise

Monorepo:
- `backend/` — Laravel REST API (see `backend/CLAUDE.md` for Laravel/Boost guidelines)
- `frontend/` — React app that consumes the API

## Design documents (required for all frontend work)

Before starting any frontend work (new pages, components, styling, layout, UX copy, or frontend data handling), read and follow:

- `docs/design/design-system.md`: visual language, including colour tokens, typography, spacing, radius, shadows, layout shell, buttons, forms, tables, status badges, icons, charts, responsiveness, interaction states and accessibility.
- `docs/design/ui-guidelines.md`: how UI is built, including reuse before creation, page structure, navigation and tenant/branch context, tables, forms, feedback states, dialogs, permissions, React implementation rules, the AI agent workflow and the UI Definition of Done.
- `docs/design/dashboard-spec.md`: requirements for the `/dashboard` page, including KPIs, chart, widgets, API contract, business rules, states, responsive layout and acceptance criteria. Use it as the template for how other page specs are structured.

These are auto-imported by `frontend/CLAUDE.md`, but read them explicitly when starting frontend work from the repo root.

Rules:
- For visual and UX decisions, the design documents are the source of truth. If they conflict with existing code or with the conventions below, point out the conflict and ask before deviating. Don't silently pick one.
- Follow the agent workflow and Definition of Done in `ui-guidelines.md` §15–16. A UI task is not complete just because it compiles: verify it in the browser (desktop and mobile, interactions, console errors), or state clearly that browser verification was not done.
- When a page has its own spec in `docs/design/`, read it before implementing that page.
- When a design decision changes intentionally, update the relevant design document in the same piece of work.

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
- Verify with `npm run lint` and `npm run build` (runs `tsc -b`).

## Documentation

`README.md` at the repo root is the project's main documentation (project description, tech stack, how to run locally, configuration, testing). After any change, check whether it made the README inaccurate or incomplete, and update it in the same piece of work. Examples:
- new or changed setup steps, commands, prerequisites or ports
- new environment variables or changed defaults
- new apps, services or major dependencies (database, queue, cache, auth method)
- new major features or a change in project status

Don't update it for internal changes that don't affect how the project is described, set up or run.

## Commit messages

Format: `<type>(<app>/<feature or part>): <message>`

- `<type>`: a conventional commit type — `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`, `perf`, `build`, `ci`, etc.
- `<app>`: `backend` for changes under `backend/`, `frontend` for changes under `frontend/`.
- `<feature or part>`: the feature or area touched, e.g. `auth`, `api`, `cors`, `products`.

Examples:
- `feat(backend/auth): add Sanctum SPA login endpoint`
- `fix(backend/api): return JSON 401 instead of redirecting guests`
- `chore(frontend/deps): upgrade react-router`

If a change touches both `backend/` and `frontend/`, split it into two commits, one per app, each following the format above. Never mix backend and frontend files in a single commit.

Do not add a `Co-Authored-By: Claude ...` trailer (or any other AI attribution line) to commit messages unless the user explicitly asks for it in that request.

Root-level / general files (`README.md`, `CLAUDE.md`, `compose.yaml`, `docker/`, etc.):
- If they are the only files changed, use the `repo` scope, e.g. `docs(repo/readme): ...`.
- If they change together with `backend/` or `frontend/` files, include them in that app's commit; don't split them out.
