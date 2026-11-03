# ☁️ Kurd Book — Cloudflare Deploy Guide

Step-by-step guide to host the **Admin dashboard** on Cloudflare Pages and the **API** on a Cloudflare Tunnel, after applying all the code/config fixes in this repository.

Fixes already applied in code:

- `apps/web/vite.config.ts` and `apps/admin/vite.config.ts` now include `server.allowedHosts: true` and `preview.allowedHosts: true` — this fixes the Vite error:
  `meeting-organisms-*.trycloudflare.com is not allowed` when the dev server is reached through a Cloudflare Tunnel.
- SPA fallback added: `apps/web/public/_redirects` and `apps/admin/public/_redirects` contain `/* /index.html 200`.
- `apps/api/.env` cleaned (no stray characters in `APP_ORIGINS`, trimmed `PUBLIC_API_URL` / `PUBLIC_APP_URL`).

---

## 1. Prerequisites

- Node.js >= 20, npm.
- Cloudflare account with a free/paid plan (Pages + Tunnel included in free plan).
- The API must be running locally first: `npm run dev:api` (port `4000`).
- Admin dashboard build: `npm run build -w @kurdbook/admin`.

## 2. Install Cloudflare tooling

```bash
npm install -g cloudflared wrangler
# or download the binary directly: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation
```

Log in to Cloudflare from the terminal:

```bash
cloudflared tunnel login
wrangler login
```

## 3. Create a Cloudflare Tunnel for the API

```bash
cloudflared tunnel create kurdbook-api
```

This creates credentials at `~/.cloudflared/<tunnel-id>.json`.

Create/update the tunnel config (`~/.cloudflared/config.yml`):

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /root/.cloudflared/<TUNNEL_UUID>.json

ingress:
  - hostname: kurdbook-api.<your-domain.com>
    service: http://localhost:4000
  - service: http_status:404
```

Or, if you are using a quick tunnel for testing (no custom domain):

```bash
cloudflared tunnel --url http://localhost:4000
```

Quick-tunnel URL looks like: `https://meeting-organisms-xxxxx.trycloudflare.com` — use this as `PUBLIC_API_URL` / `PUBLIC_APP_URL` / the Flutter `baseUrl`.

## 4. Configure the API environment (production values)

On the server/container where the API runs:

```bash
cd apps/api
cp .env .env.production   # then edit
```

Set in `apps/api/.env` (or via Cloudflare/secret store):

```env
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
APP_ORIGINS=https://kurdbook-web.pages.dev,https://kurdbook-admin.pages.dev,<YOUR_TUNNEL_OR_CUSTOM_DOMAIN>
PUBLIC_API_URL=https://<YOUR_TUNNEL_OR_CUSTOM_DOMAIN>
PUBLIC_APP_URL=https://<YOUR_TUNNEL_OR_CUSTOM_DOMAIN>
JWT_SECRET=<strong-random>
JWT_REFRESH_SECRET=<strong-random>
OTP_SECRET=<strong-random>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_DAYS=30
OTP_DEBUG=false
EMAIL_PROVIDER=console
SMS_PROVIDER=console
PAYMENTS_MODE=sandbox
UPLOAD_DIR=./uploads
MAX_UPLOAD_MB=250
```

Restart the API after editing:

```bash
npm run dev:api   # or your production process manager
```

## 5. Deploy Admin dashboard to Cloudflare Pages

```bash
npm install -g wrangler
wrangler login
wrangler pages project create kurdbook-admin
wrangler pages deploy apps/admin --project-name kurdbook-admin \
  --build-command "npm run build -w @kurdbook/admin" \
  --output-directory "apps/admin/dist"
```

Or via the Cloudflare dashboard: Pages → Create → Connect to Git (repo) → set:

- Build command: `npm run build -w @kurdbook/admin`
- Output directory: `apps/admin/dist`
- Root directory: `apps/admin` (or repo root with the workspace command)

Add Pages environment variable:

```env
VITE_API_URL=https://<YOUR_TUNNEL_OR_API_DOMAIN>
```

Deploy the user web app the same way (separate project or same project with different build):

```bash
wrangler pages deploy apps/web --project-name kurdbook-web \
  --build-command "npm run build -w @kurdbook/web" \
  --output-directory "apps/web/dist"
```

Add Pages env var:

```env
VITE_API_URL=https://<YOUR_TUNNEL_OR_API_DOMAIN>
```

## 6. Start the tunnel

```bash
cloudflared tunnel run kurdbook-api
```

In production, the API should be listening on the same host the tunnel forwards to (localhost:4000).

## 7. Verify

- Admin: `https://<YOUR_DOMAIN>/` → should load the dashboard.
- API health: `https://<YOUR_DOMAIN>/api/health` (or root) → should respond.
- Web: `https://<YOUR_DOMAIN>/` → should load the PWA.
- Tunnel logs: `cloudflared tunnel run kurdbook-api`.

## 8. Flutter native app connection

Point the native client at the public API:

```dart
final ApiClient apiClient = ApiClient(baseUrl: 'https://<YOUR_TUNNEL_OR_API_DOMAIN>');
```

The native client sends `Authorization: Bearer <accessToken>` and a JSON body refresh token (`/api/auth/refresh` now accepts `token` in the body — additive backend change), so no WebView is needed.

---

## Checklist

- [ ] `apps/web/vite.config.ts` + `apps/admin/vite.config.ts` have `server.allowedHosts` / `preview.allowedHosts`.
- [ ] `apps/web/public/_redirects` + `apps/admin/public/_redirects` exist with `/* /index.html 200`.
- [ ] `apps/api/.env` has clean `APP_ORIGINS` (no stray characters) and trimmed public URLs.
- [ ] API returns `refreshToken` in login/refresh responses (additive) and accepts `token` in refresh body.
- [ ] `npm run typecheck` passes for api/web/admin.
- [ ] `npm run build -w @kurdbook/web` and `-w @kurdbook/admin` succeed.
- [ ] Cloudflare tunnel running, Pages deployed, env vars set.
