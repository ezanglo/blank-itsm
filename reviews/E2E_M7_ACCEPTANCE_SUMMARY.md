# M7 Reporting — in-VM E2E acceptance summary

**Overall:** PASS (5/5 checks)
**Run at:** 2026-09-16T07:21:19.732Z
**Base URL:** http://127.0.0.1:43123
**App commit:** `ffe0acd08f7b8fc2e7f7f832bb815c107758c100`
**Branch:** `cursor/m7-reporting-e542`
**Runner:** Playwright Chromium (headless); auth via `POST /api/auth/sign-in/email` with `credentials: include` (no Preview SSO).

## Commands

```bash
git checkout cursor/m7-reporting-e542  # ffe0acd or later on branch
npm install --legacy-peer-deps
npm run db:seed
npm run dev   # port 43123
npm run test:e2e:m7
npm test -- --run   # optional unit/RPT suite
```

## Scenario matrix (M7_TESTER_BRIEF 1–4)

| Brief | ID | Scenario | Result | Screenshot |
|-------|-----|----------|--------|------------|
| 1 | M7-1a | Agent /agent/reports org-scoped dashboard | **PASS** | e2e-screenshots/m7/01-agent-reports-dashboard.png |
| 1 | M7-1b | Admin /admin/reports org-scoped dashboard | **PASS** | e2e-screenshots/m7/02-admin-reports-dashboard.png |
| 2 | M7-2 | CSV export scope=all and scope=open | **PASS** | — |
| 3 | M7-3 | Requester denied reports UI and export (no report:read) | **PASS** | e2e-screenshots/m7/03-requester-blocked.png |
| 4 | M7-4 | Org A/B CSV and dashboard isolation | **PASS** | e2e-screenshots/m7/04-org-a-isolation.png |

## Per-scenario notes

### M7-1a (Brief §1) — PASS

Agent /agent/reports org-scoped dashboard

Dashboard sections and org-scoped ticket table verified

Assertions:
- Open backlog card present
- Volume card present
- SLA attention card present
- SLA breached card present
- Workload table present
- Ticket list table present
- Org A subject "Cannot access email" in table
- Org B subject "Network issue" absent

### M7-1b (Brief §1) — PASS

Admin /admin/reports org-scoped dashboard

Admin reports surface matches agent metrics with export controls

Assertions:
- Operations dashboard
- CSV export controls
- Org A-only subjects

### M7-2 (Brief §2) — PASS

CSV export scope=all and scope=open

all HTTP 200, open HTTP 200; open data rows=2

Assertions:
- GET export?scope=all returns 200 CSV with header
- GET export?scope=open returns 200 without resolved/closed rows

### M7-3 (Brief §3) — PASS

Requester denied reports UI and export (no report:read)

Export HTTP 403; agent URL http://127.0.0.1:43123/sign-in?error=unknown; admin URL http://127.0.0.1:43123/sign-in?error=unknown (no dashboard)

Assertions:
- Export API returns 403
- Cannot view Operations dashboard on /agent/reports
- Cannot view Operations dashboard on /admin/reports

### M7-4 (Brief §4) — PASS

Org A/B CSV and dashboard isolation

Org A and Org B exports and dashboard contain only tenant subjects

Assertions:
- Org A CSV contains "Cannot access email" not "Network issue"
- Org B CSV contains "Network issue" not "Cannot access email"
- Org A dashboard HTML matches CSV isolation


## Artifact paths

- This summary: `reviews/E2E_M7_ACCEPTANCE_SUMMARY.md`
- Machine-readable: `reviews/E2E_M7_ACCEPTANCE_RESULT.json`
- Screenshots: `e2e-screenshots/m7/*.png`

## Supplemental automated checks

```bash
npm test -- --run tests/m7-reporting.test.ts
```

**Result:** 11/11 passed (RPT-010–RPT-013) at `2026-09-16T07:24:33Z` on commit `ffe0acd`.

## Credentials

Seeded users `*@org-a.test` / `*@org-b.test` with password `password123`.
