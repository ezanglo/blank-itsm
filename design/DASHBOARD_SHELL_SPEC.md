# Dashboard shell spec — blank-itsm

**Owner:** UI/UX Designer · **Date:** 2026-09-16 (Asia/Manila)  
**Status:** Founder-authorized visual refresh (shell + typography) · implementable SoT for Developer  
**Live app (reference only):** https://blank-itsm.vercel.app  
**Baseline:** shadcn/ui · preset `b1HYXIuXY` · `architecture/FRONTEND.md` · `decisions/UI_BASELINE.md` · `architecture/FOUNDATION_CONSTRAINTS.md` (UI-*, WL-*, TECH-004–005)  
**Design skills:** `design/DESIGN_SKILLS.md` · Impeccable (`design/skills/impeccable/`) · Taste / design-taste-frontend (`design/skills/design-taste-frontend/`)  
**Impeccable mode:** **Operate** (authenticated tool chrome — scanability and restraint over expression)

This is a **shell chrome** refresh only: sidebar + header + content inset. No new feature pages. Do not invent a second design system; stay on **dashboard-01 + Inter + shadcn** only.

---

## 1. Chosen block reference + why

### Recommendation

| Item | Value |
|------|--------|
| **Primary reference** | Official shadcn block **`dashboard-01`** |
| **Docs** | https://ui.shadcn.com/blocks · https://ui.shadcn.com/blocks/sidebar |
| **Install** | `npx shadcn@latest add dashboard-01` (also pulls `@/components/ui/sidebar` primitives) |
| **Shell pattern** | `SidebarProvider` → `AppSidebar` + `SidebarInset` → `SiteHeader` + page content |

Canonical composition (shell only; demo charts/table are **not** required):

```tsx
<SidebarProvider
  style={
    {
      "--sidebar-width": "calc(var(--spacing) * 72)",
      "--header-height": "calc(var(--spacing) * 12)",
    } as React.CSSProperties
  }
>
  <AppSidebar variant="inset" />
  <SidebarInset>
    <SiteHeader />
    <div className="flex flex-1 flex-col">{/* route children */}</div>
  </SidebarInset>
</SidebarProvider>
```

### Key components (use these names)

| Component | Role |
|-----------|------|
| `SidebarProvider` | Collapsible state, CSS vars, mobile sheet behavior |
| `AppSidebar` | Product sidebar composition (`Sidebar` + header/content/footer) |
| `SiteHeader` | Top bar with `SidebarTrigger`, title/breadcrumb slot, optional actions |
| `SidebarInset` | Main content column beside sidebar |
| `SidebarTrigger` | Collapse / open (desktop icon mode + mobile sheet) |
| `NavMain` / `NavSecondary` / `NavUser` | Nav grouping patterns from `dashboard-01` (adapt labels/URLs; drop demo-only `NavDocuments` / charts / data-table) |

Primitives live under `@/components/ui/sidebar` (`Sidebar`, `SidebarContent`, `SidebarFooter`, `SidebarHeader`, `SidebarMenu*`, etc.).

### Why `dashboard-01` (not inventing a custom shell)

1. **Official, copy-paste block** — Founder preference; matches UI-002/UI-003 (prefer shadcn compositions over custom primitives).
2. **Complete chrome triad** — sidebar + dedicated `SiteHeader` + `SidebarInset` in one pattern (simpler than piecing ad-hoc sidebar-* demos).
3. **Multi-surface ready** — one shell layout; swap `navMain` / groups per surface (`/portal`, `/agent`, `/admin`) without forking the design system.
4. **Mobile built-in** — shadcn sidebar uses sheet/drawer collapse on small viewports (UI-005, UX-002; portal must be excellent on mobile).
5. **Token-native** — chrome consumes CSS variables; white-label (WL-001–003) stays configuration-driven.

### Alternatives considered (rejected for primary)

| Alternative | Why not primary |
|-------------|-----------------|
| Raw sidebar-* gallery blocks alone | Excellent patterns, but no single “dashboard header + inset” product shell; more assembly + inconsistency risk. |
| Custom layout (no block) | Violates Founder direction to prefer official blocks; harder to keep a11y/collapse behavior. |

**Scope of install:** Adopt **shell chrome** from `dashboard-01`. Do **not** ship demo `SectionCards`, `ChartAreaInteractive`, or `DataTable` unless a later ticket asks for them. Prefer **lucide-react** (typical project baseline) over Tabler icons if the block pulls Tabler — map icons 1:1; do not add a second icon library without need (TECH-005 spirit).

---

## 2. Shell information architecture

### Shared chrome rules

- Apply the **same** `SidebarProvider` / `AppSidebar` / `SiteHeader` / `SidebarInset` pattern on **portal**, **agent**, and **admin** layouts (`app/portal/layout.tsx`, `app/agent/layout.tsx`, `app/admin/layout.tsx` — or a shared layout helper composed by each).
- Nav items are **role-appropriate** and mirror **existing routes only** (`architecture/FRONTEND.md`). No new pages.
- Sidebar header: org **logo** (branding) + product/org short name; fallback to preset defaults when branding missing (FR-042, AC-M3-022).
- `SiteHeader`: `SidebarTrigger` + page title or breadcrumb (shadcn `Breadcrumb` OK) + optional user/account control if not only in sidebar footer (`NavUser`).
- Auth surfaces `(auth)/` remain **outside** this shell.
- Active state: highlight current route; do not show links the role cannot access (server guards remain source of truth — FR-034, SEC-*).

### Route inventory rule (binding)

Nav must mirror **routes that already exist** in the app (`app/portal/**`, `app/agent/**`, `app/admin/**` page trees). Tables below list **confirmed SoT/E2E routes** plus common M5–M6 surfaces. Before coding, Developer must inventory existing `page.tsx` files and include every current primary nav destination — **do not invent new paths**; **do not drop** shipped destinations that already have pages.

### Portal (`/portal`) — requester · P1 · mobile-first

| Group | Label (jargon-light) | Route | Notes |
|-------|----------------------|-------|--------|
| **Main** | Home | `/portal` | Portal home |
| **Main** | My tickets | `/portal/tickets` | List |
| **Main** | New request | `/portal/tickets/new` | Submit |
| **Main** | Catalog | `/portal/catalog` *(if page exists)* | Browse/order service items (M5) |
| **Main** | Help / Knowledge | `/portal/knowledge` or `/portal/kb` *(use actual path)* | Published KB search (M5) |
| *(detail)* | — | `/portal/tickets/[id]` | Not persistent nav; breadcrumb/title in header |
| **Account** (footer / `NavUser`) | Account / Sign out | existing auth actions | No new settings page |

Portal copy stays **jargon-light** (UX-001). Prefer sheet/drawer sidebar on narrow viewports (default shadcn sidebar behavior).

### Agent (`/agent`) — service desk · P2 · desktop-primary

| Group | Label | Route | Notes |
|-------|-------|-------|--------|
| **Main** | Queue | `/agent` | Unassigned / mine on page |
| **Main** | Reports | `/agent/reports` | Ops visibility (M7) |
| **Main** | Knowledge | existing agent KB path *(if present)* | Link/search for replies (M5) — only if a dedicated page exists |
| *(detail)* | — | `/agent/tickets/[id]` | Header title/breadcrumb only |
| **Account** | Account / Sign out | existing auth actions | |

Do **not** add demo analytics, projects, or documents groups from the `dashboard-01` sample.

### Admin (`/admin`) — IT lead · P3

| Group | Label | Route | Notes |
|-------|-------|-------|--------|
| **Workspace** | Reports | `/admin/reports` | Ops dashboard (M7) |
| **People** | Users | `/admin/users` | Invite + roles |
| **Service** | Catalog | `/admin/catalog` *(if page exists)* | Catalog admin (M5) |
| **Service** | Knowledge | `/admin/knowledge` or `/admin/kb` *(use actual path)* | KB admin (M5) |
| **Service** | SLA | `/admin/sla` *(if page exists)* | SLA policies (M6) |
| **Automation** | Automation | `/admin/automation` | Rules CRUD (M8); alias `/admin/rules` OK if redirected |
| **Org** | Branding | `/admin/branding` | Logo + tokens + preview |
| **Org** | Audit | `/admin/audit` *(if page exists)* | Audit log (M6) |
| **Account** | Account / Sign out | existing auth actions | |

Group headings are sidebar section labels only — collapse empty groups when a route file is absent. Prefer lucide icons consistent with existing pages.

### Surface summary (minimum confirmed + inventory)

```text
portal  →  Home | My tickets | New request | (+ Catalog / Help if present)  (+ account)
agent   →  Queue | Reports | (+ Knowledge if present)                      (+ account)
admin   →  Reports | Users | Catalog* | Knowledge* | SLA* | Automation | Branding | Audit*
           (* = include only when page already exists)
```

---

## 3. Typography recommendation

### Founder-locked default

| Role | Choice | Wiring |
|------|--------|--------|
| **Primary UI** | **Inter** | `next/font/google` → `Inter`; apply via `className` on `<html>` / root `body` (or CSS variable `--font-sans`) |
| **Optional mono** | **Geist Mono** *or* system stack `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` | Use for ticket IDs, code-ish metadata only; not body UI |

**Rationale:** Founder locked Inter as the product UI face — clean, highly legible, ubiquitous for dashboards, and available via `next/font/google` with no extra package. Replaces disliked current fonts while staying inside the Next/shadcn ecosystem. **No second UI library.** (Taste discourages Inter as a *marketing* default; **Founder brief wins** for this Operate shell.)

Example (implementer guidance — not mandatory file layout):

```tsx
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
// <html className={inter.variable}> + Tailwind/theme map font-sans → var(--font-sans)
```

### Shell type hierarchy (Impeccable typeset · Operate)

Use a **fixed rem scale** (not fluid/clamp headings in chrome). One family, few sizes/weights — roles must be distinguishable at a glance:

| Role | Approx. size | Weight | Notes |
|------|--------------|--------|--------|
| Sidebar group label | `text-xs` (~12px) | medium (500) | Muted foreground; uppercase optional only if shadcn default uses it — do not invent wide tracking |
| Sidebar nav item | `text-sm` (~14px) | medium (500) | Default/active via shadcn `SidebarMenuButton` tokens |
| SiteHeader page title | `text-base` (~16px) | medium–semibold (500–600) | One title; breadcrumb secondary if used |
| Content body (inset) | `text-sm`–`text-base` | regular (400) | Leave page bodies alone except fitting inset; body floor ~16px where forms/inputs need it |
| Metadata / mono fragments | `text-xs`–`text-sm` | regular | Ticket IDs etc. only |

**Rules:** No random one-off font sizes in shell chrome. Prefer weights **400 / 500 / 600** — avoid 700–900 in nav/header. Load only Inter weights actually used. Keep repeated roles identical across portal/agent/admin.

### Rejected alternatives (brief)

| Font | Why rejected |
|------|----------------|
| **Geist Sans** | Strong Vercel/Next pairing, but Founder locked **Inter** as the default for this refresh. |
| **System UI stack only** | Acceptable fallback if font load fails; too inconsistent across devices as the *designed* default. |

### Preset / token note

- Preset **`b1HYXIuXY`** remains canonical for colors, radius, and component styling (UI-001).
- This refresh **authorizes** typography (and shell structure) updates; keep color/radius tokens unless the sidebar block documents a required variable (e.g. `--sidebar-width`, `--header-height`, sidebar color tokens from `@/components/ui/sidebar`). Document any token additions in the PR — do not silently rewrite the preset theme.
- White-label: shell chrome **consumes** existing CSS variables (`--primary`, etc.); org branding tokens still apply at layout (FRONTEND.md pipeline). **Do not fork** components per tenant (WL-003).

---

## 4. Design quality — Impeccable + Taste

Operational rules for implementers. Full skill trees stay in `design/skills/`; this section is the shell checklist. Mode = **Operate** (tool disappears into the task).

### Product taste direction

Professional **internal-IT** product: competent, calm, utilitarian, high legibility. Not a playful marketing site, not cyberpunk/neon, not agency-portfolio chrome. Familiar shadcn patterns are a feature.

### Distill / quieter (reduce chrome noise)

- Strip all `dashboard-01` **demo** chrome: `SectionCards`, charts, sample data-table, documents/projects groups, fake metrics.
- No decorative **gradients**, fake **glass**/blur panels, heavy multi-layer shadows, or ornamental sidebar clutter beyond shadcn sidebar defaults.
- Prefer **calm density**: enough space to scan; no packing every pixel; no sparse marketing whitespace either.
- Sidebar = nav + org identity + account — nothing else competing for attention.
- Do not nest card-in-card in the shell chrome; page bodies stay as-is aside from inset padding.

### Layout (regions + rhythm)

- Clear regions: **sidebar | header | content**. Squint test: these three read as primary structure.
- Consistent `SidebarInset` padding aligned to shadcn/`--spacing` tokens (match block defaults; avoid arbitrary `p-[13px]`-style values).
- Group nav by meaning (Main / Account / Admin service groups per §2); proximity before extra containers.
- Structural responsive behavior only: collapse sidebar to sheet — do not fluid-resize type in chrome.

### Polish / craft floor

- Keep shadcn **hover**, **focus-visible**, **active**, and **disabled** states on `SidebarMenuButton`, `SidebarTrigger`, and header controls — do not strip focus rings.
- **Active nav** must be visually obvious (token background/foreground from sidebar primitives).
- Icons: one family (lucide), **consistent size** in nav (typically `size-4` / 16px with the block), optically aligned; never emoji or Unicode as icons.
- Motion: only functional sidebar open/close from the block; no page-load choreography or decorative motion in shell.
- Copy: product language only (portal jargon-light); controls name their action.

### Anti-slop (Taste + Impeccable craft-floor, shell-scoped)

| Ban in shell | Why |
|--------------|-----|
| Purple-on-white / neon / mesh “AI” accents | Category tell; use preset + white-label tokens only |
| Generic “Acme”, “Jane Doe”, lorem org names | Replace with real branding fallbacks / org name |
| Emoji in nav or headers | Use lucide icons |
| Decorative badges, notification dots, sparklines in shell | No fake urgency or demo metrics |
| Gradient text, glass-as-decoration, hard offset shadows | Craft-floor refuse list |
| Marketing eyebrows / kickers above shell titles | Heading carries its own weight |
| Second UI library or custom “design system” fork | Founder + TECH-005 |

Taste skill is marketing-oriented; **extract only** anti-slop / hierarchy / state discipline that fits this Operate shell. Do not apply landing-page hero, bento, or kinetic-type patterns here.

### Harden / a11y (shell)

- Sidebar vs content: ensure **sidebar foreground/background** tokens meet contrast (WCAG AA for text ≥4.5:1). Do not invent custom sidebar colors that break contrast; prefer block + preset sidebar tokens.
- `SidebarTrigger` keyboard-operable with accessible name; visible focus ring.
- Long org names / labels: truncate with ellipsis in sidebar header; do not overflow chrome.
- Portal mobile: sheet sidebar remains operable (AC-SHELL-008).

### Implementer skill pointers (optional deep-dive)

| Need | Path |
|------|------|
| Distill | `design/skills/impeccable/reference/distill.md` |
| Quieter | `design/skills/impeccable/reference/quieter.md` |
| Typeset | `design/skills/impeccable/reference/typeset.md` |
| Layout | `design/skills/impeccable/reference/layout.md` |
| Polish | `design/skills/impeccable/reference/polish.md` |
| Harden | `design/skills/impeccable/reference/harden.md` |
| Craft floor | `design/skills/impeccable/reference/craft-floor.md` |
| Operate mode | `design/skills/impeccable/reference/operate.md` |
| Taste (anti-slop skim) | `design/skills/design-taste-frontend/SKILL.md` |
| Index | `design/DESIGN_SKILLS.md` |

---

## 5. Acceptance criteria for Developer

| ID | Criterion |
|----|-----------|
| **AC-SHELL-001** | Shell uses official **`dashboard-01`** pattern: `SidebarProvider` + `AppSidebar` + `SiteHeader` + `SidebarInset` (not a one-off custom layout). |
| **AC-SHELL-002** | Same shell chrome applied consistently on **portal**, **agent**, and **admin** authenticated layouts. |
| **AC-SHELL-003** | Sidebar nav items match §2 + route inventory — include all existing primary destinations; **no new routes or feature pages**. |
| **AC-SHELL-004** | Nav is **role-appropriate**: portal / agent / admin each show only their surface links (guards unchanged). |
| **AC-SHELL-005** | Primary font is **Inter** via `next/font/google`; body/UI text renders in Inter; mono limited to optional mono stack for technical fragments. |
| **AC-SHELL-006** | No second general-purpose UI library introduced (TECH-005). |
| **AC-SHELL-007** | White-label: chrome uses CSS variables; org logo/tokens still apply; missing branding → preset defaults; no per-tenant component forks (WL-001–003, FR-040–042). |
| **AC-SHELL-008** | **Portal** usable on mobile: sidebar collapses to sheet/drawer; Home, My tickets, New request, and ticket detail remain operable without desktop-only chrome (UI-005, UX-002). |
| **AC-SHELL-009** | Agent/admin remain usable at mobile widths (navigate, open ticket/queue, back) even if dense desktop-first (UI-005). |
| **AC-SHELL-010** | Accessibility: collapsible sidebar, visible focus rings, labeled icon controls (`SidebarTrigger` and nav icons have accessible names), keyboard operable open/close. |
| **AC-SHELL-011** | Auth routes `(auth)/` are **not** wrapped in the dashboard shell. |
| **AC-SHELL-012** | Demo-only `dashboard-01` content (charts, section cards, sample data-table, placeholder Acme nav) is **not** shipped as product UI. |
| **AC-SHELL-013** | Preset `b1HYXIuXY` color/radius baseline retained except documented shell-required CSS vars; typography change is the authorized refresh. |
| **AC-SHELL-014** | Change is **reversible**: shell components isolated under clear paths (e.g. `components/app-sidebar.tsx`, `components/site-header.tsx`, surface layouts) so rollback does not require rewriting feature pages. |
| **AC-SHELL-015** | **Impeccable distill/quieter:** Shell ships without decorative gradients, glass/blur panels, heavy custom shadows, emoji nav, or ornamental sidebar widgets outside shadcn sidebar defaults. |
| **AC-SHELL-016** | **Typeset hierarchy:** Inter shell roles follow §3 table (group label / nav item / header title / content) with no ad-hoc font sizes or weight ≥700 in chrome; hierarchy consistent across surfaces. |
| **AC-SHELL-017** | **Anti-slop:** No purple/neon AI-cliché accents, no Acme/lorem placeholders, no shell badges/sparklines/fake metrics; branding uses real org/logo fallbacks. |
| **AC-SHELL-018** | **Polish + harden:** Active nav state clear; icon size consistent in nav; focus rings retained; sidebar token contrast usable (AA for text); `SidebarTrigger` keyboard + named. |

---

## 6. Explicit out-of-scope

| Out of scope | Notes |
|--------------|--------|
| New feature pages or routes | Do not create pages that do not already exist; nav may only link shipped routes (incl. catalog/KB/SLA/reports/automation when present) |
| Redesigning ticket forms, queues, or detail content | Shell only; page bodies stay as-is aside from fitting inset padding |
| Second UI library / theme system | shadcn + preset only |
| Per-tenant forked components or themes | Tokens/config only |
| Custom domains / branded email chrome | T9 / later |
| MSP / multi-client nav | Not planned |
| Native apps | NG-011 |
| Shipping `dashboard-01` demo widgets | Charts, fake analytics, documents group |
| Changing auth product flows | Shell exclusion of `(auth)/` only |
| Updating `UI_BASELINE.md` / FOUNDATION docs | Optional follow-up by CoS/Architect; this file is the shell SoT for implementation |
| New DESIGN.md / parallel design system | Not required for this shell refresh; SoT remains this spec + locked baselines |
| Marketing / landing Taste patterns | Heroes, bentos, kinetic type, glassmorphism — do not apply to shell |

---

## Implementation notes (non-normative)

1. **Inventory first:** list existing `app/**/page.tsx` routes and map every primary nav destination into §2 groups before removing old chrome.
2. Install `dashboard-01`, then **strip** demo nav and demo page sections; wire real hrefs from §2 + inventory.
3. Prefer one shared `AppSidebar` that accepts a `items` / `surface` prop over three divergent sidebars.
4. Load branding CSS vars in surface layouts as today; sidebar header logo reads the same sources.
5. If CLI install fails for an experimental style in `components.json`, fall back to `new-york` registry assets for the block or copy from https://ui.shadcn.com/blocks — keep preset tokens.
6. Icons: stay on the project’s existing icon set (typically lucide) for consistency.
7. Before PR: walk §4 checklist + AC-SHELL-015–018 (no need to load full Impeccable/Taste trees if this spec is followed).

---

## Traceability

| Constraint / req | How this spec addresses it |
|------------------|----------------------------|
| UI-001–006, TECH-004–005 | shadcn `dashboard-01` shell; Inter-only font refresh; no second library |
| WL-001–003, FR-040–042 | Token-driven chrome; no forks |
| FR-001–003 | Distinct surfaces; shared design system |
| UX-001–002, UI-005 | Portal jargon-light labels; mobile sheet pattern |
| FRONTEND.md IA + M5–M8 routes | Nav mirrors existing surface routes (incl. reports/automation and catalog/KB/SLA/audit when present) |
| DESIGN_SKILLS / Impeccable Operate | §4 distill/quieter/typeset/layout/polish/harden + AC-SHELL-015–018 |
| Taste (shell-scoped anti-slop) | §4 anti-slop + product direction; Inter retained per Founder lock |

**Update note:** Founder-authorized visual refresh of shell structure + typography (Inter). Color/radius preset tokens remain unless shell documents required variable adjustments. 2026-09-16: §4 Impeccable + Taste operationalized; AC-SHELL-015–018 added; no DESIGN.md (shell SoT is this file).
