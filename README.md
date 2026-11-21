# Stockwise

Stockwise is a point-of-sale (POS) system built for businesses that operate across **multiple stores, warehouses, and cashiers**. It aims to give owners a single place to manage sales at the counter, track stock across every location, and control who can do what at each store.

> **Status:** early development. The backend API and frontend app are scaffolded; POS features are being built.

## Tech stack

| Part | Stack |
| --- | --- |
| `backend/` | Laravel 13 (PHP 8.3+) REST API, Laravel Sanctum, PHPUnit, Laravel Pint, Laravel Boost |
| Database | PostgreSQL 18 (Docker Compose for local dev) |
| `frontend/` | React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI), Lucide icons, TanStack Query, Oxlint |

The frontend talks to the backend over a versioned JSON API at `/api/v1`, through a central client in `frontend/src/lib/api/`, with TanStack Query handling caching, refetching and request state.

## Repository structure

```
stockwise/
├── backend/    # Laravel REST API
├── frontend/   # React single-page app
├── docker/     # Init scripts for local services (e.g. creates the test database)
├── docs/design/  # Design system, UI guidelines and page specs (read before frontend work)
├── compose.yaml  # Local PostgreSQL container (stockwise-postgres)
├── CLAUDE.md   # Conventions for AI-assisted development (commit rules, etc.)
└── README.md
```

## Prerequisites

- **PHP 8.3+** with the `curl`, `mbstring`, `xml`/`dom`, `pdo_pgsql`, `zip`, `bcmath` and `intl` extensions
  - Debian/Ubuntu: `sudo apt install php8.5-curl php8.5-mbstring php8.5-xml php8.5-pgsql php8.5-zip php8.5-bcmath php8.5-intl` (adjust the version to your PHP)
- **Composer 2.9+** (older 2.x releases crash on PHP 8.5; run `composer self-update` if needed)
- **Node.js 20.19+ or 22.12+** with npm
- **Docker** with Docker Compose (for PostgreSQL)

## Running locally

### 1. Database — PostgreSQL on localhost:5433

From the repo root:

```bash
docker compose up -d    # starts the stockwise-postgres container
```

This creates the `stockwise` database (used by the app) and `stockwise_test` (used by the test suite), both with user/password `stockwise`/`stockwise`. Data persists in the `stockwise_postgres-data` Docker volume. Stop it with `docker compose stop`; wipe it with `docker compose down -v`.

> The test database is created by `docker/postgres/init/` only when the volume is first initialised. If you created the volume before that script existed, run `docker compose down -v && docker compose up -d`.

### 2. Backend (API) — http://localhost:8000

```bash
cd backend
composer run setup      # installs dependencies, creates .env, generates the app key and runs migrations
php artisan db:seed     # optional: creates a test user (test@example.com / password)
composer run dev        # starts the API server, queue worker, and log tail
```

Check it's up: `curl -H "Accept: application/json" http://localhost:8000/api/v1/user` should return `{"message":"Unauthenticated."}`.

### 3. Frontend (web app) — http://localhost:5173

In another terminal:

```bash
cd frontend
npm install
cp .env.example .env    # VITE_API_URL=http://localhost:8000/api/v1
npm run dev
```

Open http://localhost:5173. The landing page shows whether it can reach the API.

> Use `localhost` (not `127.0.0.1`) for both apps. The backend only allows CORS requests from the origin in `FRONTEND_URL` (`backend/.env`, default `http://localhost:5173`).

## Configuration

| Variable | File | Default | Purpose |
| --- | --- | --- | --- |
| `APP_URL` | `backend/.env` | `http://localhost:8000` | Backend base URL |
| `FRONTEND_URL` | `backend/.env` | `http://localhost:5173` | Allowed CORS origin(s), comma-separated |
| `DB_CONNECTION` | `backend/.env` | `pgsql` | Database driver |
| `DB_HOST` / `DB_PORT` | `backend/.env` | `127.0.0.1` / `5433` | PostgreSQL address (matches `compose.yaml`) |
| `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | `backend/.env` | `stockwise` / `stockwise` / `stockwise` | App database credentials (tests use `stockwise_test`, set in `backend/phpunit.xml`) |
| `VITE_API_URL` | `frontend/.env` | `http://localhost:8000/api/v1` | API base URL used by the frontend client |

## Testing and code quality

```bash
# Backend (needs the Postgres container running)
cd backend
php artisan test --compact
vendor/bin/pint            # format PHP code

# Frontend
cd frontend
npm run lint
npm run build              # type-checks (tsc -b) and builds
```

## Contributing

Commit messages follow `<type>(<app>/<feature>): <message>`, e.g. `feat(backend/auth): add login endpoint`. Changes to `backend/` and `frontend/` go in separate commits. See [`CLAUDE.md`](CLAUDE.md) for the full rules.
