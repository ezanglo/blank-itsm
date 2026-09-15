# M3/M4 Founder acceptance — in-VM E2E

**Run at:** 2026-09-15T23:09:44.504Z
**Base URL:** http://127.0.0.1:43123
**App commit:** 093921dfe15c0fa06018c6bb2d02f8e796c23434
**Runner:** Playwright Chromium (headless) in Cloud Agent VM

## Summary

| ID | Scenario | Result | Screenshot |
|----|----------|--------|------------|
| S1 | Admin sign-in → session holds → /admin | **PASS** | 01-admin-session-admin.png |
| S2 | Org A branding set and visible on portal | **PASS** | 02-org-a-branding-portal.png |
| S3 | Requester submit ticket → My tickets | **PASS** | 03-requester-my-tickets.png |
| S4 | Agent queue → claim → status update | **PASS** | 04-agent-claim-status.png |
| S5 | Cross-tenant Org B ticket URL blocked for Org A | **PASS** | 05-cross-tenant-404.png |
| S6 | Org B branding + requester cannot access /agent; Org A isolated from B branding | **PASS** | 06-org-b-branding.png, 06-requester-no-agent.png |
| S7 | M4 internal notes hidden from requester portal | **PASS** | m4/01-internal-note-hidden-portal.png |
| M4-1 | Internal notes hidden on requester portal (S7) | **PASS** | m4/01-internal-note-hidden-portal.png |
| M4-2 | SLA panel on agent ticket detail | **PASS** | m4/02-sla-panel-agent.png |
| M4-3 | Attachment upload and download | **PASS** | m4/03-attachment-upload.png |
| M4-4 | Mock email outbox writes .eml on invite (no Resend) | **PASS** | m4/04-mock-email-invite.png |
| M4-5 | Impact × urgency sets Critical priority on ticket | **PASS** | m4/05-impact-urgency-critical.png |
| M4-6 | Cross-tenant ticket URL blocked (smoke) | **PASS** | 05-cross-tenant-404.png |

## Notes

### S1 — PASS
refresh portal=true, admin=true, url=http://127.0.0.1:43123/admin/users

### S2 — PASS
Logo URL present on portal header

### S3 — PASS
Found "E2E M3 ticket 1789513763443"

### S4 — PASS
Claimed ticket and updated/viewed status

### S5 — PASS
HTTP 404, blocked=true, ticket=2d60fa62-eb25-43e8-a4c1-2ca04d565fd9

### S6 — PASS
orgB branding=true, requester agent block=true (url=http://127.0.0.1:43123/sign-in?error=unknown), orgA no B logo=true

### S7 — PASS
internal marker visible on portal=false

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


## Screenshots

Files under `e2e-screenshots/` (repo root).

## Credentials used

`*@org-a.test` / `*@org-b.test` with password `password123`.
