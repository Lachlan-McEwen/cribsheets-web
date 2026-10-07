# Deploying to Railway

| Environment | URL | Service | Git branch |
|-------------|-----|---------|------------|
| Production | **https://new.cribsheets.com.au** | `cribsheets-web` | **`main`** |
| Staging | **https://staging.cribsheets.com.au** | `cribsheets-web-staging` | **`staging`** |

Staging is a separate Railway service with its **own** volume (`/data`). It does not share production SQLite data.

## Deploy

- **Production:** push to **`main`**
- **Staging:** push to **`staging`**

Railway builds with `railway.toml` (`npm run build`, then `npm start`).

GitHub Actions runs the same production build on push/PR to **`main`** and **`staging`** so broken builds show up in CI before Railway deploys.

## Railway setup (each service)

- Volume at **`/data`**, variable **`DATA_DIR=/data`**
- Source: **`Lachlan-McEwen/cribsheets-web`**, branch as in the table above
- Do **not** add `npm ci` to `railway.toml` `buildCommand` (causes flaky **`EBUSY`** on `node_modules/.vite`)

### Staging-only variables

Set on **`cribsheets-web-staging`** (production keeps its existing values):

| Variable | Staging value |
|----------|----------------|
| `PUBLIC_APP_URL` | `https://staging.cribsheets.com.au` |
| `EMAIL_SEND_MODE` | `log` (emails are logged, not sent via Resend) |

Copy other app variables from production as needed (`ADMIN_*`, `RESEND_API_KEY`, etc.). Staging bootstraps a **fresh** admin from `ADMIN_*` on first boot.

## DNS (Cloudflare)

Custom domain on the staging service: **`staging.cribsheets.com.au`**. Add the CNAME Railway shows in **Domains** (target is usually `{something}.up.railway.app`). Proxy (orange cloud) is fine if production uses the same pattern.

## Verify

Admin nav deploy label should match the commit Railway built. `GET /api/health` → `"ok": true`, `"staticUi": true`.

## Manual redeploy

If Railway did not pick up a commit after a push, use the Railway dashboard **Redeploy** on the latest commit, or:

```powershell
# Production
railway redeploy --from-source -y --service cribsheets-web

# Staging
railway redeploy --from-source -y --service cribsheets-web-staging
```

## Workflow

1. Merge feature work into **`staging`** and validate on **https://staging.cribsheets.com.au**
2. Merge **`staging`** → **`main`** when ready for production
