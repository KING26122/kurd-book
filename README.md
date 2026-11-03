# کورد بووک — Kurd Book

**کورد بووک** تۆڕی کۆمەڵایەتی و پۆستینەکی کوردستانە: پۆست، ستۆری، چاتی پارێزراو، چاتی ئێندۆ، لایڤ و شاشە هاوبەشکردن. ئەم نەرێنی پروژە لە دوو ئەپکەوە (ئایکس) و بەڕێوەبەری کورد بووکەوە لەوێ ڕۆژەکە دەربەست.

## پێکهاتە

پروژە لە workspace بەبارەکانی `monorepo` پێکهاتووە:

- `apps/api` — Fastify، Prisma، SQLite، Socket.IO، E2EE Crypto، OTP، LiveKit، Payments.
- `apps/web` — React / Vite / Tailwind / PWA، چات E2EE، ستۆری، پۆست، لایڤ، ئایکس.
- `apps/admin` — React / Vite / داشبورد بەڕێوەبەر، ڕاپۆرتی سروشت، پشتڕاستکردنەوە، درختی کۆمەڵایەت.
- `mobile` — Native Flutter client (کورد بووک) بۆ Android — بۆ تاقیکردنی `flutter run -d android`.

## دەستپەردەی سەرەکی

- Node.js >= 20
- npm
- Flutter >= 3.10 (وبڵی `C:\flutter`) بۆ ئایپ کۆمەڵایەتی

بە واتای:

```bash
npm install
npm run setup
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:5173
- Admin: http://localhost:5174

بۆ ئایپ کۆمەڵایەتی کورد بووک (Native Flutter):

```bash
cd mobile
flutter pub get
flutter run -d android
```

## ئەم پروژەتانە ناوەندەکانە

- پۆست و ناوەڕۆکی ڕووناکی.
- ستۆری کۆمەڵایەتی بە ڕەنگ و کەمێک ئەرکی بۆ نزیکەران.
- چات بە سێرەری سروشت و دوو ئەندۆ-ئەندۆ پارێزراو.
- ئایکس پارێزراو: درێژ، زۆر ژینگە، کۆڤە، گۆران.
- چاتی ئێندۆ-ئێندۆ و پشتڕاستکردن.
- لایڤ و شاشە هاوبەشکردن بۆ ئەندامانی Pro.
- پشتڕاستکردنەوە بە ناسنامەی نیشتمانی + ڤاڵۆی تێک.
- تاج و ئەڵماس بۆ ئەندامانی Pro.

## ئەوەی پێویستییە لە بەشێوەی ڕووناکی هەیە

- بڕێک ئایینی ناسنامەی نیشتمانی.
- مەیلە بە مەیلمەکان لەوانەیە.
- هەڵگرتنەوەی خۆیەکان.

## ئامادەکردن

```bash
npm run db:push
npm run db:seed
```

### ئەمە ئامادەکراوەکانە

- ئایکۆن: admin@kurdbook.app / Admin1234!
- دیمۆ: demo@kurdbook.app / Demo1234!
- دیمۆ بە شێوەی تر: KurdBook1234!
- لێکەڵە پۆستەکان و ستۆری نموونەیی.

### ئامێرە نموونەییەکان

- ئایکۆنی ١٩٢: /icons/icon-192.png
- ئایکۆنی ٥١٢: /icons/icon-512.png
- ئایکۆنی ماسکابل: /icons/maskable-512.png
- وێنە: /logo.svg

## پشتڕاستکردنەوە

پشتڕاستکردنەوەی بەشەکانی سێرەر:

- ناسنامەی پێشەوە / دواوە / سێلفی.
- زیاتر لەوانەیە: ئێستا داخلەی پشتڕاستکردنەوەی سێلفی.

ئایکۆنی بەشەکانی سێرەر:

- تۆڵکردنەوە
- سەرکەوتنەوە
- نەسینکردنەوە
- بەرگرتنی درێژ

## Pro

- پلانی Pro: ئەندامێتی ساڵانە / ساڵ.
- ڤاڵۆی پارەدان: sandbox (تاقیکردنەوە).
- هەڵگرتن: Pro بەردەوامەوە.
- سروشت بەردەوامەوە بۆ ساڵ.

## LiveKit

- ئایکۆن: LIVEKIT_URL، LIVEKIT_API_KEY، LIVEKIT_API_SECRET.
- ئەگەر ئەم فیلدە ناوەند نێرۆستراببێت، ئایکۆن LiveKit بە شێوەی داخلە.

## OTP / SMS / Email

- Development: console = کۆد لە کۆنتەرول/UI دەرکەوێت.
- Email: SMTP (Brevo، Resend، SMTP Gmails).
- SMS: Twilio، TextBelt، SMS Webhook.
- Admin dashboard: /auth/login.

## ئامێرەکان و دۆخی چوونەژوور

- API 4000
- Web 5173
- Admin 5174

## دەستپەنداوەی بەشێوەی ڕووناکی

### Admin dashboard

- http://localhost:5174
- بە شێوەی `X-KB-Client: admin` و refresh cookie خۆی بەدەوامەوە دەکرێت.

### Web

- http://localhost:5173
- کۆد فایلوەکانی تاقیکردنەوە لە /auth/login ڕوون دەکرێت.

## ڕێکەوتە

- ئایکۆنی داخلەی پشتڕاستکردنەوەی سێلفی: /auth/verify?user=... ئایکۆنی کۆد بۆ تاقیکردنەوە.

## دۆخی کۆمەڵایەت

- کۆردار: /friends
- چاتی: /messages
- لایڤ: /live
- پۆست: /
- ستۆری: /stories
- پشتڕاستکردن: /verification
- Pro: /pro
- ڕۆژەکە: /settings

## ئایپ کۆمەڵایەتی کورد بووک (Native Flutter)

ئایپی کارگێڕی کورد بووک لە **Flutter / Dart** دەسەڵێتەوە — بەبێ WebView، ڤیزە Web و پێویستی نییە. ڕەنگ، ڤیمە، ھەڵەق و ڕێکەوتی UI/UX بە شێوەیەکی ڕەسێنی port کردووە.

- شوێنەکان: `mobile/`
- دەستپەنداوە: `cd mobile && flutter run -d android`
- Theme tokens: `mobile/lib/theme/kurd_book_theme.dart`
- Design widgets: `mobile/lib/widgets/kurdbook_widgets.dart`
- API client: `mobile/lib/data/api_client.dart` (baseUrl: `https://kurdbook.app`)
- Auth store: `mobile/lib/state/auth_store.dart`

ئەم ئایپە پێییەنەوە بەکاردەهێنرێت:

```bash
cd mobile
flutter pub get
flutter run -d android
```

## هۆکاری Cloudflare (Admin + Web + API)

- Admin dashboard: Cloudflare Pages.
- API: Cloudflare Tunnel (`cloudflared tunnel run ...`).
- Vite allowedHosts fix: `apps/web/vite.config.ts`, `apps/admin/vite.config.ts` (`server.allowedHosts` / `preview.allowedHosts`).
- SPA fallback: `apps/web/public/_redirects`, `apps/admin/public/_redirects`.

**Guide تەمەنی:** `docs/CLOUDFLARE_DEPLOY.md`

## بەڵامێنە

### نموونەی تاقیکردنەوە

هەموو ئامێرە نموونەییەکان و ئەوەی کە تەنها بۆ تاقیکردنەوەی دۆخی پڕۆژە.

### فایەڵە پاکەکان

- `.env` و `.env.local` ڕەسەنکایە.
- `.env.example` پێنە پڕۆژەکانی ڕوون.
- ئامێرە پاکەکان ئایکی سێرەری کۆمەڵایەت دەست بەدەوام ناکەن.

## دۆزینەوە

- `npm run typecheck`
- `npm run build`
- `npm run db:seed`

## ئایکنە

- تێبینی: نموونەی کۆد OTP بۆ تاقیکردنەوە.
- LiveKit ناوەند: ئایکۆن.
- پارەدان: sandbox.
- فایەڵە ڕاستەقینەکان: دەکرێت.

---

# Kurdish development notes

This project is intentionally bilingual: the user-facing application is in Kurdish, while technical identifiers remain in English.

## Core commands

| Command | Description |
|---|---|
| `npm install` | Install workspace dependencies |
| `npm run setup` | Install, push database, seed demo data |
| `npm run dev` | Run API, web, and admin dev servers |
| `npm run build` | Build API, web, and admin |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run db:push` | Push Prisma schema |
| `npm run db:seed` | Seed deterministic demo data |

## Environment variables

### API

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` / `test` / `production` |
| `PORT` | Fastify port, default `4000` |
| `HOST` | Bind host, default `0.0.0.0` |
| `APP_ORIGINS` | Allowed web origins |
| `DATABASE_URL` | SQLite or PostgreSQL |
| `JWT_SECRET` | Access token secret |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `OTP_SECRET` | OTP secret |
| `ACCESS_TOKEN_TTL` | Access token TTL |
| `REFRESH_TOKEN_DAYS` | Refresh token lifetime |
| `UPLOAD_DIR` | Upload root |
| `MAX_UPLOAD_MB` | Max upload size |
| `OTP_DEBUG` | Show OTP code in API/UI |
| `EMAIL_PROVIDER` | `console` / `smtp` |
| `SMTP_*` | Email SMTP settings |
| `SMS_PROVIDER` | `console` / `twilio` / `textbelt` / `webhook` |
| `TWILIO_*` / `TEXTBELT_KEY` / `SMS_WEBHOOK_*` | SMS settings |
| `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | LiveKit streaming |
| `PAYMENTS_MODE` | `sandbox` / `live` |
| `PUBLIC_APP_URL` / `PUBLIC_API_URL` | Public URLs |
| `FIB_*` / `FASTPAY_*` / `QICARD_*` | Payment provider settings |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` / `ADMIN_USERNAME` | Admin seed account |

### Web

| Variable | Description |
|---|---|
| `VITE_API_URL` | API base URL |

### Admin

| Variable | Description |
|---|---|
| `VITE_API_URL` | API base URL |

## PostgreSQL migration

Development currently uses SQLite. For production, change:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then create a PostgreSQL database and run:

```bash
npm run db:push -w @kurdbook/api
```

Recommended production environment:

- API deployed publicly.
- Web deployed on a CDN origin allowed by `APP_ORIGINS`.
- Admin deployed on a separate protected origin.
- Reverse proxy with TLS.
- SQLite replaced by managed PostgreSQL.
- Persistent object storage for uploads.

## Deployment

- Web/Vite: Vercel, Netlify, Cloudflare Pages, or VPS.
- Admin: same Node service, separate domain/port and admin auth.
- API: Docker, Railway, Fly.io, Render, or VPS.
- Use HTTPS and strong secrets.
- Set `NODE_ENV=production`.
- Set OTP/SMS/email/payment/livekit production values.
- Keep admin cookie isolated from user cookie.

## Security notes

- Access and refresh tokens are short-lived.
- Refresh token rotation is server-side.
- Admin refresh token is separate and only issued for `ADMIN` users.
- Chat is end-to-end encrypted with X25519, HKDF-SHA256 and XChaCha20-Poly1305.
- Server stores encrypted chat ciphertext only.
- Reported chat evidence is decrypted on user consent and then stored for admin review.
- Uploads: public originals or private user-owned files.
- Private verification and receipt files are protected.
- Rate limits and authentication middleware on sensitive routes.
- Private admin files are served through authenticated admin API routes.

## Known external tasks

These items require real credentials or release decisions and are intentionally outside default demo behavior:

- Real SMS provider, email provider, payment merchant accounts, LiveKit credentials.
- Production secrets and domain.
- Database migration to PostgreSQL.
- Deployment and app-store publishing.
- Real identity verification workflows with authorized provider integration.
- Legal content and media policy.

## Final operational commands

```bash
npm run typecheck
npm run build
npm run db:seed
npm run dev
```

Run only:

- API on port `4000`
- Web on port `5173`
- Admin on port `5174`
