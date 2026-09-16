# M7 Tester brief — Reporting & ops visibility

Evidence is collected in-VM without Cursor Preview SSO.

## Scenarios

1. **Dashboard** — Agent `/agent/reports` and admin `/admin/reports` show org-scoped open backlog, volume, SLA overdue/breached, workload by assignee, and ticket table.
2. **CSV export** — `GET /api/reports/tickets/export?scope=all` and `?scope=open` return CSV; open scope excludes resolved/closed rows.
3. **Authz** — Requester (no `report:read`) cannot access reports UI or export (403 on API; UI blocked/redirect).
4. **Isolation** — Org A metrics/CSV never include Org B ticket subjects (and inverse).

## Run evidence packet

```bash
git checkout cursor/m7-reporting-e542
npm install --legacy-peer-deps
npm run dev:db    # if no Postgres on 5432
export DATABASE_URL=postgresql://postgres:postgres@localhost:55432/blank_itsm
export BETTER_AUTH_SECRET=vitest-dev-secret
export BETTER_AUTH_URL=http://localhost:43123
npx playwright install chromium   # first run only
npm run dev
npm run test:e2e:m7
npm test -- --run tests/m7-reporting.test.ts
```

## Review artifacts

- `reviews/E2E_M7_ACCEPTANCE_SUMMARY.md`
- `reviews/E2E_M7_ACCEPTANCE_RESULT.json`
- `e2e-screenshots/m7/*.png`
