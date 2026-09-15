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

## Cursor Cloud Preview (Founder VM tunnel)

Dev server listens on **`http://127.0.0.1:43123`** inside the Cloud Agent VM. Use the run **Preview** card (tunnel); do not assume a local clone on your laptop.

### Exact `.env` for preview (no prod secrets)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/blank_itsm
BETTER_AUTH_SECRET=dev-only-change-me-not-for-production
BETTER_AUTH_URL=http://127.0.0.1:43123
NEXT_PUBLIC_BETTER_AUTH_URL=http://127.0.0.1:43123
NODE_ENV=development
```

- **`BETTER_AUTH_URL` / `NEXT_PUBLIC_BETTER_AUTH_URL`**: fallback origins when the proxy does not send forwarded headers. Match how you open Preview (`127.0.0.1` vs `localhost` — use the same host you see in the browser address bar).
- **Do not set** production Resend/DNS or purchased credentials.
- **Optional** (only if Preview shows an HTTPS `*.cursor.com` hostname and sign-in still fails origin checks):

```env
BETTER_AUTH_TRUSTED_ORIGINS=https://<your-preview-host-from-address-bar>
```

Defaults already allow `*.cursor.com`, `127.0.0.1`, and `localhost`; `BETTER_AUTH_TRUSTED_PROXY_HEADERS` defaults to enabled for the preview proxy.

### After changing `.env` or pulling this fix

```bash
npx drizzle-kit push --force
npm run db:seed
# restart dev server (stop + npm run dev)
```

1. Start the dev server: `npm run dev` (port **43123**).
2. Open **Preview** on the agent run.
3. Browse using the URL shown in Preview (tunnel host).

### 3-step Founder retest (M3 gate)

**Seeded org admin (recommended — matches seed data):**

1. **Sign-in** (not sign-up): `/sign-in` → `admin@org-a.test` / `password123` → submit.
2. Confirm you **land on `/portal`** and stay there after refresh (no bounce to sign-in).
3. Open **`/admin`** → users/branding loads (admin access).

**New email sign-up (optional):**

1. **Sign-up** with a *new* email (not `admin@org-a.test`) → you may reach `/portal` briefly.
2. You should see a **clear yellow notice** on `/sign-in?error=membership` if the account has no org membership (not a silent loop).
3. Use a **seeded** address + **sign-in** + `password123` for portal/admin (step 1–3 above).

Wrong password shows a **red inline error** on the sign-in form.

## Commands (acceptance)

```bash
npm run build
npm test -- --run
```

## Root cause (M3 fix summary)

- Static `BETTER_AUTH_URL=http://localhost:43123` broke session cookies and origin checks when using an HTTPS preview host.
- Seeded users had DB rows but **no credential `account` password** — sign-in failed while sign-up for the same email could appear to work until portal layout rejected missing session/membership.
- Sign-in form did not surface Better Auth `{ error }` responses, causing a redirect loop with no message.
