# Verification notes (blank-itsm)

## Repository

- **Origin slug:** `ezraanglo/tmp-24caffaea01e301c` (rename to `blank-itsm` — Founder UI steps in [FOUNDER_PREVIEW.md](./FOUNDER_PREVIEW.md))
- **Clone:** `https://origin.cursor.com/git/ezraanglo/tmp-24caffaea01e301c.git`

## Automated checks

```bash
cp .env.example .env   # BETTER_AUTH_SECRET required for build
npm install --legacy-peer-deps
npm run ci             # lint + vitest + next build
```

Optional with local or embedded DB:

```bash
npm run dev:db
npm run db:seed
npm run test:e2e:m6
```

Environment for CI / agents:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/blank_itsm
BETTER_AUTH_SECRET=dev-only-change-me-not-for-production
BETTER_AUTH_URL=http://localhost:43123
NODE_ENV=development
```

Vitest applies `0006_itsm_app_role.sql` and sets `ITSM_APP_DATABASE_URL` for RLS write tests.

## Production auth

With `NODE_ENV=production`, set `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS` (or `TRUSTED_ORIGINS`), and optionally `BETTER_AUTH_ALLOWED_HOSTS`. Details in [FOUNDER_PREVIEW.md](./FOUNDER_PREVIEW.md) and `.env.example`.

## M6 manual verify

1. **Roles** — `/admin/roles` shows system role permission matrix.
2. **Users** — `/admin/users` role change requires `user:role_change`; cannot change own role.
3. **SLA** — `/admin/sla` save business hours + escalation email; **Send test escalation** writes to `.data/email-outbox`.
4. **Branding** — `/admin/branding` live preview updates before save.
5. **Audit** — `/admin/audit` lists recent `audit_event` rows for the org.
