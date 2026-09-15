# M4 Service Desk — in-VM E2E acceptance

**Run at:** 2026-09-15T23:09:44.505Z
**Base URL:** http://127.0.0.1:43123
**App commit:** `093921dfe15c0fa06018c6bb2d02f8e796c23434`
**Branch:** `cursor/m4-service-desk-core-4831`
**Runner:** Playwright Chromium (headless); dev server `npm run dev` on port 43123
**Database:** `postgresql://postgres:postgres@localhost:55432/blank_itsm`

**Auth:** Browser `fetch` to `/api/auth/sign-in/email` with `credentials: include` (same as M3 E2E).

## M4 summary

**6/6** scenarios passed.

| ID | Scenario | Result | Screenshot |
|----|----------|--------|------------|
| M4-1 | Internal notes hidden on requester portal (S7) | **PASS** | m4/01-internal-note-hidden-portal.png |
| M4-2 | SLA panel on agent ticket detail | **PASS** | m4/02-sla-panel-agent.png |
| M4-3 | Attachment upload and download | **PASS** | m4/03-attachment-upload.png |
| M4-4 | Mock email outbox writes .eml on invite (no Resend) | **PASS** | m4/04-mock-email-invite.png |
| M4-5 | Impact × urgency sets Critical priority on ticket | **PASS** | m4/05-impact-urgency-critical.png |
| M4-6 | Cross-tenant ticket URL blocked (smoke) | **PASS** | 05-cross-tenant-404.png |

## Evidence paths

- Report: `E2E_M4_ACCEPTANCE.md` (this file)
- Screenshots: `e2e-screenshots/m4/*.png`
- Mock email files: `.data/email-outbox` (*.eml)
- Full M3 regression log: `E2E_M3_ACCEPTANCE.md`

## Notes

### M4-1 — PASS
internal marker visible on portal=false

### M4-2 — PASS
SLA section and due fields present

### M4-3 — PASS
listed=true, download=200, bodyMatch=true

### M4-4 — PASS
New files: 2026-09-15T23-09-40-632Z-e2e-invite-1789513780547@example.com.eml in .data/email-outbox

### M4-5 — PASS
Critical badge visible on ticket detail

### M4-6 — PASS
HTTP 404, blocked=true, ticket=2d60fa62-eb25-43e8-a4c1-2ca04d565fd9


## Credentials

`*@org-a.test` / `*@org-b.test` with password `password123`.
