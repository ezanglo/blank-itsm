# M6 verification notes

## Commit

Run `git rev-parse HEAD` on branch `cursor/m6-admin-white-label-d393` for the delivered SHA.

## Automated checks

```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:55432/blank_itsm  # or your local URL
export BETTER_AUTH_SECRET=dev-only-change-me-not-for-production
npm run dev:db          # first-time / embedded Postgres
npm run db:seed         # includes sla:manage permission
npm test -- --run       # 54 tests incl. M6 admin + business hours + RLS
npm run build           # requires BETTER_AUTH_SECRET
npm run test:e2e:m6     # optional: draft KB hidden from portal search
```

## M6 manual verify

1. **Roles** — `/admin/roles` shows system role permission matrix.
2. **Users** — `/admin/users` role change requires `user:role_change`; cannot change own role.
3. **SLA** — `/admin/sla` save business hours + escalation email; **Send test escalation** writes to `.data/email-outbox`.
4. **Branding** — `/admin/branding` live preview updates before save.
5. **Audit** — `/admin/audit` lists recent `audit_event` rows for the org.
6. **Production origins** — see `FOUNDER_PREVIEW.md` § Production `trustedOrigins` tightening.
