# Deploying to Railway

Production: **https://new.cribsheets.com.au** — service **`cribsheets-web`**, branch **`main`**.

## Deploy

Push to **`main`**. Railway builds with `railway.toml` (`npm run build`, then `npm start`).

GitHub Actions runs the same production build on push/PR so broken builds show up in CI before you rely on Railway.

## Railway setup

- Volume at **`/data`**, variable **`DATA_DIR=/data`**
- Source: **`Lachlan-McEwen/cribsheets-web`**, branch **`main`**
- Do **not** add `npm ci` to `railway.toml` `buildCommand` (causes flaky **`EBUSY`** on `node_modules/.vite`)

## Verify

Admin nav deploy label should match the commit Railway built. `GET /api/health` → `"ok": true`, `"staticUi": true`.

## Manual redeploy

If Railway did not pick up a commit after a push, use the Railway dashboard **Redeploy** on the latest commit, or:

```powershell
railway redeploy --from-source -y --service cribsheets-web
```
