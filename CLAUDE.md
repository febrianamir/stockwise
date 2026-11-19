# Stockwise

Monorepo:
- `backend/` — Laravel REST API (see `backend/CLAUDE.md` for Laravel/Boost guidelines)
- `frontend/` — React app that consumes the API

## Frontend

- React 19 + Vite + TypeScript + Tailwind CSS v4 (`@import "tailwindcss"` in `src/index.css`, no config file).
- Import from `src` via the `@/` alias.
- All backend calls go through the central client in `src/lib/api/` (`api.get/post/put/patch/delete`). Don't call `fetch` directly.
  - Add one module per resource (e.g. `src/lib/api/products.ts`) and re-export it from `src/lib/api/index.ts`.
  - Keep TypeScript types in `src/lib/api/types.ts` in sync with the backend's API Resources.
  - Errors are thrown as `ApiError` (`status`, `errors`, `fieldError(field)`, `isValidationError`, `isUnauthorized`).
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

Root-level / general files (`README.md`, `CLAUDE.md`, `compose.yaml`, `docker/`, etc.):
- If they are the only files changed, use the `repo` scope, e.g. `docs(repo/readme): ...`.
- If they change together with `backend/` or `frontend/` files, include them in that app's commit; don't split them out.
