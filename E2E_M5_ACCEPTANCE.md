# M5 Catalog + Knowledge — in-VM E2E acceptance

**Run at:** 2026-09-15T23:33:19.884Z
**Base URL:** http://127.0.0.1:43123
**App commit:** `bd39a31b63c92bacf8d35b9e13e80efbab617a08`
**Branch:** `cursor/m5-catalog-knowledge-26bc`
**Runner:** Playwright Chromium (headless); dev server `npm run dev` on port 43123
**Database:** `postgresql://postgres:postgres@localhost:55432/blank_itsm`

**Auth:** Browser `fetch` to `/api/auth/sign-in/email` with `credentials: include`.

## M5 summary

**5/5** scenarios passed.

| ID | Scenario | Result | Screenshot |
|----|----------|--------|------------|
| M5-1 | Portal KB search returns published article | **PASS** | m5/01-kb-search-password.png |
| M5-2 | Catalog order creates service_request ticket | **PASS** | m5/02-catalog-order-ticket.png |
| M5-3 | Single-approver catalog workflow (pending → approved) | **PASS** | m5/03b-approved-open.png |
| M5-4 | Agent links KB article on public reply | **PASS** | m5/04-agent-kb-link-reply.png |
| M5-5 | Cross-tenant agent ticket URL blocked | **PASS** | m5/05-cross-tenant-blocked.png |

## Evidence paths

- Report: `E2E_M5_ACCEPTANCE.md` (this file)
- Screenshots: `e2e-screenshots/m5/*.png`

## Notes

### M5-1 — PASS
Search q=password shows Reset your password

### M5-2 — PASS
Landed on ticket with Service catalog subject

### M5-3 — PASS
pending=true, approveGone=true

### M5-4 — PASS
Linked panel shows Reset your password

### M5-5 — PASS
HTTP 404, blocked=true, ticket=9338b301-2bda-4089-a069-1fee7b0b1035


## Credentials

`*@org-a.test` / `*@org-b.test` with password `password123`.
