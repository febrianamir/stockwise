# Stockwise

Stockwise is a point-of-sale (POS) system built for businesses that operate across **multiple stores, warehouses, and cashiers**. It aims to give owners a single place to manage sales at the counter, track stock across every location, and control who can do what at each store.

> **Status:** early development. The backend API and frontend app are scaffolded; POS features are being built.

## Tech stack

| Part | Stack |
| --- | --- |
| `backend/` | Laravel 13 (PHP 8.3+) REST API, Laravel Sanctum, SQLite (default for local dev), PHPUnit, Laravel Pint, Laravel Boost |
| `frontend/` | React 19, Vite, TypeScript, Tailwind CSS v4, Oxlint |

The frontend talks to the backend over a versioned JSON API at `/api/v1`, through a central client in `frontend/src/lib/api/`.

## Repository structure

```
stockwise/
├── backend/    # Laravel REST API
├── frontend/   # React single-page app
├── CLAUDE.md   # Conventions for AI-assisted development (commit rules, etc.)
└── README.md
```

## Prerequisites

- **PHP 8.3+** with the `curl`, `mbstring`, `xml`/`dom`, `pdo_sqlite`, `zip`, `bcmath` and `intl` extensions
  - Debian/Ubuntu: `sudo apt install php8.5-curl php8.5-mbstring php8.5-xml php8.5-sqlite3 php8.5-zip php8.5-bcmath php8.5-intl` (adjust the version to your PHP)
- **Composer 2.9+** (older 2.x releases crash on PHP 8.5; run `composer self-update` if needed)
- **Node.js 20.19+ or 22.12+** with npm

## Running locally

### 1. Backend (API) — http://localhost:8000

```bash
cd backend
composer run setup      # installs dependencies, creates .env, generates the app key, creates the SQLite DB and runs migrations
php artisan db:seed     # optional: creates a test user (test@example.com / password)
composer run dev        # starts the API server, queue worker, and log tail
```

Check it's up: `curl -H "Accept: application/json" http://localhost:8000/api/v1/user` should return `{"message":"Unauthenticated."}`.

### 2. Frontend (web app) — http://localhost:5173

In a second terminal:

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
| `DB_CONNECTION` | `backend/.env` | `sqlite` | Database driver (`mysql`, `pgsql`, … also supported) |
| `VITE_API_URL` | `frontend/.env` | `http://localhost:8000/api/v1` | API base URL used by the frontend client |

## Testing and code quality

```bash
# Backend
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
