# Founder preview & sign-in verification

## Quick start (localhost)

```bash
sudo service postgresql start   # if needed
cp .env.example .env            # set BETTER_AUTH_SECRET (any long random string)
npm install --legacy-peer-deps
npm run db:push
npm run db:seed
npm run dev
```

Open **http://localhost:43123/sign-in**

## Seeded accounts

Password for all seeded users: **`password123`**

| Role      | Org A                 | Org B                 |
|-----------|------------------------|------------------------|
| Admin     | admin@org-a.test       | admin@org-b.test       |
| Agent     | agent@org-a.test       | agent@org-b.test       |
| Requester | requester@org-a.test   | requester@org-b.test   |

Sign-in should land on `/portal` and stay authenticated (no bounce back to sign-in).

Wrong password shows **Invalid email or password** on the form (no silent loop).

If you were redirected from a protected page, sign-in may show a yellow notice (session expired, missing membership, etc.) via `?error=` query param.

## Cursor Cloud Preview tunnel

1. Start the dev server: `npm run dev` (port **43123**).
2. Open **Preview** in the agent run (HTTPS tunnel to this VM’s dev server).
3. Browse the app using the **preview URL hostname** (do not hard-code `localhost` in the browser on your machine).
4. No extra production credentials are required. Better Auth resolves `baseURL` from the request host when it matches default allowed patterns (`*.cursor.com`, `*.cursor.sh`, `*.cursorpreview.com`, etc.) and trusts `x-forwarded-proto` / `x-forwarded-host` from the preview proxy.
5. Optional: add a specific preview origin to `.env`:
   - `BETTER_AUTH_TRUSTED_ORIGINS=https://<your-preview-host>`

### Verify sign-in on preview

1. Go to `/sign-in` on the preview URL.
2. Sign in as `admin@org-a.test` / `password123`.
3. Confirm you remain on `/portal` after refresh.
4. Open `/admin` — should load (not redirect loop to sign-in).

## Commands (acceptance)

```bash
npm run build
npm test -- --run
```

## Root cause (M3 fix summary)

- Static `BETTER_AUTH_URL=http://localhost:43123` broke session cookies and origin checks when using an HTTPS preview host.
- Seeded users had DB rows but **no credential `account` password** — sign-in failed while sign-up for the same email could appear to work until portal layout rejected missing session/membership.
- Sign-in form did not surface Better Auth `{ error }` responses, causing a redirect loop with no message.
