# Deploying to Railway

Production: **https://new.cribsheets.com.au** — one Railway service (`cribsheets-web`) built from **`main`**.

## How deploys are triggered

1. **GitHub → Railway (primary)** — Service source is `Lachlan-McEwen/cribsheets-web` branch **`main`**. Each push to `main` should start a Railway build using `railway.toml` (`npm run build`, then `npm start`).

2. **GitHub Actions (CI + smoke)** — Workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):
   - **Production build** on every push/PR to `main` (same install + build as Railway).
   - **Production smoke** on push to `main`: polls `/api/health` until `{ "ok": true, "staticUi": true }`.

3. **GitHub Actions deploy (optional backup)** — If repo secret **`RAILWAY_TOKEN`** is set (Railway project → **Settings → Tokens** → production-scoped project token), the workflow also runs `railway up` for that commit. If the secret is missing, the step is skipped and only the GitHub source trigger runs.

## One-time setup checklist

| Step | Where |
|------|--------|
| Volume at `/data`, `DATA_DIR=/data` | Railway service |
| Email: `RESEND_API_KEY`, `EMAIL_FROM` | Railway variables |
| Source: repo + **`main`** branch | `railway service source connect --repo Lachlan-McEwen/cribsheets-web --branch main --service cribsheets-web` |
| (Optional) `RAILWAY_TOKEN` | GitHub repo → Settings → Secrets |
| (Recommended) Require **CI / Production build** before merging to `main` | GitHub branch protection |

## Build failures (historical)

Do **not** put `npm ci` in `railway.toml` `buildCommand`. Railpack already runs `npm install`; a second `npm ci` often fails with **`EBUSY`** on `node_modules/.vite` and leaves production on the last successful deploy.

## Manual deploy

```powershell
railway redeploy --from-source -y --service cribsheets-web
```

Or from a clean checkout at the commit you want:

```powershell
railway up -y -c --service cribsheets-web --environment production
```

## Verify after deploy

- Admin nav: deploy label should match a recent commit on `main`.
- `GET https://new.cribsheets.com.au/api/health` → `"ok": true`, `"staticUi": true`.
