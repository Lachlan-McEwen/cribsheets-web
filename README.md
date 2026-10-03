# CribSheets (React)

Fresh Bun + Vite + React + TypeScript app for porting the legacy ASP.NET CribSheets timesheet UI.

The .NET source lives beside this repo at `../CribSheets`. A local **junction** puts it at `legacy/CribSheets` for reference; that path is **gitignored** and never committed.

## Prerequisites

- [Bun](https://bun.sh/)
- [.NET 7 SDK](https://dotnet.microsoft.com/download/dotnet/7.0) — only if you run the legacy app from `legacy/`

## Setup

```powershell
bun run setup:legacy   # one-time: legacy\CribSheets → ..\CribSheets
bun install   # or npm ci
cd api && npm install && cd ..
# E2E only: npm run test:e2e:install
copy api\.env.example api\.env   # set ADMIN_* , optional DEV_USER_* , and Resend (RESEND_API_KEY, EMAIL_FROM)
```

Each machine needs `setup:legacy` once (or run `scripts/setup-legacy.ps1` manually).

## Development

```powershell
bun dev
```

Runs the Node API (port 3849, SQLite + session cookie) and Vite (proxies `/api`). Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `api/.env`.

Optional legacy ASP.NET UI:

```powershell
dotnet run --project legacy/CribSheets/CribSheets/CribSheets.csproj
```

## Layout

| Path | Purpose |
|------|---------|
| `src/` | React app (auth + timesheet UI) |
| `api/` | Node API — SQLite users/sessions (Mannum Island pattern) |
| `legacy/CribSheets/` | Junction to `../CribSheets` — not in git |

Original app: [lockstock123/CribSheets](https://github.com/lockstock123/CribSheets)

**Export / Excel parity:** [docs/legacy-export-spec.md](docs/legacy-export-spec.md)

## Railway

One service serves the built React UI and `/api` (same as `npm start` locally). SQLite lives on a **volume** at `/data`.

1. Create/link a project (or push this repo and connect GitHub in the Railway dashboard).
2. Add a volume mounted at **`/data`** on the service.
3. Set variables (at minimum):

   | Variable | Example |
   |----------|---------|
   | `NODE_ENV` | `production` |
   | `DATA_DIR` | `/data` |
   | `ADMIN_EMAIL` | your admin login email |
   | `ADMIN_PASSWORD` | strong password (bootstrap on first boot) |
   | `ADMIN_NAME` | optional display name |
   | `ADMIN_EMPLOYEE_NUMBER` | optional |
   | `ADMIN_UNIT_STATION` | optional |
   | `RESEND_API_KEY` | Resend API key (`re_…`) |
   | `EMAIL_FROM` | Verified sender, e.g. `Crib Sheets <noreply@yourdomain.com>` |
   | `EMAIL_REPLY_TO` | optional support inbox |

   Railway sets **`PORT`** automatically. Do not set `CLIENT_ORIGIN` unless the UI is on a different host.

   After deploy, verify email: log in as admin and `POST /api/admin/email/test` (optional JSON `{ "to": "you@example.com" }`). `GET /api/health` reports `email.configured`.

4. Deploy: connect the repo (Railpack uses `package.json` build/start + `railway.toml` health check) or from this directory:

   ```powershell
   railway link    # or railway init --name cribsheets-web
   railway up
   ```

Health check: `GET /api/health` (expects `{ "ok": true, "staticUi": true }`).

**Seed / fix admin** (uses `ADMIN_*` variables against the service volume DB):

```powershell
railway variable set ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='your-password'
bun run seed:admin:railway
# or: railway ssh -- npm run seed:admin --prefix api
```

Creates the admin if missing; if the email already exists, promotes them to admin. Redeploy also runs the same bootstrap on startup.
