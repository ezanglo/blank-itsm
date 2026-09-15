# M3 Founder acceptance — in-VM E2E

**Run at:** 2026-09-15T22:41:43.768Z
**Base URL:** http://127.0.0.1:43123
**App commit:** 8bd1604f0ae8b58751e8be5c566535acd8d87d55
**Runner:** Playwright Chromium (headless) in Cloud Agent VM

**Auth in E2E:** Browser `fetch` to `/api/auth/sign-in/email` with `credentials: include` (same-origin session cookies as the app). UI form submit was not used because dev HMR prevents reliable client hydration in headless runs.

**Dev server:** `npm run dev` on port 43123 (tmux `itsm-dev-server`) — left running for Tester.

## Summary

| ID | Scenario | Result | Screenshot |
|----|----------|--------|------------|
| S1 | Admin sign-in → session holds → /admin | **PASS** | 01-admin-session-admin.png |
| S2 | Org A branding set and visible on portal | **PASS** | 02-org-a-branding-portal.png |
| S3 | Requester submit ticket → My tickets | **PASS** | 03-requester-my-tickets.png |
| S4 | Agent queue → claim → status update | **PASS** | 04-agent-claim-status.png |
| S5 | Cross-tenant Org B ticket URL blocked for Org A | **PASS** | 05-cross-tenant-404.png |
| S6 | Org B branding + requester cannot access /agent; Org A isolated from B branding | **PASS** | 06-org-b-branding.png, 06-requester-no-agent.png |

## Notes

### S1 — PASS
refresh portal=true, admin=true, url=http://127.0.0.1:43123/admin/users

### S2 — PASS
Logo URL present on portal header

### S3 — PASS
Found "E2E M3 ticket 1789512095948"

### S4 — PASS
Claimed ticket and updated/viewed status

### S5 — PASS
HTTP 404, blocked=true, ticket=6b860ff6-a8ee-4b61-bf39-91f674ce84d3

### S6 — PASS
orgB branding=true, requester agent block=true (url=http://127.0.0.1:43123/sign-in?error=unknown), orgA no B logo=true


## Screenshots

Files under `e2e-screenshots/` (repo root).

## Credentials used

`*@org-a.test` / `*@org-b.test` with password `password123`.
