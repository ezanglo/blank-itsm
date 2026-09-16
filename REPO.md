# Repository (blank-itsm)

Canonical ops reference for slug, CI, and database roles. Preview/sign-in detail lives in [FOUNDER_PREVIEW.md](./FOUNDER_PREVIEW.md).

## Origin slug & clone

| | |
|--|--|
| Product name | `blank-itsm` (`package.json`) |
| Origin slug (today) | `ezraanglo/tmp-24caffaea01e301c` |
| Clone | `https://origin.cursor.com/git/ezraanglo/tmp-24caffaea01e301c.git` |

**Rename to `blank-itsm`:** not available via `origin repo` CLI in agent VMs. Founder manual steps: [FOUNDER_PREVIEW.md § Rename](./FOUNDER_PREVIEW.md#rename-origin-slug-to-blank-itsm-founder-ui).

After rename: `https://origin.cursor.com/git/ezraanglo/blank-itsm.git`

## CI (no Neon / no paid Postgres)

```bash
npm install --legacy-peer-deps
npm run ci
```

`npm run ci` runs ESLint, Vitest (`--run`), then `next build`.

| Environment | Postgres |
|-------------|----------|
| **No local DB** | Vitest starts **embedded Postgres** on port `55432` (`tests/globalSetup.ts`). |
| **Docker / system Postgres** | Set `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/blank_itsm`; tests use it when reachable. |
| **GitHub** (after mirror) | [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) — Postgres 16 service container, same `npm run ci`. |
| **Origin / Cursor check** | `npm ci --legacy-peer-deps && npm run ci` with Postgres service **or** rely on embedded Postgres in the job VM. |

Build step defaults (override as needed):

- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/blank_itsm`
- `BETTER_AUTH_SECRET=ci-test-secret-not-for-production`

## `itsm_app` (non-superuser, RLS tests)

Migration: [`db/migrations/0006_itsm_app_role.sql`](./db/migrations/0006_itsm_app_role.sql)

- Role: `itsm_app` / password `itsm_app_test`
- App dev uses `postgres` in `DATABASE_URL`; RLS write tests use `ITSM_APP_DATABASE_URL` (set automatically in Vitest after `0006`).

Local apply: `psql "$DATABASE_URL" -f db/migrations/0006_itsm_app_role.sql`

## Production auth (H6)

Runtime `NODE_ENV=production` requires `BETTER_AUTH_URL` and `BETTER_AUTH_TRUSTED_ORIGINS` (or `TRUSTED_ORIGINS`). Development and Cursor Preview keep localhost / `127.0.0.1:43123` defaults. See `.env.example` and FOUNDER_PREVIEW.
