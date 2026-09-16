# M8 Automation rules — in-VM E2E acceptance summary

**Overall:** PASS (5/5 checks)
**Run at:** 2026-09-16T10:59:39.929Z
**E2E run id:** `1789556364855`
**Base URL:** http://127.0.0.1:43123
**App commit:** `5304c5b578f5c177901b5d7edf4eb90e612da961`
**Branch:** `cursor/automation-rules-m8-5d5d`
**Runner:** Playwright Chromium (headless); auth via `POST /api/auth/sign-in/email` with `credentials: include` (no Preview SSO).

## Commands

```bash
git checkout cursor/automation-rules-m8-5d5d  # 5304c5b or later
npm install --legacy-peer-deps
npm run dev:db && npm run db:seed
npm run dev   # port 43123
npm run test:e2e:m8
```

## Scenario matrix (M8_TESTER_BRIEF 1–5)

| Brief | ID | Scenario | Result | Screenshot |
|-------|-----|----------|--------|------------|
| 1 | M8-1 | Admin CRUD /admin/automation | **PASS** | e2e-screenshots/m8/02-admin-automation-edit.png |
| 2 | M8-2 | Assignment on create + timeline automation attribution | **PASS** | e2e-screenshots/m8/03-assignment-timeline.png |
| 3 | M8-3 | Trigger → internal note and/or mock outbox email | **PASS** | e2e-screenshots/m8/04-trigger-note-email.png |
| 4 | M8-4 | Authz: agent/requester cannot manage rules | **PASS** | e2e-screenshots/m8/06-requester-blocked.png |
| 5 | M8-5 | Org A/B isolation | **PASS** | e2e-screenshots/m8/08-org-a-isolation.png |

## Per-scenario notes

### M8-1 (Brief §1) — PASS

Admin CRUD /admin/automation

Created rules E2E-M8-1789556364855-CRUD and E2E-M8-1789556364855-ASSIGN; list and edit surfaces verified

Assertions:
- Automation list loads
- Rule E2E-M8-1789556364855-CRUD visible
- Edit form reachable

### M8-2 (Brief §2) — PASS

Assignment on create + timeline automation attribution

Ticket E2E-M8-1789556364855-assign-ticket assigned to Agent A with automation attribution

Assertions:
- Assignee Agent A on agent ticket view
- Timeline mentions automation assignment

### M8-3 (Brief §3) — PASS

Trigger → internal note and/or mock outbox email

Internal note visible to agent; 2 new .eml file(s) in mock outbox

Assertions:
- Internal note from automation on SR create
- Email outbox received new message on resolve

### M8-4 (Brief §4) — PASS

Authz: agent/requester cannot manage rules

Agent URL http://127.0.0.1:43123/sign-in?error=unknown; requester URL http://127.0.0.1:43123/sign-in?error=unknown

Assertions:
- Agent cannot access automation admin
- Requester cannot access automation admin

### M8-5 (Brief §5) — PASS

Org A/B isolation

Org B rule E2E-M8-1789556364855-ORGB not visible in Org A; Org A rules not in Org B list

Assertions:
- Org B admin sees only Org B rules
- Org A admin does not see Org B rule names


## Artifact paths

- Summary: `reviews/E2E_M8_ACCEPTANCE_SUMMARY.md`
- Machine-readable: `reviews/E2E_M8_ACCEPTANCE_RESULT.json`
- Screenshots: `e2e-screenshots/m8/*.png`
- Mock email outbox: `/workspace/.data/email-outbox/*.eml`

## Credentials

Seeded users `*@org-a.test` / `*@org-b.test` with password `password123`.
