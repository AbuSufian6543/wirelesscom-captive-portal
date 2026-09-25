# Development

## Local app

PostgreSQL is required to run the server. Unit tests are not; they use in-memory ports of the guest, voucher, authorization, and redirect services.

```bash
npm install
npm test
```

With Docker:

```bash
cp .env.example .env
# ./deploy.sh generates SESSION_SECRET and APP_ENCRYPTION_KEY. The admin password is already in .env.example.
# For a database on the host instead of Compose, point DATABASE_URL at it.
docker compose up -d db
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev
```

Staff UI: `http://127.0.0.1:3000/admin/login`

Guest preview (WirelessCom seed AP):

```
http://127.0.0.1:3000/guest/s/default/?ap=d0:21:f9:bc:38:d4&id=e4:a7:a0:74:f9:b9&t=1790349699&url=http://www.msftconnecttest.com/redirect&ssid=Captive%20Portal%20Test%20SE
```

Pinos uses `d0:21:f9:bc:38:d4` and SSID `Pinos-Guest`. Trinity uses `aa:bb:cc:dd:ee:ff` and SSID `Trinity-Guest`.

## Tests

`npm test` covers:

- UniFi query parsing and MAC validation
- AP lookup and the three branded portal flows
- unknown AP, unknown tenant path, expired session
- client authorization through the mock provider
- voucher redemption
- password reset single-use tokens
- open-redirect rejection
- unauthorized and cross-tenant staff access

## Production build

```bash
npm run build
npm start
```

## Guest UI constraints

Do not add a client component, web font, analytics tag, or large image to `src/server/portal/render.ts`. Captive browsers often have no internet until UniFi authorization returns. Branding images must be same-origin (`/branding` or `/media`).

## Admin UI

The dashboard is a normal staff application and is allowed to be richer than the guest portal. It still uses server-rendered forms so it works without a separate frontend build.
