# PR: Dashboard shell (dashboard-01 + Inter)

## Summary

Shell chrome refresh per **DASHBOARD_SHELL_SPEC** (Impeccable **Operate** mode): `SidebarProvider` → `AppSidebar` + `SidebarInset` → `SiteHeader` on portal, agent, and admin. Inter via `next/font/google` (weights 400/500/600). Auth routes excluded. Shell typography centralized in `lib/shell/chrome-typography.ts`.

## Nav inventory

| Surface | Destinations |
|---------|----------------|
| Portal | Home, My tickets, New request, Catalog, Help / Knowledge |
| Agent | Queue, Reports |
| Admin | Reports; Users, Roles; Catalog, Knowledge, SLA; Automation; Branding, Audit |

Roles retained (`/admin/roles`) per route inventory rule.

### Admin shell home

**`/admin/reports`** is the single admin shell entry: sidebar brand link (`shellSurfaceHome`), breadcrumb “Admin” root, portal/agent “Admin” workspace switcher (`ADMIN_SHELL_HOME`), and `app/admin/page.tsx` redirect. Visiting `/admin` lands on Reports ops dashboard.

## CSS / tokens

- Preset `b1HYXIuXY` — auditable via `components.json` (`createPreset`) and `design/UI_PRESET.md`; colors/radius in `app/globals.css` unchanged.
- Shell: `--sidebar-width`, `--header-height` on `SidebarProvider`.
- Typography: `--font-sans` (Inter); `--font-mono` system stack.
- White-label: `--primary` / `--primary-foreground` on shell provider; org logo in sidebar header.

## Acceptance criteria

| ID | Status |
|----|--------|
| **AC-SHELL-001** | Met — dashboard-01 pattern in `DashboardShell` |
| **AC-SHELL-002** | Met — portal, agent, admin layouts |
| **AC-SHELL-003** | Met — inventory-only routes |
| **AC-SHELL-004** | Met — per-surface nav + unchanged guards |
| **AC-SHELL-005** | Met — Inter on root layout |
| **AC-SHELL-006** | Met — shadcn + lucide only |
| **AC-SHELL-007** | Met — CSS vars + branding |
| **AC-SHELL-008** | Met — mobile sheet sidebar |
| **AC-SHELL-009** | Met — agent/admin mobile nav |
| **AC-SHELL-010** | Met — focus rings, labeled controls |
| **AC-SHELL-011** | Met — `(auth)/` outside shell |
| **AC-SHELL-012** | Met — no demo widgets/nav |
| **AC-SHELL-013** | Met — preset baseline retained |
| **AC-SHELL-014** | Met — isolated shell components |
| **AC-SHELL-015** | Met — no gradients/glass/heavy shadows/emoji/ornamental widgets; quieter sidebar header (name + logo/initial only) |
| **AC-SHELL-016** | Met — §3 type roles via `shellChromeType`; no chrome weight ≥700 |
| **AC-SHELL-017** | Met — preset tokens only; real product fallbacks; no badges/sparklines/fake metrics in shell |
| **AC-SHELL-018** | Met — `isActive` nav; `size-4` nav icons; focus rings; preset sidebar tokens; `SidebarTrigger` + `aria-label` |

## Verification

- `npm run lint` — 0 errors
- `npm test -- --run`
- `npm run build` (with `DATABASE_URL`, `BETTER_AUTH_SECRET`)
