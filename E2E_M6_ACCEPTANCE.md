# M6 Admin & white-label — in-VM E2E acceptance

**Run at:** 2026-09-15T23:52:30.877Z
**Base URL:** http://127.0.0.1:43123
**App commit:** `4df99afec525252ab96768597f95add57cb5a24e`
**Branch:** `cursor/m6-admin-white-label-d393`
**Runner:** Playwright Chromium (headless); dev server `npm run dev` on port 43123
**Database:** `postgresql://postgres:postgres@localhost:55432/blank_itsm`

**Auth:** Browser `fetch` to `/api/auth/sign-in/email` with `credentials: include` (Preview SSO not required).

## M6 summary

**5/5** scenarios passed.

| ID | Scenario | Result | Screenshot |
|----|----------|--------|------------|
| M6-1 | Draft KB article not listed in portal search | **PASS** | m6/01-draft-kb-hidden.png |
| M6-2 | Admin roles & permissions reference loads | **PASS** | m6/02-admin-roles.png |
| M6-3 | Branding admin with live preview | **PASS** | m6/03-branding-preview.png |
| M6-4 | Admin audit event browser | **PASS** | m6/04-audit-log.png |
| M6-5 | SLA admin sends test escalation to mock outbox | **PASS** | m6/05-sla-escalation-test.png |

## Evidence paths

- Report: `E2E_M6_ACCEPTANCE.md` (this file)
- Screenshots: `e2e-screenshots/m6/*.png`
- Mock escalation mail: `/workspace/.data/email-outbox/*.eml`

## Notes

### M6-1 — PASS
Draft title not in portal search HTML

### M6-2 — PASS
System roles and permission keys visible

### M6-3 — PASS
Preview panel and sample button rendered

### M6-4 — PASS
Audit table shows at least one known action

### M6-5 — PASS
Mock .eml written (new file 2026-09-15T23-52-28-601Z-sla-e2e-1789516347176@org-a.test.eml) with escalation subject/body


## Credentials

`*@org-a.test` with password `password123` (admin for SLA/branding/audit/roles).
