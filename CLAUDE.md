# Stockwise

Monorepo:
- `backend/` — Laravel REST API (see `backend/CLAUDE.md` for Laravel/Boost guidelines)
- `frontend/` — React app that consumes the API

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
