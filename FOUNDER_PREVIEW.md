# Founder preview & sign-in verification

## Repository

| Item | Value |
|------|--------|
| **Product name** | `blank-itsm` |
| **Canonical Origin slug** | `ezraanglo/blank-itsm` |
| **HTTPS clone** | `https://origin.cursor.com/git/ezraanglo/blank-itsm.git` |
| **Codebase** | [cursor.com/codebase/ezraanglo/blank-itsm](https://cursor.com/codebase/ezraanglo/blank-itsm) |

### Superseded temp repository

New Project used a temporary Origin slug while the product name was already `blank-itsm`:

| | |
|--|--|
| **Old slug** | `ezraanglo/tmp-24caffaea01e301c` |
| **Old clone** | `https://origin.cursor.com/git/ezraanglo/tmp-24caffaea01e301c.git` |

Branches and `main` were mirrored to **`ezraanglo/blank-itsm`**. Point Cloud Agents and local clones at the canonical URLs above.

**Optional cleanup:** delete `tmp-24caffaea01e301c` in Origin when you no longer need it (`origin repo delete ezraanglo/tmp-24caffaea01e301c` only if you are sure — the temp repo was left in place by default).

```bash
git remote set-url origin https://origin.cursor.com/git/ezraanglo/blank-itsm.git
```

## Continuous integration (no Neon)

| Where | What runs |
|-------|-----------|
| **Local / Cloud Agent** | `npm run ci` → `eslint`, `vitest --run`, `next build` |
| **GitHub** (after mirror) | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — Postgres 16 service on port 5432, same env as tests |
| **Origin / Cursor** | Configure a check that runs `npm ci --legacy-peer-deps && npm run ci` with `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/blank_itsm` and Postgres available (service container or `npm run dev:db` embedded Postgres on agents without a DB) |

Tests use **embedded Postgres** (`embedded-postgres` on port `55432`) when `DATABASE_URL` is unreachable, or your local/docker Postgres when it is. No paid Neon or Vercel is required.

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

### Production `trustedOrigins` tightening (M6)

In production you should **not** rely on the wide default host patterns. Tighten auth without breaking Cursor Preview on this repo:

| Environment | Recommended env |
|-------------|-----------------|
| **Local / Preview** | Keep defaults; optionally set `BETTER_AUTH_TRUSTED_ORIGINS` to the exact Preview URL from the address bar if origin checks fail. Leave `BETTER_AUTH_ALLOWED_HOSTS` unset so `*.cursor.com` and `127.0.0.1` keep working. |
| **Production** | Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL` to your canonical HTTPS app origin. Set `BETTER_AUTH_TRUSTED_ORIGINS` to that same origin (comma-separate staging + prod if needed). Set `BETTER_AUTH_ALLOWED_HOSTS` to your real hostnames only (e.g. `app.example.com,staging.example.com`). Do **not** copy Preview-only hosts into production. |

When `NODE_ENV` is **not** `production`, `parseTrustedOriginList()` merges localhost / `127.0.0.1:43123` and optional `BETTER_AUTH_TRUSTED_ORIGINS`. When the **running server** has `NODE_ENV=production` (not during `next build`), the app **requires** `BETTER_AUTH_URL` plus `BETTER_AUTH_TRUSTED_ORIGINS` (or `TRUSTED_ORIGINS`) and does **not** add preview host patterns — see `.env.example`.

### `itsm_app` role (RLS realism)

Migration [`db/migrations/0006_itsm_app_role.sql`](db/migrations/0006_itsm_app_role.sql) creates a **non-superuser** login `itsm_app` / `itsm_app_test` with DML on `public` tables but **without** bypassing row-level security. The app’s normal `DATABASE_URL` uses `postgres` (superuser) for migrations and app queries; RLS negative tests connect via `ITSM_APP_DATABASE_URL`.

| Context | Behavior |
|---------|----------|
| **Vitest** | `tests/globalSetup.ts` applies `0006` and sets `ITSM_APP_DATABASE_URL` automatically. |
| **Local Postgres** | After `db:push` / migrations: `psql "$DATABASE_URL" -f db/migrations/0006_itsm_app_role.sql` |
| **CI Postgres service** | Same migration is applied in global setup when tests connect to the service DB. |
| **Optional manual** | Export `ITSM_APP_DATABASE_URL=postgresql://itsm_app:itsm_app_test@localhost:5432/blank_itsm` to run [`tests/rls-write.test.ts`](tests/rls-write.test.ts) against the restricted role. |

Do not use `itsm_app` for `npm run dev` unless you intentionally want RLS-enforced app behavior with a non-owner role.

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

Use seeded admin on Preview (`http://127.0.0.1:43123` tunnel):

1. **Sign-up:** `/sign-up` → `admin@org-a.test` / `password123` (any name). If the account already exists from seed, the app **falls back to sign-in** automatically.
2. **Sign-in:** `/sign-in` → same email/password → submit (confirms session if step 1 used sign-in fallback).
3. **Land:** `/portal` stays loaded after refresh; open **`/admin`** (users/branding).

Wrong password → red inline error. Missing org membership → yellow notice on `/sign-in?error=membership` (not a silent loop).

## Commands (acceptance)

```bash
npm run ci            # lint + test + build (same as GitHub Actions)
npm run build
npm test -- --run
npm run test:e2e:m5   # catalog order + KB search smoke (dev server on 43123)
```

## M5 quick checks (Catalog + Knowledge)

1. **Admin catalog:** `/admin/catalog` → create/edit items (form fields, fulfillment queue, optional approver).
2. **Portal order:** `/portal/catalog` → order **Software access** → lands on a `service_request` ticket.
3. **Approval:** order **New laptop** as requester → sign in as `admin@org-a.test` → open ticket → **Approve request**.
4. **KB:** `/portal/knowledge?q=password` → **Reset your password**; new ticket form shows live KB deflection while typing.
5. **Agent link:** on a ticket, public reply or resolve with optional KB article → **Linked knowledge articles** panel updates.

### Preview DB note

`npm run dev:db` applies migration `0007_m5_catalog_knowledge.sql` (RLS on catalog/KB tables). Re-seed after pull: `npm run db:seed`.

## Root cause (M3 fix summary)

- Static `BETTER_AUTH_URL=http://localhost:43123` broke session cookies and origin checks when using an HTTPS preview host.
- Seeded users had DB rows but **no credential `account` password** — sign-in failed while sign-up for the same email could appear to work until portal layout rejected missing session/membership.
- Sign-in form did not surface Better Auth `{ error }` responses, causing a redirect loop with no message.
